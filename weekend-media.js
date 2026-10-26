(()=>{
 const base='assets/weekend/';
 const photo=(file,alt,caption)=>`<figure class="weekend-photo"><a href="${base+file}" target="_blank" rel="noopener"><img src="${base+file}" alt="${alt}" loading="lazy"></a><figcaption>${caption}</figcaption></figure>`;
 const video=(number)=>`<figure class="weekend-video"><video controls playsinline preload="none" poster="${base}bellringer-clip-${number}-poster.jpg" aria-label="BellRinger video ${number}"><source src="${base}bellringer-clip-${number}.mp4" type="video/mp4">Your browser cannot play this clip. <a href="${base}bellringer-clip-${number}.mp4">Download the BellRinger clip</a>.</video><figcaption>BellRinger · Clip ${number}</figcaption></figure>`;
 document.querySelectorAll('[data-weekend-media]').forEach(host=>{
  const group=host.dataset.weekendMedia;
  if(group==='marathon'){host.innerHTML=photo('marathon-after-finish.jpg','Philip seated after the Marine Corps Marathon, wearing his finisher medal','After the marathon · October 25, 2026');return}
  host.innerHTML=(group==='bellringer'?photo('bellringer-finish.jpg','Philip with his bicycle at the BellRinger finish','At the BellRinger finish'):'')+photo('bellringer-team.jpg','Philip with his bicycle holding a GUASFCU sign at BellRinger','A BellRinger moment with GUASFCU')+video(1)+video(2);
 });
})();
