/* Google supplies the basemap; the overlaid course is the original GPX track. */
(()=>{
 let apiPromise,configPromise;
 const config=()=>configPromise||(configPromise=fetch('maps-config.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({})));
 function load(key){
  if(window.google?.maps?.Map)return Promise.resolve(window.google.maps);
  if(apiPromise)return apiPromise;
  apiPromise=new Promise((resolve,reject)=>{
   window.__routeMapsReady=()=>resolve(window.google.maps);
   window.gm_authFailure=()=>{reject(new Error('Google Maps authorization failed'));window.dispatchEvent(new Event('route-maps-unavailable'))};
   const script=document.createElement('script');
   const params=new URLSearchParams({key,loading:'async',callback:'__routeMapsReady',v:'weekly',language:'en',region:'US'});
   script.src='https://maps.googleapis.com/maps/api/js?'+params;script.async=true;
   script.onerror=()=>reject(new Error('Google Maps could not load'));document.head.append(script);
  });return apiPromise;
 }
 function hex(css){
  if(css.startsWith('#'))return css;
  const h=parseFloat(css.slice(4))/30,a=.5*Math.min(.36,1-.36);
  const f=n=>{const k=(n+h)%12;return Math.round(255*(.36-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0')};
  return '#'+f(0)+f(8)+f(4);
 }
 window.GoogleRouteBasemap={
  async create(svg,route,color,onSelect,onUnavailable){
   const settings=await config();if(!settings.apiKey)return null;
   const maps=await load(settings.apiKey);
   const stage=document.createElement('div');stage.className='route-map-stage google-active';svg.before(stage);stage.append(svg);
   const element=document.createElement('div');element.className='route-google-map';element.setAttribute('aria-label',`${route.title} course on Google Maps`);stage.append(element);svg.hidden=true;
   const points=route.points.map(p=>({lat:p[0],lng:p[1]})),bounds=new maps.LatLngBounds();points.forEach(p=>bounds.extend(p));
   const map=new maps.Map(element,{center:points[0],zoom:11,mapTypeId:'roadmap',gestureHandling:'cooperative',streetViewControl:false,mapTypeControl:true,fullscreenControl:true,scaleControl:false});
   const nearest=latLng=>{let best=Infinity,index=0;points.forEach((p,i)=>{const x=(p.lng-latLng.lng())*Math.cos(latLng.lat()*Math.PI/180),y=p.lat-latLng.lat(),d=x*x+y*y;if(d<best){best=d;index=i}});onSelect(index)};
   const overlays=[];let path=[],lastColor;
   function line(){if(path.length<2)return;const overlay=new maps.Polyline({map,path:path.slice(),strokeColor:lastColor,strokeWeight:4,strokeOpacity:1,geodesic:false});overlay.addListener('click',e=>nearest(e.latLng));overlays.push(overlay)}
   for(let i=1;i<points.length;i++){
    const css=color(route.points[i][4]),bin=css.startsWith('#')?css:Math.round(parseFloat(css.slice(4))/10)*10,stroke=typeof bin==='number'?hex(`hsl(${bin} 50% 36%)`):bin;
    if(stroke!==lastColor){line();path=[points[i-1]];lastColor=stroke}path.push(points[i]);
   }line();map.addListener('click',e=>{if(e.latLng)nearest(e.latLng)});
   class Pin extends maps.OverlayView{
    constructor(position,label,description,index){super();this.position=new maps.LatLng(position);this.node=document.createElement('button');this.node.type='button';this.node.className='route-google-pin'+(label==='●'?' selected':'');this.node.textContent=label;this.node.setAttribute('aria-label',description);if(index!=null)this.node.addEventListener('click',e=>{e.stopPropagation();onSelect(index)});else this.node.tabIndex=-1;this.setMap(map)}
    onAdd(){this.getPanes().overlayMouseTarget.append(this.node)}
    draw(){const projection=this.getProjection();if(!projection)return;const p=projection.fromLatLngToDivPixel(this.position);if(p){this.node.style.left=p.x+'px';this.node.style.top=p.y+'px'}}
    onRemove(){this.node.remove()}
    setPosition(p){this.position=new maps.LatLng(p);this.draw()}
   }
   overlays.push(new Pin(points[0],'S',`${route.title} start`,0),new Pin(points.at(-1),'F',`${route.title} finish`,points.length-1));
   const pin=new Pin(points[0],'●','Selected course point',null);overlays.push(pin);
   const scale=document.createElement('div');scale.className='route-google-scale';element.append(scale);
   const updateScale=()=>{const lat=map.getCenter()?.lat()||points[0].lat,z=map.getZoom()||11,miles=100*40075016.686*Math.cos(lat*Math.PI/180)/(256*2**z)/1609.344;scale.textContent=miles.toFixed(miles<1?2:1)+' mi'};
   map.addListener('idle',updateScale);map.fitBounds(bounds,24);
   let destroyed=false;const fail=()=>{if(destroyed)return;destroyed=true;overlays.forEach(o=>o.setMap(null));maps.event.clearInstanceListeners(map);stage.before(svg);stage.remove();svg.hidden=false;window.removeEventListener('route-maps-unavailable',fail);onUnavailable?.()};window.addEventListener('route-maps-unavailable',fail);
   return {select(index){if(destroyed)return;pin.setPosition(points[index]);if(map.getBounds()&&!map.getBounds().contains(points[index]))map.panTo(points[index])},zoom(delta){if(!destroyed)map.setZoom((map.getZoom()||11)+delta)},fit(){if(!destroyed)map.fitBounds(bounds,24)},destroy:fail};
  }
 };
})();
