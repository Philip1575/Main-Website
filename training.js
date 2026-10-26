(()=>{
const D=window.TRAINING_DATA,$=s=>document.querySelector(s),months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const labels={running:'Running',cycling:'Cycling',swimming:'Swimming',other:'Other sports'},colors={running:'#315f4e',cycling:'#687938',swimming:'#376b86',other:'#81765d'};
const sportName=s=>({road_biking:'Road cycling',virtual_ride:'Virtual ride',lap_swimming:'Pool swimming',treadmill_running:'Treadmill running',stand_up_paddleboarding_v2:'Stand-up paddleboarding',resort_snowboarding:'Resort snowboarding',kayaking_v2:'Kayaking'}[s]||s.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()));
const sum=(rows,k)=>{const vals=rows.map(a=>a[k]).filter(v=>v!=null);return vals.length?vals.reduce((a,b)=>a+b,0):null};
const hours=s=>{if(s==null)return 'Unavailable';const m=Math.round(s/60);return `${Math.floor(m/60)}h ${m%60}m`};
const duration=s=>{if(s==null)return 'Unavailable';s=Math.round(s);return `${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
const distance=(m,g)=>m==null?'Unavailable':`${(m/(g==='swimming'?.9144:1609.344)).toLocaleString('en-US',{maximumFractionDigits:g==='swimming'?0:1})} ${g==='swimming'?'yd':'mi'}`;
const dateName=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const dayAdd=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const monday=date=>{const d=new Date(date+'T12:00:00Z');return dayAdd(date,-((d.getUTCDay()+6)%7))};
let year=D.as_of.slice(0,4),selected=D.as_of,page=0;
const yearRows=()=>D.activities.filter(a=>a.date.startsWith(year)),included=()=>yearRows().filter(a=>a.included);
const matching=a=>($('#group-select').value==='all'||a.group===$('#group-select').value)&&($('#sport-select').value==='all'||a.sport===$('#sport-select').value);
const years=[...new Set(D.activities.map(a=>a.date.slice(0,4)).concat(year))].sort().reverse();
$('#year-select').innerHTML=years.map(y=>`<option${y===year?' selected':''}>${y}</option>`).join('');
$('#updated-through').textContent=`Updated through ${dateName(D.as_of)} · Weekly refresh`;
function renderOverview(){
 const rows=included(),end=year===D.as_of.slice(0,4)?D.as_of:`${year}-12-31`,start=D.coverage_start.slice(0,4)===year?D.coverage_start:`${year}-01-01`;
 $('#coverage').textContent=`Tracking started ${new Date(D.coverage_start+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}.`;
 $('#year-stats').innerHTML=[['Sessions',rows.length],['Timer time',hours(sum(rows,'timer_duration_s'))],['Moving time',hours(sum(rows,'moving_duration_s'))],['Elapsed time',hours(sum(rows,'elapsed_duration_s'))]].map(([label,value])=>`<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
 $('#sport-cards').innerHTML=['swimming','cycling','running'].map(g=>{const r=rows.filter(a=>a.group===g);return `<article class="sport-card" style="--sport:${colors[g]}"><h3>${labels[g]}</h3><strong>${r.length?distance(sum(r,'distance_m'),g):'No recordings'}</strong><small>${r.length} sessions<br>${r.length?hours(sum(r,'timer_duration_s')):'—'} timer time</small></article>`}).join('');
 const allTime=sum(rows,'timer_duration_s')||1;$('#sport-mix').innerHTML=['swimming','cycling','running','other'].map(g=>{const value=sum(rows.filter(a=>a.group===g),'timer_duration_s')||0;return `<div class="mix-row" style="--sport:${colors[g]}"><div class="mix-label"><span>${labels[g]}</span><span>${hours(value)} · ${(value/allTime*100).toFixed(1)}%</span></div><div class="mix-track"><div class="mix-fill" style="width:${value/allTime*100}%"></div></div></div>`}).join('');
}
function periods(){
 if($('#period-select').value==='month')return months.map((label,i)=>({key:`${year}-${String(i+1).padStart(2,'0')}`,label:label.slice(0,3),start:`${year}-${String(i+1).padStart(2,'0')}-01`,end:dayAdd(i===11?`${Number(year)+1}-01-01`:`${year}-${String(i+2).padStart(2,'0')}-01`,-1)}));
 const result=[];for(let start=monday(`${year}-01-01`);start<=`${year}-12-31`;start=dayAdd(start,7))result.push({key:start,label:new Date(start+'T12:00:00Z').toLocaleDateString('en-US',{month:'numeric',day:'numeric',timeZone:'UTC'}),start,end:dayAdd(start,6)});return result;
}
function renderVolume(){
 const buckets=periods(),rows=included(),isTime=$('#metric-select').value==='time';
 $('#volume-charts').innerHTML=['swimming','cycling','running'].map(g=>{
  const values=buckets.map(b=>{const r=rows.filter(a=>a.group===g&&a.date>=b.start&&a.date<=b.end),raw=sum(r,isTime?'timer_duration_s':'distance_m');return {b,r,raw,value:raw==null?0:raw/(isTime?3600:g==='swimming'?.9144:1609.344),unknown:b.end<D.coverage_start||b.start>D.as_of,partial:b.start<D.coverage_start||b.end>D.as_of||b.start<`${year}-01-01`||b.end>`${year}-12-31`}}),max=Math.max(1,...values.map(v=>v.value));
  const unit=isTime?'timer hours':g==='swimming'?'yards':'miles';
  return `<article class="volume-panel" style="--sport:${colors[g]}"><h3>${labels[g]}</h3><p>${unit} · ${$('#period-select').value==='week'?'Monday–Sunday weeks':'calendar months'}</p><div class="volume-chart"><div class="bars" style="min-width:${Math.max(570,buckets.length*35)}px">${values.map(({b,r,raw,value,unknown,partial})=>{const valueText=unknown?'Unavailable':raw==null&&r.length?'Metric unavailable':`${value.toLocaleString('en-US',{maximumFractionDigits:isTime?1:0})} ${unit}`;return `<div class="bar-column"><small>${unknown?'—':value===0?'':value.toLocaleString('en-US',{maximumFractionDigits:0})}</small><button class="bar-button ${unknown?'unknown':''}" type="button" style="--height:${value/max*100}%" data-chart-group="${g}" data-period="${b.key}" aria-label="${labels[g]}, ${b.start} to ${b.end}: ${valueText}${!unknown&&partial?', partial period':''}"><span></span></button><span class="bar-label">${b.label}${!unknown&&partial?'*':''}</span></div>`}).join('')}</div></div><div class="chart-detail" id="chart-detail-${g}" aria-live="polite">Select a bar for the period total.</div></article>`;
 }).join('');
 document.querySelectorAll('[data-chart-group]').forEach(button=>button.addEventListener('click',()=>{
  const g=button.dataset.chartGroup,b=buckets.find(b=>b.key===button.dataset.period),r=rows.filter(a=>a.group===g&&a.date>=b.start&&a.date<=b.end),raw=sum(r,isTime?'timer_duration_s':'distance_m'),unknown=b.end<D.coverage_start||b.start>D.as_of;
  $(`#chart-detail-${g}`).textContent=unknown?`${dateName(b.start)}–${dateName(b.end)} · Outside available history`:`${dateName(b.start)}–${dateName(b.end)} · ${r.length} sessions · ${isTime?hours(raw??0):r.length?distance(raw,g):distance(0,g)}${b.start<D.coverage_start||b.end>D.as_of?' · Partial period':''}`;
 }));
}
function fillTypes(){const old=$('#sport-select').value;const types=[...new Set(yearRows().filter(a=>$('#group-select').value==='all'||a.group===$('#group-select').value).map(a=>a.sport))].sort((a,b)=>sportName(a).localeCompare(sportName(b)));$('#sport-select').innerHTML='<option value="all">All types</option>'+types.map(s=>`<option value="${s}">${sportName(s)}</option>`).join('');if(types.includes(old))$('#sport-select').value=old}
function renderDay(){
 const rows=yearRows().filter(a=>a.date===selected&&matching(a));
 $('#day-detail').innerHTML=`<h3>${dateName(selected)}</h3>`+(rows.length?rows.map(a=>`<article class="session"><span class="badge">${!a.included?'Excluded · probable duplicate':a.event?'Race / event':'Recorded session'}</span><br><strong>${a.event||sportName(a.sport)}</strong><p>${sportName(a.sport)} · ${distance(a.distance_m,a.group)}</p><p>Timer ${duration(a.timer_duration_s)}<br>Moving ${duration(a.moving_duration_s)}<br>Elapsed ${duration(a.elapsed_duration_s)}</p>${!a.included?'<p>Excluded from totals. Original Other recording retained.</p>':''}</article>`).join(''):`<p>${selected<D.coverage_start||selected>D.as_of?'Outside available history.':'No matching recording. No recording does not necessarily mean a rest day.'}</p>`);
 document.querySelectorAll('#days button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.date===selected)));
}
function renderCalendar(){
 const month=Number($('#month-select').value),first=(new Date(Date.UTC(Number(year),month,1)).getUTCDay()+6)%7,count=new Date(Date.UTC(Number(year),month+1,0)).getUTCDate();let html='<span aria-hidden="true"></span>'.repeat(first);
 for(let day=1;day<=count;day++){const date=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,rows=yearRows().filter(a=>a.date===date&&matching(a)),unknown=date<D.coverage_start||date>D.as_of,event=rows.some(a=>a.event);html+=`<button type="button" class="${rows.length?'recorded':''} ${event?'event-day':''} ${unknown?'unavailable':''}" data-date="${date}" aria-pressed="${selected===date}" aria-label="${months[month]} ${day}: ${unknown?'outside available history':rows.length+' sessions'}${event?', race or event':''}">${day}<span>${unknown?'—':event?'★':rows.length?'●':''}</span></button>`}
 $('#days').innerHTML=html;document.querySelectorAll('#days button').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.date;renderDay()}));renderDay();
}
function renderList(){
 let rows=yearRows().filter(a=>matching(a)&&($('#list-month').value==='all'||a.date.slice(5,7)===$('#list-month').value));rows.sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));if($('#list-sort').value==='newest')rows.reverse();const count=Math.max(1,Math.ceil(rows.length/25));page=Math.min(page,count-1);
 $('#list-count').textContent=`${rows.length} recordings · ${rows.filter(a=>a.included).length} included in totals`;
 $('#activity-list').innerHTML=rows.slice(page*25,page*25+25).map(a=>`<tr class="${a.included?'':'excluded'}"><td><button class="activity-link" type="button" data-activity-date="${a.date}">${dateName(a.date)}</button>${a.event?`<span class="activity-event">${a.event}</span>`:''}${a.included?'':'<span class="activity-event">Excluded duplicate</span>'}</td><td>${sportName(a.sport)}</td><td>${distance(a.distance_m,a.group)}</td><td>${duration(a.timer_duration_s)}</td></tr>`).join('')||'<tr><td colspan="4">No matching recordings.</td></tr>';
 $('#page-number').textContent=`Page ${page+1} of ${count}`;$('#previous-page').disabled=page===0;$('#next-page').disabled=page===count-1;
 document.querySelectorAll('[data-activity-date]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.activityDate;$('#month-select').value=Number(selected.slice(5,7))-1;renderCalendar();location.hash='calendar'}));
}
function renderYear(){year=$('#year-select').value;$('#month-select').innerHTML=months.map((m,i)=>`<option value="${i}">${m}</option>`).join('');$('#list-month').innerHTML='<option value="all">All months</option>'+months.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');selected=year===D.as_of.slice(0,4)?D.as_of:`${year}-12-31`;$('#month-select').value=Number(selected.slice(5,7))-1;page=0;fillTypes();renderOverview();renderVolume();renderCalendar();renderList()}
$('#year-select').addEventListener('change',renderYear);['#period-select','#metric-select'].forEach(s=>$(s).addEventListener('change',renderVolume));$('#month-select').addEventListener('change',()=>{selected=`${year}-${String(Number($('#month-select').value)+1).padStart(2,'0')}-01`;renderCalendar()});$('#group-select').addEventListener('change',()=>{page=0;fillTypes();renderCalendar();renderList()});$('#sport-select').addEventListener('change',()=>{page=0;renderCalendar();renderList()});['#list-month','#list-sort'].forEach(s=>$(s).addEventListener('change',()=>{page=0;renderList()}));$('#previous-page').addEventListener('click',()=>{page--;renderList()});$('#next-page').addEventListener('click',()=>{page++;renderList()});renderYear();
})();

