// Keep the navigation in step with the section being read.
const navigationLinks = [...document.querySelectorAll('.nav-link')];
const sections = navigationLinks.map((link) => document.querySelector(link.hash));
let scheduled = false;

function updateNavigation() {
  const offset = document.querySelector('.masthead').offsetHeight + 45;
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= offset) current = section;
  }
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
    current = sections[sections.length - 1];
  }
  for (const link of navigationLinks) {
    const active = link.hash === `#${current.id}`;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  scheduled = false;
}

function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(updateNavigation);
}

window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate, { passive: true });
window.addEventListener('pageshow', scheduleUpdate);
document.addEventListener('languagechange', scheduleUpdate);
updateNavigation();
