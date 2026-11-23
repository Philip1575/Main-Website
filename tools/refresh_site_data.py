"""Daily website data refresh: local Garmin cache -> training-data.js / sleep-data.js -> git push.

Runs as a Windows scheduled task after "Garmin Daily Sync". No AI, no Garmin login:
it only reads the local GarminSync cache and publishes when the data actually changed.

Privacy whitelist (unchanged from the original weekly refresh):
  training: activity id, local date, sport, distance and timing fields, public race label
  sleep:    local date, sleep score, Garmin's quality category
Nothing else (routes, heart rate, HRV, weight, start times, account data) is exported.

January-February 2026 predate the Garmin history. They come from a fixed, one-time Strava
supplement (tools/strava-2026-jan-feb.json, built by tools/import_strava_export.py) with the
same whitelist. Supplement rows dated on or after the first Garmin date are dropped, so a day
is never counted from both sources.

Usage:
  python tools/refresh_site_data.py            refresh, verify, commit and push if changed
  python tools/refresh_site_data.py --no-push  refresh and verify only (local files change)
"""
import datetime
import json
import math
import os
import pathlib
import re
import subprocess
import sys
from zoneinfo import ZoneInfo

SITE = pathlib.Path(__file__).resolve().parents[1]
SOURCE = pathlib.Path(os.environ.get('GARMINSYNC_DIR', pathlib.Path.home() / 'GarminSync'))
LOG_DIR = SITE / 'tools' / 'logs'
SUPPLEMENT = SITE / 'tools' / 'strava-2026-jan-feb.json'
ET = ZoneInfo('America/New_York')
MAX_SYNC_AGE = datetime.timedelta(hours=36)

SPORT_GROUPS = {
    'running': 'running', 'trail_running': 'running', 'treadmill_running': 'running',
    'road_biking': 'cycling', 'virtual_ride': 'cycling', 'cycling': 'cycling', 'mountain_biking': 'cycling',
    'lap_swimming': 'swimming', 'open_water_swimming': 'swimming',
}
TIMING_FIELDS = {'distance_m': 'distance', 'timer_duration_s': 'duration',
                 'moving_duration_s': 'movingDuration', 'elapsed_duration_s': 'elapsedDuration'}
EVENTS = {'24841149175': 'BellRinger', '24852006578': 'Marine Corps Marathon',
          '24420870750': 'DC District Challenge · 5K', '24434709839': 'DC District Challenge · Half marathon'}
EXCLUDED_ACTIVITIES = {'22114052534'}  # known manual duplicate
SLEEP_QUALITIES = {'POOR', 'FAIR', 'GOOD', 'EXCELLENT'}


class Skip(Exception):
    """A safe stop: existing public data is left untouched."""


def log(message):
    stamp = datetime.datetime.now(ET).strftime('%Y-%m-%d %H:%M:%S')
    line = f'{stamp}  {message}'
    print(line, flush=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOG_DIR / f'{datetime.date.today():%Y-%m}.log', 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def read_site_data(name, variable):
    path = SITE / name
    if not path.exists():
        return None
    text = path.read_text(encoding='utf-8')
    return json.loads(text[len(f'window.{variable}='):].rstrip().rstrip(';'))


def check_sync():
    status = read_json(SOURCE / 'DailySync/data/sync_status.json')
    overview = read_json(SOURCE / 'DailySync/data/latest_training.json')
    if not status.get('sync_complete') or status.get('status') != 'finished' or not overview.get('sync_complete'):
        raise Skip(f"latest Garmin sync is incomplete (status={status.get('status')})")
    synced = datetime.datetime.fromisoformat(status['last_successful_sync_utc'])
    age = datetime.datetime.now(datetime.timezone.utc) - synced
    if age > MAX_SYNC_AGE:
        raise Skip(f'latest Garmin sync is {age.total_seconds() / 3600:.0f} hours old')
    return synced, overview['local_date']


def build_training(synced, local_date):
    cutoff = min(local_date, synced.astimezone(ET).date().isoformat())
    rows, seen, parents = [], set(), 0
    for path in sorted((SOURCE / 'history_v1/archive/activities').glob('*/summary.json')):
        envelope = read_json(path)
        if envelope.get('status') != 'ok':
            continue
        a = envelope['data']
        key, date, sport = str(a['activityId']), a['startTimeLocal'][:10], a['activityType']['typeKey']
        if key in seen:
            raise Skip(f'duplicate activity id {key} in the local archive')
        seen.add(key)
        if date > cutoff or sport == 'breathwork':
            continue
        if a.get('isParent') or a.get('parent'):
            parents += 1
            continue
        row = {'key': key, 'date': date, 'sport': sport, 'group': SPORT_GROUPS.get(sport, 'other'),
               'included': key not in EXCLUDED_ACTIVITIES}
        for dest, src in TIMING_FIELDS.items():
            value = a.get(src)
            if value is not None and (not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0):
                raise Skip(f'invalid {src} on activity {key}')
            row[dest] = value
        row['event'] = EVENTS.get(key, '')
        rows.append(row)
    if not rows:
        raise Skip('no activity records found')
    rows.sort(key=lambda r: (r['date'], r['key']))
    garmin_start = rows[0]['date']
    early = [r for r in read_supplement() if r['date'] < garmin_start]
    if seen & {r['key'] for r in early}:
        raise Skip('Strava supplement repeats a Garmin activity id')
    rows = early + rows
    return {'as_of': cutoff, 'synced_on': synced.astimezone(ET).date().isoformat(),
            'coverage_start': rows[0]['date'], 'garmin_start': garmin_start, 'activities': rows,
            'excluded_sports': ['breathwork'], 'excluded_parent_count': parents}


def read_supplement():
    """Fixed Strava rows for the weeks before the Garmin history begins."""
    if not SUPPLEMENT.exists():
        raise Skip(f'missing {SUPPLEMENT.name}')
    rows, keys = read_json(SUPPLEMENT)['activities'], set()
    for r in rows:
        if r['key'] in keys or not r['key'].startswith('strava-'):
            raise Skip(f"bad or duplicate supplement id {r['key']}")
        keys.add(r['key'])
        for field in TIMING_FIELDS:
            value = r.get(field)
            if value is not None and (not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0):
                raise Skip(f"invalid {field} on supplement activity {r['key']}")
    return sorted(rows, key=lambda r: (r['date'], r['key']))


def build_sleep(local_date):
    days = []
    for path in sorted((SOURCE / 'history_v1/archive/wellness').glob('*/sleep.json')):
        date = path.parent.name
        if date > local_date:
            continue
        envelope = read_json(path)
        dto = (envelope.get('data') or {}).get('dailySleepDTO') or {}
        overall = (dto.get('sleepScores') or {}).get('overall') or {}
        score, quality = overall.get('value'), overall.get('qualifierKey')
        if dto.get('calendarDate') and dto['calendarDate'][:10] != date:
            raise Skip(f'sleep record date mismatch on {date}')
        if envelope.get('status') != 'ok' or not isinstance(score, (int, float)) or isinstance(score, bool):
            score = quality = None
        if score is not None and not 0 <= score <= 100:
            raise Skip(f'invalid sleep score on {date}')
        if quality not in SLEEP_QUALITIES:
            quality = None
        days.append({'date': date, 'score': score, 'quality': quality})
    if not days:
        raise Skip('no sleep records found')
    return {'as_of': local_date, 'tracking_start': days[0]['date'], 'days': days}


def verify(new_training, new_sleep):
    """Refuse updates that look like data loss rather than new data."""
    old_t = read_site_data('training-data.js', 'TRAINING_DATA')
    old_s = read_site_data('sleep-data.js', 'SLEEP_DATA')
    allowed = {'key', 'date', 'sport', 'group', 'included', 'event', *TIMING_FIELDS}
    for row in new_training['activities']:
        if set(row) - allowed:
            raise Skip('training export contains a field outside the privacy whitelist')
    for day in new_sleep['days']:
        if set(day) != {'date', 'score', 'quality'}:
            raise Skip('sleep export contains a field outside the privacy whitelist')
    if old_t:
        if new_training['as_of'] < old_t['as_of']:
            raise Skip(f"training data would move backwards ({old_t['as_of']} -> {new_training['as_of']})")
        if len(new_training['activities']) < len(old_t['activities']):
            raise Skip(f"activity count would drop ({len(old_t['activities'])} -> {len(new_training['activities'])})")
    if old_s and len(new_sleep['days']) < len(old_s['days']):
        raise Skip(f"sleep day count would drop ({len(old_s['days'])} -> {len(new_sleep['days'])})")


def write_if_changed(name, variable, payload, ensure_ascii):
    text = f'window.{variable}=' + json.dumps(payload, separators=(',', ':'), ensure_ascii=ensure_ascii) + ';\n'
    path = SITE / name
    if path.exists() and path.read_text(encoding='utf-8') == text:
        return False
    tmp = path.with_suffix('.tmp')
    tmp.write_text(text, encoding='utf-8', newline='\n')
    tmp.replace(path)
    return True


def bump_cache_versions(version):
    """Point pages at the new data so browsers don't show yesterday's cached copy."""
    for page in ('index.html', 'training.html'):
        path = SITE / page
        text = path.read_bytes().decode('utf-8')
        new = re.sub(r'((?:training|sleep)-data\.js\?v=)[\w.-]+', r'\g<1>' + version, text)
        if new != text:
            path.write_bytes(new.encode('utf-8'))


def git(*args, check=True):
    result = subprocess.run(['git', *args], cwd=SITE, capture_output=True, text=True,
                            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if check and result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {(result.stderr or result.stdout).strip()}")
    return result.stdout.strip()


DATA_FILES = ['training-data.js', 'sleep-data.js', 'index.html', 'training.html']


def sync_with_github():
    if git('rev-parse', '--abbrev-ref', 'HEAD') != 'main':
        raise Skip('checkout is not on the main branch')
    git('fetch', '--quiet', 'origin', 'main')
    behind = int(git('rev-list', '--count', 'HEAD..origin/main'))
    if behind:
        git('merge', '--ff-only', '--quiet', 'origin/main')
        log(f'pulled {behind} new commit(s) from GitHub')


def main():
    push = '--no-push' not in sys.argv
    try:
        if push:
            sync_with_github()
        synced, local_date = check_sync()
        training = build_training(synced, local_date)
        sleep = build_sleep(local_date)
        verify(training, sleep)
        changed_t = write_if_changed('training-data.js', 'TRAINING_DATA', training, ensure_ascii=False)
        changed_s = write_if_changed('sleep-data.js', 'SLEEP_DATA', sleep, ensure_ascii=True)
        if not (changed_t or changed_s):
            log(f"no change (training through {training['as_of']}, sleep through {sleep['as_of']})")
            return 0
        bump_cache_versions(training['as_of'].replace('-', ''))
        summary = (f"training through {training['as_of']} ({sum(a['included'] for a in training['activities'])} sessions), "
                   f"sleep through {sleep['as_of']}")
        if not push:
            log(f'updated locally, not pushed: {summary}')
            return 0
        git('add', '--', *DATA_FILES)
        if not git('diff', '--cached', '--name-only'):
            log('nothing staged after refresh')
            return 0
        git('commit', '--quiet', '-m', f"Update training and sleep data through {training['as_of']}",
            '-m', 'Automated daily refresh from the local Garmin cache (tools/refresh_site_data.py).', '--', *DATA_FILES)
        git('push', '--quiet', 'origin', 'main')
        log(f'published: {summary}')
        return 0
    except Skip as reason:
        log(f'skipped, existing data kept: {reason}')
        return 0
    except Exception as error:  # noqa: BLE001 - every failure belongs in the log
        log(f'FAILED: {error}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
