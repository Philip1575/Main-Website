// Homepage season strip: one bar per day, stacked by sport, built from training-data.js.
// The static caption in index.html is the no-JavaScript fallback.
(function () {
  const data = window.TRAINING_DATA;
  const host = document.getElementById('season-strip');
  if (!data || !host) return;

  const DAY = 86400000;
  const parse = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const groups = ['run', 'ride', 'swim', 'other'];
  const groupOf = g => ({ running: 'run', cycling: 'ride', swimming: 'swim' })[g] || 'other';
  const sportNames = {
    running: 'Run', treadmill_running: 'Treadmill run', trail_running: 'Trail run',
    road_biking: 'Ride', cycling: 'Ride', virtual_ride: 'Indoor ride', lap_swimming: 'Pool swim',
    open_water_swimming: 'Open-water swim', strength_training: 'Strength', walking: 'Walk',
    hiking: 'Hike', stand_up_paddleboarding_v2: 'Paddleboard', kayaking_v2: 'Kayak',
    resort_snowboarding: 'Snowboard', other: 'Other'
  };
  const clean = s => (s || '').replace(/�/g, '–');

  const start = parse(data.coverage_start);
  const end = parse(data.as_of);
  const n = Math.round((end - start) / DAY) + 1;
  const days = Array.from({ length: n }, (_, i) => ({ date: iso(start + i * DAY), acts: [], secs: { run: 0, ride: 0, swim: 0, other: 0 } }));

  const totals = { secs: 0, run: 0, ride: 0, swim: 0 };
  for (const a of data.activities) {
    if (!a.included || (a.timer_duration_s || 0) < 60) continue;
    const i = Math.round((parse(a.date) - start) / DAY);
    if (i < 0 || i >= n) continue;
    const g = groupOf(a.group);
    days[i].acts.push(a);
    days[i].secs[g] += a.timer_duration_s || 0;
    totals.secs += a.timer_duration_s || 0;
    if (g !== 'other') totals[g] += (a.distance_m || 0) / 1609.344;
  }

  // Totals sentence
  const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const nice = d => new Date(parse(d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const activeDays = days.filter(d => d.acts.length).length;
  const totalsEl = document.getElementById('season-totals');
  if (totalsEl) {
    totalsEl.textContent = `${fmt.format(totals.secs / 3600)} hours of training on ${activeDays} days between ${nice(data.coverage_start)} and ${nice(data.as_of)}: ${fmt.format(totals.run)} miles running, ${fmt.format(totals.ride)} miles riding, and ${fmt.format(totals.swim)} miles swimming.`;
  }

  const updatedEl = document.getElementById('season-updated');
  if (updatedEl) updatedEl.textContent = `Updated every day from my Garmin. Data through ${nice(data.as_of)}.`;

  // Draw
  const STEP = 5, BAR = 3.6, H = 230, TOP = 14;
  const maxSecs = Math.max(...days.map(d => groups.reduce((s, g) => s + d.secs[g], 0)), 3600);
  const scale = (H - TOP) / maxSecs;
  const W = n * STEP;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Daily training since ' + nice(data.coverage_start) + '. Use the left and right arrow keys to move between days.');
  const el = (name, attrs) => { const e = document.createElementNS(ns, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  const cursor = el('rect', { class: 'cursor', x: 0, y: 0, width: STEP, height: H });
  svg.appendChild(cursor);

  days.forEach((d, i) => {
    const x = i * STEP;
    let y = H;
    const total = groups.reduce((s, g) => s + d.secs[g], 0);
    if (!total) {
      svg.appendChild(el('rect', { class: 'rest', x, y: H - 2, width: BAR, height: 2 }));
      return;
    }
    const g = el('g', { class: 'bar', style: `--i:${i}` });
    for (const k of groups) {
      if (!d.secs[k]) continue;
      const h = Math.max(d.secs[k] * scale, 1.5);
      y -= h;
      g.appendChild(el('rect', { class: k, x, y, width: BAR, height: h }));
    }
    svg.appendChild(g);
    if (d.acts.some(a => a.event)) svg.appendChild(el('rect', { class: 'flag', x, y: y - 9, width: BAR, height: 4 }));
  });
  host.appendChild(svg);

  // Month labels and race flags, in HTML so text stays a readable size
  const months = document.createElement('div');
  months.className = 'months';
  months.setAttribute('aria-hidden', 'true');
  days.forEach((d, i) => {
    if (d.date.endsWith('-01') || i === 0) {
      if ((i > 0 && i < 6) || i > n - 12) return;
      const s = document.createElement('span');
      s.style.left = (i / n * 100) + '%';
      s.textContent = new Date(parse(d.date)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      months.appendChild(s);
    }
  });
  host.after(months);

  // Readout and interaction
  const readout = document.getElementById('season-readout');
  const dur = s => { const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const describe = d => {
    const when = new Date(parse(d.date)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    if (!d.acts.length) return `${when}: rest day`;
    const parts = d.acts.map(a => {
      const name = clean(a.event) || sportNames[a.sport] || 'Session';
      const mi = a.distance_m > 100 ? `${(a.distance_m / 1609.344).toFixed(1)} mi, ` : '';
      return `${name}, ${mi}${dur(a.timer_duration_s || 0)}`;
    });
    return `${when}: ${parts.join('; ')}`;
  };
  let current = -1;
  const select = i => {
    i = Math.max(0, Math.min(n - 1, i));
    if (i === current) return;
    current = i;
    cursor.setAttribute('x', i * STEP - (STEP - BAR) / 2);
    if (readout) readout.textContent = describe(days[i]);
  };
  const fromPointer = e => {
    const r = svg.getBoundingClientRect();
    select(Math.floor((e.clientX - r.left) / r.width * n));
  };
  svg.addEventListener('pointermove', fromPointer);
  svg.addEventListener('pointerdown', fromPointer);
  svg.addEventListener('keydown', e => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, PageUp: -7, PageDown: 7 };
    if (e.key in moves) { select(current + moves[e.key]); e.preventDefault(); }
    else if (e.key === 'Home') { select(0); e.preventDefault(); }
    else if (e.key === 'End') { select(n - 1); e.preventDefault(); }
  });

  // IRONMAN distance rows: longest single session per sport against race distance.
  document.querySelectorAll('.distance-row[data-group]').forEach(row => {
    const race = +row.dataset.race;
    const best = Math.max(0, ...data.activities.filter(a => a.included && a.group === row.dataset.group).map(a => (a.distance_m || 0) / 1609.344));
    const shown = best >= 10 ? best.toFixed(best >= 100 ? 0 : 1) : best.toFixed(1);
    row.querySelector('.best').textContent = `${shown} mi`;
    row.querySelector('.fill').style.width = Math.min(best / race, 1) * 100 + '%';
    if (best >= race) row.classList.add('done');
  });

  const bigDay = Math.max(...days.map(d => d.acts.reduce((m, a) => m + (a.distance_m || 0), 0))) / 1609.344;
  const bigEl = document.getElementById('biggest-day');
  if (bigEl) bigEl.textContent = `${fmt.format(bigDay)} miles`;

  // Start on the BellRinger day if it is in range, so the strip shows it can be read.
  const ride = days.findIndex(d => d.acts.some(a => /bellringer/i.test(a.event || '')));
  select(ride >= 0 ? ride : n - 1);
})();
