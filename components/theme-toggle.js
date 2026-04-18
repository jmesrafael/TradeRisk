// /components/theme-toggle.js
const THEME_KEY = 'theme'; // 'light' | 'dark'
const getSystemPref = () =>
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const getTheme = () => localStorage.getItem(THEME_KEY) || getSystemPref();
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new CustomEvent('theme:changed', { detail: { theme } }));
};

// Draws sun or moon into provided <svg>
function drawIcon(svgEl, theme) {
  if (!svgEl) return;
  svgEl.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';
  svgEl.setAttribute('viewBox', '0 0 24 24');
  svgEl.setAttribute('fill', 'none');
  svgEl.setAttribute('stroke', 'currentColor');
  svgEl.setAttribute('stroke-width', '2');
  svgEl.setAttribute('aria-hidden', 'true');

  if (theme === 'dark') {
    // Moon → make it white
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z');
    path.setAttribute('stroke', '#fff'); // Force moon icon white
    svgEl.appendChild(path);
  } else {
    // Sun (inherits color)
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '5');
    svgEl.appendChild(circle);

    ['M12 1v2','M12 21v2','M4.22 4.22l1.42 1.42','M18.36 18.36l1.42 1.42',
     'M1 12h2','M21 12h2','M4.22 19.78l1.42-1.42','M18.36 5.64l1.42-1.42'
    ].forEach(d => {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      svgEl.appendChild(p);
    });
  }
}

class ThemeToggle extends HTMLElement {
  static get observedAttributes() { return ['size', 'title']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._theme = getTheme();
  }

  connectedCallback() {
    this.render();
    window.addEventListener('storage', this._onStorage);
    window.addEventListener('theme:changed', this._onThemeEvent);
    applyTheme(this._theme);
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this._onStorage);
    window.removeEventListener('theme:changed', this._onThemeEvent);
  }

  attributeChangedCallback() { this.render(); }

  _onStorage = (e) => {
    if (e.key === THEME_KEY) {
      this._theme = getTheme();
      this.updateButton();
    }
  };

  _onThemeEvent = (e) => {
    if (!e?.detail?.theme) return;
    this._theme = e.detail.theme;
    this.updateButton();
  };

  toggleTheme = () => {
    this._theme = this._theme === 'dark' ? 'light' : 'dark';
    applyTheme(this._theme);
    this.updateButton();
  };

  updateButton() {
    const btn = this.shadowRoot.querySelector('button');
    const svg = this.shadowRoot.querySelector('svg');
    if (!btn || !svg) return;
    const toLight = this._theme === 'dark';
    btn.setAttribute('aria-label', toLight ? 'Switch to light theme' : 'Switch to dark theme');
    btn.setAttribute('title', toLight ? 'Switch to light theme' : 'Switch to dark theme');
    drawIcon(svg, this._theme);
  }

  render() {
    const size = this.getAttribute('size') || '22';
    const btnClass = this.getAttribute('class') || 'themeToggle';
    const title = this.getAttribute('title') || 'Toggle theme';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; }
        button {
          display: inline-flex; align-items: center; justify-content: center;
          width: ${size}px; height: ${size}px; padding: 0; border: none; background: transparent;
          cursor: pointer;
          /* Remove hover effects */
          transition: none;
        }
        button:hover { opacity: 1; transform: none; }
        svg.icon { width: ${size}px; height: ${size}px; }
      </style>
      <button class="${btnClass}" part="button" aria-label="${title}" title="${title}">
        <svg class="icon" part="icon"></svg>
      </button>
    `;

    const btn = this.shadowRoot.querySelector('button');
    btn.addEventListener('click', this.toggleTheme, { passive: true });

    this.updateButton();
  }
}

customElements.define('theme-toggle', ThemeToggle);
export { applyTheme, getTheme };
