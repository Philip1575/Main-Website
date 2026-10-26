(()=>{
const routes=window.EVENT_ROUTES||window.RACE_ROUTES||[];
const project=(lat,lon)=>[(lon+180)/360*256,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2*256];
const fmt=s=>{s=Math.round(s);return `${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
const pace=s=>{if(s==null)return 'Unavailable';s=Math.round(s);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} /mi`};
document.querySelectorAll('[data-route]').forEach(host=>{
 const r=routes.find(r=>r.id===host.dataset.route);if(!r)return;
 const cycling=r.sport==='ride',metric=cycling?'speed':'pace';
 const motion=s=>cycling?(s!=null&&s>0?`${(3600/s).toFixed(1)} mph`:'Unavailable'):pace(s);
 let zoom=1,selected=0,basemap=null;const coords=r.points.map(p=>project(p[0],p[1]));
 const xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
 const base=Math.min(700/(bounds[2]-bounds[0]),390/(bounds[3]-bounds[1]));
 const valid=r.points.map(p=>p[4]).filter(p=>p!=null&&p<1800).sort((a,b)=>a-b);const low=valid[Math.floor(valid.length*.15)],high=valid[Math.floor(valid.length*.85)];
 const color=p=>p==null?'#7c8179':`hsl(${145-Math.max(0,Math.min(1,(p-low)/(high-low)))*110} 50% 36%)`;
 host.innerHTML=`<div class="map-toolbar"><strong>${r.title}</strong><div><button type="button" data-zoom="out" aria-label="Zoom out ${r.title}">−</button><button type="button" data-zoom="in" aria-label="Zoom in ${r.title}">+</button><button type="button" data-zoom="reset">Fit route</button></div></div><svg class="course-map" viewBox="0 0 800 500" role="img" aria-label="Recorded ${r.title} route, north up. Use the position slider to explore pace."></svg><div class="pace-legend"><span>Faster</span><span class="gradient"></span><span>Slower</span></div><label class="route-slider">Follow the route<input type="range" min="0" max="${r.points.length-1}" value="0" step="1" aria-label="Position along ${r.title} course"></label><output class="route-readout" aria-live="polite"></output>`;
 host.querySelector('.course-map').setAttribute('aria-label',`Recorded ${r.title} route, north up. Use the position slider to explore ${metric} and elevation.`);
 const profile=document.createElement('div');profile.className='elevation-profile';
 profile.innerHTML=`<h4>Course elevation</h4><p class="profile-hint">Select the graph or map, or use the slider, to follow the same point on both.</p><svg class="elevation-chart" viewBox="0 0 800 260" role="img" aria-label="${r.title} elevation profile for the entire course, elevation in feet and distance in miles"></svg>`;
 host.querySelector('.route-readout').after(profile);
 const svg=host.querySelector('.course-map'),chart=host.querySelector('.elevation-chart'),slider=host.querySelector('input'),readout=host.querySelector('output');
 const elevations=r.points.map(p=>p[5]).filter(v=>v!=null).map(v=>v/0.3048),maxDistance=r.points.at(-1)[2];
 const bottom=elevations.length?Math.floor(Math.min(...elevations)/50)*50:0,top=elevations.length?Math.max(bottom+50,Math.ceil(Math.max(...elevations)/50)*50):50;
 let profileWidth=800;
 const graphX=p=>55+p[2]/maxDistance*(profileWidth-75),graphY=p=>215-(p[5]/0.3048-bottom)/(top-bottom)*180;
 function drawProfile(){
  if(!elevations.length){chart.innerHTML='<text x="65" y="100" fill="#56595d">Elevation unavailable in this GPX file.</text>';return}
  profileWidth=host.clientWidth<500?400:800;chart.setAttribute('viewBox',`0 0 ${profileWidth} 260`);
  let grid='',path='',pen=false;for(let i=0;i<=4;i++){const y=215-i*45,value=bottom+(top-bottom)*i/4;grid+=`<path d="M55,${y}H${profileWidth-20}" stroke="#d9dbd5"/><text x="46" y="${y+5}" text-anchor="end">${Math.round(value)}</text>`}
  const ticks=profileWidth===400?2:4;
  for(let i=0;i<=ticks;i++){const x=55+i*(profileWidth-75)/ticks;grid+=`<text x="${x}" y="244" text-anchor="${i===0?'start':i===ticks?'end':'middle'}">${(maxDistance/1609.344*i/ticks).toFixed(1)} mi</text>`}
  for(const p of r.points){if(p[5]==null){pen=false;continue}path+=`${pen?'L':'M'}${graphX(p)},${graphY(p)}`;pen=true}
  const p=r.points[selected],x=graphX(p);
  chart.innerHTML=`<g fill="#56595d" font-size="15" font-family="Arial">${grid}<text x="65" y="18">Elevation (ft)</text></g><path d="${path}" fill="none" stroke="#315f4e" stroke-width="2.5"/><path d="M${x},35V215" stroke="#102019" stroke-width="1.5" stroke-dasharray="4 3"/>${p[5]==null?'':`<circle cx="${x}" cy="${graphY(p)}" r="6" fill="#a4ca88" stroke="#102019" stroke-width="2"/>`}`;
 }
 function draw(){if(basemap){basemap.select(selected);return}const scale=base*zoom,center=zoom===1?[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2]:coords[selected],to=p=>[400+(p[0]-center[0])*scale,250+(p[1]-center[1])*scale];
 let grid='';for(let x=0;x<=800;x+=50)grid+=`<path d="M${x},0V500" stroke="#dce2d7"/>`;for(let y=0;y<=500;y+=50)grid+=`<path d="M0,${y}H800" stroke="#dce2d7"/>`;
 let lines='';for(let i=1;i<coords.length;i++){const a=to(coords[i-1]),b=to(coords[i]);lines+=`<path d="M${a.join(',')}L${b.join(',')}" stroke="${color(r.points[i][4])}" stroke-width="4" fill="none"/>`}
 const marker=(index,label)=>{const p=to(coords[index]);return `<circle cx="${p[0]}" cy="${p[1]}" r="12" fill="#102019" stroke="white" stroke-width="2"/><text x="${p[0]}" y="${p[1]+4}" text-anchor="middle" fill="white" font-size="11" font-family="Arial">${label}</text>`};const p=to(coords[selected]);
 const metersPerPixel=40075016.686*Math.cos(r.points[selected][0]*Math.PI/180)/256/scale,miles=100*metersPerPixel/1609.344;
 svg.innerHTML=`<rect width="800" height="500" fill="#edf0e9"/>${grid}<g>${lines}</g>${marker(0,'S')}${marker(coords.length-1,'F')}<circle cx="${p[0]}" cy="${p[1]}" r="8" fill="#a4ca88" stroke="#102019" stroke-width="3"/><path d="M760,60V25l-7,12m7,-12l7,12" stroke="#315f4e" fill="none" stroke-width="2"/><text x="760" y="80" text-anchor="middle" font-size="14" fill="#315f4e">N</text><path d="M25,460v8h100v-8" fill="none" stroke="#315f4e" stroke-width="2"/><text x="25" y="450" font-size="12" fill="#315f4e">${miles.toFixed(miles<1?2:1)} mi</text>`;
 }
 function update(){
  const p=r.points[selected],elevation=p[5]==null?'Elevation unavailable':`${Math.round(p[5]/0.3048).toLocaleString()} ft elevation`,gain=p[6]==null?'Gain unavailable':`${Math.round(p[6]/0.3048).toLocaleString()} ft gain so far`;
  readout.innerHTML=`<strong>${(p[2]/1609.344).toFixed(2)} mi along GPX track</strong><span>${motion(p[4])} estimated ${metric}</span><span>${fmt(p[3])} since first GPS point</span><span>${elevation}</span><span>${gain}</span>`;
  slider.setAttribute('aria-valuetext',`${(p[2]/1609.344).toFixed(2)} miles, estimated ${metric} ${motion(p[4])}, ${elevation}, ${gain}`);draw();drawProfile()
 }
 chart.addEventListener('click',e=>{const box=chart.getBoundingClientRect(),x=(e.clientX-box.left)/box.width*profileWidth,target=Math.max(0,Math.min(1,(x-55)/(profileWidth-75)))*maxDistance;let best=Infinity; r.points.forEach((p,i)=>{const delta=Math.abs(p[2]-target);if(delta<best){best=delta;selected=i}});slider.value=selected;update()});
 window.addEventListener('resize',drawProfile);
 slider.addEventListener('input',()=>{selected=Number(slider.value);update()});host.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{if(basemap){b.dataset.zoom==='reset'?basemap.fit():basemap.zoom(b.dataset.zoom==='in'?1:-1);return}zoom=b.dataset.zoom==='reset'?1:Math.max(1,Math.min(16,zoom*(b.dataset.zoom==='in'?2:.5)));draw()}));
 svg.addEventListener('click',e=>{const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()),x=point.x,y=point.y,center=zoom===1?[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2]:coords[selected];let best=Infinity,index=0;coords.forEach((p,i)=>{const dx=400+(p[0]-center[0])*base*zoom-x,dy=250+(p[1]-center[1])*base*zoom-y,d=dx*dx+dy*dy;if(d<best){best=d;index=i}});selected=index;slider.value=index;update()});update();
 if(window.GoogleRouteBasemap){
  const mount=()=>window.GoogleRouteBasemap.create(svg,r,color,index=>{selected=index;slider.value=index;update()},()=>{basemap=null;draw()}).then(controller=>{basemap=controller;if(basemap)basemap.select(selected)}).catch(()=>{basemap=null;const stage=svg.closest('.route-map-stage');if(stage){stage.before(svg);stage.remove()}svg.hidden=false;draw()});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();mount()}},{rootMargin:'250px'});observer.observe(svg)}else mount();
 }
});})();

