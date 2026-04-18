// ===== functions.js (updated: initial theme icon render + safer modal hooks + footer active) =====

// Storage Keys
const K_THEME = 'theme';
const K_RISK_DEFAULT = 'risk_default';
const K_CAPITAL_DEFAULT = 'capital_default';

// Elements
const toggleThemeBtn = document.getElementById('toggleTheme');
const themeIcon = document.getElementById('themeIcon'); // may be null if header is injected later
const htmlEl = document.documentElement;

const stop = document.getElementById('stoploss'); // percent (no saved default; placeholder only)
const risk = document.getElementById('risk');     // percent (has saved default)
const cap  = document.getElementById('capital');  // money   (has saved default)

const riskOut   = document.getElementById('riskOut');
const marginOut = document.getElementById('marginOut');

const riskDefaultLabel    = document.getElementById('riskDefaultLabel');
const capitalDefaultLabel = document.getElementById('capitalDefaultLabel');

const toastEl = document.getElementById('toast');

// Base defaults (used if no saved defaults exist)
const DEFAULTS = { risk: 2, capital: 10000 };

// ---------- helpers ----------
function toast(msg){
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1200);
}
const USD_NUM = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function dollars(v){
  if (!Number.isFinite(v)) return '$0.00';
  return '$' + USD_NUM.format(v);
}

function percentText(v){
  if(!Number.isFinite(v)) return '0%';
  const s = Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${s}%`;
}
function safeSetCaret(el, pos){
  try {
    if (document.activeElement === el && typeof el.setSelectionRange === 'function') {
      el.setSelectionRange(pos, pos);
    }
  } catch(e){ /* ignore */ }
}

// ---------- theme icons (FIX: always query live icon element) ----------
function drawSun(){
  const icon = document.getElementById('themeIcon'); // query now
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
function drawMoon(){
  const icon = document.getElementById('themeIcon'); // query now
  if (!icon) return;
  icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
}
function currentSavedTheme(){
  const saved = localStorage.getItem(K_THEME);
  if (saved === 'light' || saved === 'dark') return saved;
  const attr = htmlEl.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return 'dark';
}
function applyStoredTheme(){
  const mode = currentSavedTheme();
  htmlEl.setAttribute('data-theme', mode);
  mode === 'light' ? drawMoon() : drawSun(); // will draw if icon exists
}
// Ensure the icon is visible ASAP on load (before user clicks)
(function ensureInitialIcon(){
  const mode = currentSavedTheme();
  mode === 'light' ? drawMoon() : drawSun();
})();

// If header/footer are injected later, redraw icon once they exist
document.addEventListener('components:loaded', () => {
  const mode = currentSavedTheme();
  mode === 'light' ? drawMoon() : drawSun();
});

toggleThemeBtn?.addEventListener('click', () => {
  const isLight = htmlEl.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  htmlEl.setAttribute('data-theme', next);
  localStorage.setItem(K_THEME, next);
  next === 'light' ? drawMoon() : drawSun();
});

// ---------- input masking utilities ----------
function sanitizeNumericString(str){
  if (!str) return '';
  let cleaned = str.replace(/[^0-9.]/g, '');
  if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  if (cleaned && !cleaned.startsWith('0.')) {
    cleaned = cleaned.replace(/^0+(\d)/, '$1');
    if (/^0+$/.test(cleaned)) cleaned = '0';
  }
  if (cleaned === '.') cleaned = '0.';
  return cleaned;
}
function formatDisplayFromNumeric(numStr, type, decimals, fixed){
  if (type === 'money' && numStr === '') return '$'; // keep "$" so caret is valid at index 1
  if (numStr === '') return '';
  let out = numStr;
  if (fixed) {
    const n = Number(numStr);
    if (Number.isFinite(n)) out = n.toFixed(decimals);
  }
  if (type === 'money')   return '$' + out;
  if (type === 'percent') return out + '%';
  return out;
}
function renderDisplay(el, fix = false){
  const type = el.dataset.maskType;
  const decimals = Number(el.dataset.maskDecimals || 2);
  const display = formatDisplayFromNumeric(el.dataset.numeric || '', type, decimals, fix);
  el.value = display;

  if (type === 'percent' && display) {
    if (display.endsWith('%')) safeSetCaret(el, display.length - 1);
  } else if (type === 'money' && display !== '') {
    safeSetCaret(el, Math.max(1, display.length));
  }
}
function updateFromRawInputOnElement(el, raw, fix = false){
  const type = el.dataset.maskType;
  let withoutAffix = raw;
  if (type === 'money' && raw.startsWith('$')) withoutAffix = raw.slice(1);
  if (type === 'percent' && raw.endsWith('%')) withoutAffix = raw.slice(0, -1);
  const cleaned = sanitizeNumericString(withoutAffix);
  el.dataset.numeric = cleaned;
  renderDisplay(el, fix);
}
function attachMask(el, { type, decimals = 2 }){
  el.dataset.maskType = type;
  el.dataset.maskDecimals = String(decimals);
  el.setAttribute('placeholder', '0.00');
  if (el.dataset.numeric === undefined) el.dataset.numeric = '';

  el.addEventListener('input', () => {
    updateFromRawInputOnElement(el, el.value, false);
    recalc();
  });
  el.addEventListener('blur', () => {
    if ((el.dataset.numeric || '') !== '') {
      updateFromRawInputOnElement(el, el.value, true);
    } else {
      if (type === 'money') { el.value = '$'; safeSetCaret(el, 1); }
      else { el.value = ''; }
    }
    recalc();
  });
  el.addEventListener('focus', () => {
    if (type === 'money') {
      const v = el.value || '';
      if (!v || v === '$') { el.value = '$'; safeSetCaret(el, 1); }
      else if (el.selectionStart === 0) safeSetCaret(el, 1);
    } else if (type === 'percent') {
      const v = el.value || '';
      if (v.endsWith('%')) safeSetCaret(el, v.length - 1);
    }
  });
  el.addEventListener('mouseup', () => {
    if (type === 'money') {
      if ((el.selectionStart || 0) < 1) safeSetCaret(el, 1);
    } else if (type === 'percent') {
      const v = el.value || '';
      if (v.endsWith('%') && (el.selectionStart || 0) > v.length - 1) {
        safeSetCaret(el, v.length - 1);
      }
    }
  });
  el.addEventListener('keydown', (e) => {
    const val = el.value;
    const start = el.selectionStart ?? 0;
    const end   = el.selectionEnd ?? 0;

    if (type === 'money') {
      const printable = e.key.length === 1;
      if ((e.key === 'Backspace' && start === 1 && end === 1) ||
          (printable && start === 0)) {
        e.preventDefault();
        safeSetCaret(el, Math.max(1, start));
      }
    }
    if (type === 'percent' && val.endsWith('%')) {
      const last = val.length - 1;
      if ((e.key === 'ArrowRight' && start >= last) ||
          (e.key === 'Delete' && start === last && end === last)) {
        e.preventDefault();
        safeSetCaret(el, last);
      }
      if (e.key.length === 1 && start <= last && end > last) {
        e.preventDefault();
        safeSetCaret(el, last);
      }
    }
  });
}

// ---------- computation ----------
function recalc(){
  const r  = parseFloat(risk?.dataset.numeric || '') || 0;
  const c  = parseFloat(cap?.dataset.numeric  || '') || 0;
  const sl = parseFloat(stop?.dataset.numeric || '') || 0;

  const riskAmount = (r/100) * c;
  const margin = sl > 0 ? (riskAmount / (sl/100)) : 0;

  if (riskOut)   riskOut.textContent   = dollars(riskAmount);
  if (marginOut) marginOut.textContent = dollars(margin);
}

// ---------- defaults & labels ----------
function refreshDefaultLabels(){
  const savedRisk = localStorage.getItem(K_RISK_DEFAULT);
  const savedCap  = localStorage.getItem(K_CAPITAL_DEFAULT);

  const riskVal = savedRisk !== null && savedRisk !== '' ? parseFloat(savedRisk) : DEFAULTS.risk;
  const capVal  = savedCap  !== null && savedCap  !== '' ? parseFloat(savedCap)  : DEFAULTS.capital;

  if (riskDefaultLabel)    riskDefaultLabel.textContent    = `Default: ${percentText(riskVal)}`;
  if (capitalDefaultLabel) capitalDefaultLabel.textContent = `Default: ${dollars(capVal)}`;
}

// Save defaults from current inputs (store numeric-only values)
document.getElementById('setRisk')?.addEventListener('click', () => {
  const val = risk?.dataset.numeric || '';
  const num = parseFloat(val);
  if (Number.isFinite(num) && num >= 0) {
    localStorage.setItem(K_RISK_DEFAULT, String(num));
    refreshDefaultLabels();
    toast('Risk % default saved ✔');
  } else {
    toast('Enter a valid Risk %');
  }
});
document.getElementById('setCap')?.addEventListener('click', () => {
  const val = cap?.dataset.numeric || '';
  const num = parseFloat(val);
  if (Number.isFinite(num) && num >= 0) {
    localStorage.setItem(K_CAPITAL_DEFAULT, String(num));
    refreshDefaultLabels();
    toast('Capital default saved ✔');
  } else {
    toast('Enter a valid Capital');
  }
});

// Hydrate inputs from saved defaults on load.
// Stoploss: NO default (show placeholder only).
function hydrateInputsFromDefaults(){
  const savedRisk = localStorage.getItem(K_RISK_DEFAULT);
  const savedCap  = localStorage.getItem(K_CAPITAL_DEFAULT);

  if (risk) risk.dataset.numeric = (savedRisk !== null && savedRisk !== '') ? String(parseFloat(savedRisk)) : String(DEFAULTS.risk);
  if (cap)  cap.dataset.numeric  = (savedCap  !== null && savedCap  !== '') ? String(parseFloat(savedCap))  : String(DEFAULTS.capital);

  if (stop) {
    stop.dataset.numeric = ''; // no default for stoploss
    stop.value = '';           // placeholder for percent when empty
  }
}

// Clear all => CLEAR FIELDS (do not touch saved defaults). On refresh, defaults will repopulate.
document.getElementById('clearAll')?.addEventListener('click', () => {
  if (stop) { stop.dataset.numeric = ''; stop.value = ''; }
  if (risk) { risk.dataset.numeric = ''; risk.value = ''; }
  if (cap)  { cap.dataset.numeric  = ''; cap.value  = ''; }

  recalc(); // will show $0.00 outputs
  toast('Cleared inputs (defaults preserved)');
});

// ---------- Footer "active" highlighter ----------
(function setActiveFooterLink(){
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.footer .policy-link').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href && (href === path)) a.classList.add('active');
    else a.classList.remove('active');
  });
})();

// ---------- Tutorial Modal (guarded for pages without it) ----------
const tutorialModal = document.getElementById("tutorialModal");
const howToUseBtn = document.getElementById("howToUseBtn");
const closeModal = document.getElementById("closeModal");
const closeModalFooter = document.getElementById("closeModalFooter");

// Open modal
howToUseBtn?.addEventListener("click", () => {
  if (!tutorialModal) return;
  tutorialModal.style.display = "block";
  document.body.style.overflow = "hidden";
});
// Close modal via X button
closeModal?.addEventListener("click", () => {
  if (!tutorialModal) return;
  tutorialModal.style.display = "none";
  document.body.style.overflow = "auto";
});
// Close modal via footer button
closeModalFooter?.addEventListener("click", () => {
  if (!tutorialModal) return;
  tutorialModal.style.display = "none";
  document.body.style.overflow = "auto";
});
// Close modal by clicking outside
window.addEventListener("click", (event) => {
  if (tutorialModal && event.target === tutorialModal) {
    tutorialModal.style.display = "none";
    document.body.style.overflow = "auto";
  }
});

// ---------- init ----------
applyStoredTheme();           // set data-theme & icon based on saved value
hydrateInputsFromDefaults();  // set numeric datasets (risk/cap), stoploss placeholder

// Attach masks (only if inputs exist on this page)
if (stop) attachMask(stop, { type: 'percent', decimals: 2 });
if (risk) attachMask(risk, { type: 'percent', decimals: 2 });
if (cap)  attachMask(cap,  { type: 'money',   decimals: 2 });

// Show defaults with affixes on first load (if inputs exist)
if (risk) renderDisplay(risk, false); // e.g., "2%"
if (cap)  renderDisplay(cap,  false); // e.g., "$10000"

refreshDefaultLabels();
recalc();
