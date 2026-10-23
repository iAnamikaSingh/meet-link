import { PASSCODE_PATTERN } from './config.js';

/** Shorthand for document.getElementById. */
export const $ = (id) => document.getElementById(id);

/** localStorage wrapper that never throws (private mode, blocked storage). */
export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  },
};

/** @returns {string|null} Normalised passcode, or null when the format is invalid. */
export function parsePasscode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  return PASSCODE_PATTERN.test(code) ? code : null;
}

/** Formats milliseconds as "1h 05m 09s" / "4m 09s". */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${h ? `${h}h ` : ''}${m}m ${s}s`;
}

/** Random lowercase alphanumeric id (matches the server's client id rule). */
export function randomId(length = 7) {
  return Math.random().toString(36).slice(2, 2 + length).padEnd(length, '0');
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const meetingLink = (code) => `${location.href.split('#')[0]}#${code}`;
