(()=>{
const fmt=s=>{s=Math.round(s);return `${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
const row=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
function card(r){
 if(r.id==='24852006578'){
  const m=window.MARATHON_RESULT;
  return `<article class="event"><span class="tag">${r.date}</span><h3>${r.title}</h3><p class="distance">${m.finishTime}<small>Official finish time</small></p><dl>${row('Official pace',m.pace+' /mi')}${row('Overall place',m.overallPlace.toLocaleString()+' / '+m.overallFinishers.toLocaleString())}${row('Men’s place',m.genderPlace.toLocaleString()+' / '+m.genderFinishers.toLocaleString())}${row(m.division+' place',m.divisionPlace+' / '+m.divisionFinishers.toLocaleString())}</dl><details class="race-details"><summary>Garmin recording</summary><dl>${row('GPS distance',(r.distance_m/1609.344).toFixed(2)+' mi')}${row('Timer',fmt(r.timer_duration_s))}${row('Moving',fmt(r.moving_duration_s))}${row('Elapsed',fmt(r.elapsed_duration_s))}</dl></details></article>`;
 }
 const official=window.DC_RESULTS.races[r.id];
 const garmin=row('Timer',fmt(r.timer_duration_s))+row('Moving',fmt(r.moving_duration_s))+row('Elapsed',fmt(r.elapsed_duration_s));
 if(!official)return `<article class="event"><span class="tag">${r.date}</span><h3>${r.title}</h3><p class="distance">${(r.distance_m/1609.344).toFixed(2)} miles<small>Garmin-recorded distance</small></p><dl>${garmin}</dl></article>`;
 return `<article class="event"><span class="tag">${r.date}</span><h3>${r.title}</h3><p class="distance">${official.chipTime}<small>Official chip time</small></p><dl>${row('Place',official.place)}${official.divisionPlace?row('M20–29 place',official.divisionPlace):''}${row('Official pace',official.pace+' /mi')}${row('Clock time',official.clockTime)}</dl><details class="race-details"><summary>Splits & result details</summary><dl>${row('Bib',window.DC_RESULTS.challenge.bib)}${row('Age / division','20 / M20–29')}${row('Listed hometown',window.DC_RESULTS.challenge.city)}${row('Age percentage',official.agePercentage+'%')}</dl><div class="table-wrap"><table aria-label="${r.title} official splits"><thead><tr><th scope="col">Split</th><th scope="col">Time</th><th scope="col">Pace /mi</th></tr></thead><tbody>${official.splits.map(s=>`<tr><th scope="row">${s.distance}</th><td>${s.time}</td><td>${s.pace||'—'}</td></tr>`).join('')}</tbody></table></div><h4>Garmin recording</h4><dl>${row('GPS distance',(r.distance_m/1609.344).toFixed(2)+' mi')}${garmin}</dl></details></article>`
}
const c=window.DC_RESULTS.challenge;
document.querySelector('#challenge-result').innerHTML=`<div class="challenge-heading"><span class="tag">${c.status} · 5K + half marathon</span><h3>Two races. One challenge.</h3></div><div class="challenge-stats"><div><strong>${c.chipTime}</strong><span>Combined chip time</span></div><div><strong>${c.place}</strong><span>Challenge place</span></div><div><strong>${c.pace} <small>/mi</small></strong><span>Official combined pace</span></div></div>`;
document.querySelector('#dc-results').innerHTML=window.RACE_ROUTES.slice(2).reverse().map(card).join('');
document.querySelector('#october-results').innerHTML=window.RACE_ROUTES.slice(0,2).map(card).join('');
})();
