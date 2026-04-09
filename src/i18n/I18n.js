// ─── I18n: locale manager with t() translation helper ───

const STORAGE_KEY = 'netsim-locale';

let currentLocale = 'ja';
let dictionaries = {};
let onLocaleChange = null;

/**
 * Register a locale dictionary.
 * @param {string} locale - e.g. 'en', 'ja'
 * @param {Object} dict  - flat/nested key-value translation object
 */
export function registerLocale(locale, dict) {
  if (!dictionaries[locale]) {
    dictionaries[locale] = {};
  }
  _deepMerge(dictionaries[locale], dict);
}

function _deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object') {
      _deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

/**
 * Set the active locale and persist to localStorage.
 * @param {string} locale
 */
export function setLocale(locale) {
  if (!dictionaries[locale]) return;
  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
  if (onLocaleChange) onLocaleChange(locale);
}

/**
 * Get the active locale.
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Load saved locale from localStorage (call once at startup).
 */
export function loadSavedLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dictionaries[saved]) {
      currentLocale = saved;
    }
  } catch { /* ignore */ }
}

/**
 * Register a callback when locale changes.
 * @param {Function} cb - (locale) => void
 */
export function onLocaleChanged(cb) {
  onLocaleChange = cb;
}

/**
 * Translate a key. Supports dot-notation for nested keys.
 * Falls back to the key itself if not found.
 *
 * Usage:
 *   t('ui.save')            → "Save" or "保存"
 *   t('ui.completed', {n: 3, total: 10}) → "3 / 10 completed"
 *
 * @param {string} key
 * @param {Object} [params] - interpolation values for {key} placeholders
 * @returns {string}
 */
export function t(key, params) {
  const dict = dictionaries[currentLocale] || {};
  let val = resolve(dict, key);

  // Fallback: try other locales
  if (val === undefined) {
    for (const loc of Object.keys(dictionaries)) {
      if (loc === currentLocale) continue;
      val = resolve(dictionaries[loc], key);
      if (val !== undefined) break;
    }
  }

  // Final fallback: return key itself
  if (val === undefined) return key;

  // Interpolate {param} placeholders
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
    }
  }

  return val;
}

/**
 * Resolve dot-notation key from nested object.
 */
function resolve(obj, key) {
  const parts = key.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}
