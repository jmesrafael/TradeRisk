// load-components.js

// ---------- Theme helpers ----------
function drawSun() {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  icon.innerHTML = `
    <circle cx="12" cy="12" r="4"></circle>
    <line x1="12" y1="2" x2="12" y2="5"></line>
    <line x1="12" y1="19" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="5" y2="12"></line>
    <line x1="19" y1="12" x2="22" y2="12"></line>
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"></line>
    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"></line>
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"></line>
    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"></line>
  `;
}
function drawMoon() {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
}
function getSavedTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return 'dark';
}
function applySavedThemeAndIcon() {
  const theme = getSavedTheme();
  document.documentElement.setAttribute('data-theme', theme);
  theme === 'light' ? drawMoon() : drawSun();
}
function bindThemeToggleOnce() {
  const oldBtn = document.getElementById('toggleTheme');
  if (!oldBtn) return;

  const newBtn = oldBtn.cloneNode(true);
  oldBtn.replaceWith(newBtn);

  newBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const isLight = html.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    next === 'light' ? drawMoon() : drawSun();
  });

  applySavedThemeAndIcon();
}

// ---------- Nav/Policy active link ----------
function highlightActiveLinks(containerEl) {
  if (!containerEl) return;
  const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const links = containerEl.querySelectorAll('.nav-link, .policy-link');
  links.forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (href === current) link.classList.add('active');
    else link.classList.remove('active');
  });
}

// ---------- Safe injector that EXECUTES scripts ----------
async function loadInto(id, url) {
  const mount = document.getElementById(id);
  if (!mount) return false;

  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  const html = await res.text();

  // Parse into a detached document
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Clear the mount, then append nodes, re-executing scripts
  mount.innerHTML = '';
  for (const node of Array.from(doc.body.childNodes)) {
    if (node.tagName === 'SCRIPT') {
      const s = document.createElement('script');
      // copy attributes (src, type, etc)
      for (const { name, value } of Array.from(node.attributes)) {
        s.setAttribute(name, value);
      }
      // inline script content
      if (!s.src) s.textContent = node.textContent;
      mount.appendChild(s); // this executes
    } else {
      mount.appendChild(node.cloneNode(true));
    }
  }

  // Post-inject tasks
  if (id === 'header') {
    bindThemeToggleOnce();
  }
  if (id === 'footer' || id === 'header') {
    highlightActiveLinks(mount);
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const headerP = loadInto('header', '/components/header.html');
    const footerP = loadInto('footer', '/components/footer.html');
    await Promise.allSettled([headerP, footerP]);
    document.dispatchEvent(new CustomEvent('components:loaded'));
  } catch (err) {
    console.error('[components] injection error:', err);
    document.dispatchEvent(new CustomEvent('components:loaded'));
  }
});
