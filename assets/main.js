// Keep the navigation in step with the section being read.
const navigationLinks = [...document.querySelectorAll('.nav-link')];
const sections = navigationLinks.map((link) => document.querySelector(link.hash));
const profileSidebar = document.querySelector('.profile');
let scheduled = false;

function updateProfilePosition() {
  if (!profileSidebar) return;
  const top = Number.parseFloat(getComputedStyle(profileSidebar).top) || 0;
  const fits = window.matchMedia('(min-width: 761px)').matches
    && profileSidebar.offsetHeight + top + 24 <= window.innerHeight;
  profileSidebar.classList.toggle('is-sticky', fits);
}

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
window.addEventListener('resize', updateProfilePosition, { passive: true });
window.addEventListener('pageshow', scheduleUpdate);
window.addEventListener('pageshow', updateProfilePosition);
document.addEventListener('languagechange', scheduleUpdate);
document.addEventListener('languagechange', updateProfilePosition);
document.addEventListener('fontsizechange', scheduleUpdate);
document.addEventListener('fontsizechange', updateProfilePosition);
updateProfilePosition();
updateNavigation();

// The private visit log is only for the published homepage.
if (location.origin === 'https://tao355667.github.io'
    && ['/', '/index.html'].includes(location.pathname)) {
  fetch('https://academic-homepage-traffic.xct714328058.workers.dev/visit', {
    method: 'POST',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    keepalive: true,
  }).catch(() => {
    // The homepage works even when the visitor blocks the reporting endpoint.
  });
}
