"""One-time import: Strava bulk export (activities.csv) -> tools/strava-2026-jan-feb.json.

Not part of the daily refresh. Run it by hand only if the supplement ever needs rebuilding:
  python tools/import_strava_export.py "C:/path/to/Strava export/activities.csv"

It covers the period before the Garmin history starts (2026-01-01 through 2026-03-01).
Same privacy whitelist as refresh_site_data.py: id, local date, sport, group, distance and
timing fields, event label. Activity names, descriptions, notes, routes, heart rate,
power, weather, gear and start times are never read into the output.

Strava's "Activity Date" column is UTC; dates are converted to US Eastern time. Strava has
no timer time, so elapsed time stands in for it (it matched Garmin's timer within a second
on the median for activities recorded on both).
"""
import csv
import datetime
import json
import pathlib
import sys
from zoneinfo import ZoneInfo

OUT = pathlib.Path(__file__).resolve().parent / 'strava-2026-jan-feb.json'
ET = ZoneInfo('America/New_York')
START, END = '2026-01-01', '2026-03-01'
SPORTS = {  # Strava type -> (sport, group), using the site's sport keys
    'Run': ('running', 'running'), 'Trail Run': ('trail_running', 'running'),
    'Ride': ('cycling', 'cycling'), 'Virtual Ride': ('virtual_ride', 'cycling'),
    'Swim': ('lap_swimming', 'swimming'), 'Walk': ('walking', 'other'), 'Hike': ('hiking', 'other'),
}
EVENTS = {}  # Strava activity id -> public race label (none in Jan-Feb 2026)


def number(value):
    value = float(value)
    if value < 0:
        raise ValueError('negative value')
    return value


def main(path):
    with open(path, encoding='utf-8-sig', newline='') as f:
        reader = csv.reader(f)
        header = next(reader)
        # Strava repeats some column names; the second "Elapsed Time"/"Distance" are in seconds/metres.
        col = {name: [i for i, h in enumerate(header) if h == name] for name in set(header)}
        i_id, i_date, i_type = col['Activity ID'][0], col['Activity Date'][0], col['Activity Type'][0]
        i_elapsed, i_moving, i_dist = col['Elapsed Time'][-1], col['Moving Time'][0], col['Distance'][-1]
        rows = []
        for r in reader:
            when = datetime.datetime.strptime(r[i_date], '%b %d, %Y, %I:%M:%S %p')
            date = when.replace(tzinfo=datetime.timezone.utc).astimezone(ET).date().isoformat()
            if not START <= date <= END:
                continue
            if r[i_type] not in SPORTS:
                raise SystemExit(f'unmapped Strava type {r[i_type]!r} on {date}; add it to SPORTS')
            sport, group = SPORTS[r[i_type]]
            elapsed = number(r[i_elapsed])
            rows.append({'key': f'strava-{r[i_id]}', 'date': date, 'sport': sport, 'group': group,
                         'included': True, 'distance_m': number(r[i_dist] or 0),
                         'timer_duration_s': elapsed, 'moving_duration_s': number(r[i_moving] or 0),
                         'elapsed_duration_s': elapsed, 'event': EVENTS.get(r[i_id], '')})
    rows.sort(key=lambda r: (r['date'], r['key']))
    payload = {'source': 'Strava bulk export (activities.csv), exported 2026-08-20',
               'start': START, 'end': END, 'activities': rows}
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
    print(f'wrote {len(rows)} activities to {OUT}')


if __name__ == '__main__':
    main(sys.argv[1])
