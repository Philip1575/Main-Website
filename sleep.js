(()=>{
 const D=window.SLEEP_DATA,$=s=>document.querySelector(s),quality={POOR:{label:'Poor',color:'#984c43',ink:'#fff'},FAIR:{label:'Fair',color:'#966323',ink:'#fff'},GOOD:{label:'Good',color:'#527553',ink:'#fff'},EXCELLENT:{label:'Excellent',color:'#315f78',ink:'#fff'}},months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const records=new Map(D.days.map(d=>[d.date,d]));let selected=D.days.filter(d=>d.score!=null).at(-1)?.date||D.as_of;
 const dateName=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 const dayAdd=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const style=r=>r?.score!=null&&r.quality?`--sleep-color:${quality[r.quality].color};--sleep-ink:${quality[r.quality].ink}`:'';
 const text=date=>{const r=records.get(date);return `${dateName(date)}: ${r?.score!=null?`sleep score ${r.score} of 100, ${quality[r.quality]?.label||'Unclassified'}`:date<D.tracking_start||date>D.as_of?'outside tracking period':'no sleep score recorded'}`};
 function detail(){const r=records.get(selected);$('#sleep-detail').innerHTML=`${dateName(selected)}<strong>${r?.score!=null?`${r.score} / 100 · ${quality[r.quality]?.label||'Sleep score'}`:selected<D.tracking_start||selected>D.as_of?'Outside tracking period':'No sleep score recorded'}</strong>`;document.querySelectorAll('[data-sleep-date]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sleepDate===selected)))}
 function cell(date,small=false){const r=records.get(date),outside=date<D.tracking_start||date>D.as_of;return `<button type="button" class="${small?'sleep-day':'sleep-cell'} ${outside?'outside':r?.score==null?'missing':''}" data-sleep-date="${date}" aria-label="${text(date)}" aria-pressed="${date===selected}" style="${style(r)}">${small?'':`<span>${Number(date.slice(8))}</span><strong>${r?.score??'—'}</strong>`}</button>`}
 function bind(){document.querySelectorAll('[data-sleep-date]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='true';b.addEventListener('click',()=>{selected=b.dataset.sleepDate;if(Number($('#sleep-month').value)!==Number(selected.slice(5,7))-1){$('#sleep-month').value=Number(selected.slice(5,7))-1;render()}else detail()})})}
 function render(){const year=$('#year-select').value,rows=D.days.filter(d=>d.date.startsWith(year)&&d.score!=null),mean=rows.length?Math.round(rows.reduce((n,d)=>n+d.score,0)/rows.length):null;
  $('#sleep-summary').innerHTML=`<div><strong>${mean??'—'}<small>Average score / 100</small></strong></div><div><strong>${rows.length}<small>Nights with a score</small></strong></div>`;
  let start=`${year}-01-01`,offset=(new Date(start+'T12:00:00Z').getUTCDay()+6)%7;start=dayAdd(start,-offset);let html='';for(let date=start;date<=`${year}-12-31`;date=dayAdd(date,1)){html+=date.slice(0,4)===year?cell(date,true):'<span></span>'}$('#sleep-heatmap').innerHTML=html;
  const month=Number($('#sleep-month').value),first=(new Date(Date.UTC(Number(year),month,1)).getUTCDay()+6)%7,count=new Date(Date.UTC(Number(year),month+1,0)).getUTCDate();html='<span></span>'.repeat(first);for(let n=1;n<=count;n++)html+=cell(`${year}-${String(month+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`);$('#sleep-days').innerHTML=html;bind();detail();
 }
 $('#sleep-month').innerHTML=months.map((m,i)=>`<option value="${i}">${m}</option>`).join('');$('#sleep-month').value=Number(selected.slice(5,7))-1;
 $('#sleep-legend').innerHTML=Object.values(quality).map(q=>`<span><i class="sleep-swatch" style="--sleep-color:${q.color}"></i>${q.label}</span>`).join('')+'<span>— No score</span>';
 $('#sleep-month-markers').innerHTML=months.map(m=>`<span>${m.slice(0,3)}</span>`).join('');
 $('#sleep-month').addEventListener('change',render);$('#year-select').addEventListener('change',()=>{selected=`${$('#year-select').value}-01-01`;render()});render();
})();

