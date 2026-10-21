// Progressive enhancement: anchors and project disclosure work without JavaScript.
const links = [...document.querySelectorAll('nav a[href^="#"]')];
const sections = links.map(link => document.querySelector(link.getAttribute('href')));
function setCurrent(id) {
  for (const link of links) {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
function updateCurrent() {
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2 && window.scrollY > 0) {
    setCurrent(sections.at(-1).id);
    return;
  }
  const threshold = window.innerHeight * 0.4;
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= threshold) current = section;
  }
  setCurrent(current.id);
}
let scheduled = false;
window.addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { updateCurrent(); scheduled = false; });
}, { passive: true });
for (const link of links) link.addEventListener('click', () => setCurrent(link.hash.slice(1)));
window.addEventListener('resize', updateCurrent);
updateCurrent();
