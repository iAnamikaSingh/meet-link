import { $ } from './utils.js';
import { DEFAULT_META, PAGE_META, TOAST_DURATION_MS } from './config.js';

let toastTimer;

export const setHidden = (element, hidden) => element.classList.toggle('is-hidden', hidden);

export function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('is-visible'), TOAST_DURATION_MS);
}

/** Shows exactly one top-level view and syncs nav state and SEO metadata. */
export function showView(view) {
  document.querySelectorAll('#main > section').forEach((section) => setHidden(section, true));
  setHidden($(view === 'room' ? 'room' : `v-${view}`), false);

  document.querySelectorAll('.site-nav__link').forEach((link) => {
    if (link.dataset.route === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  setHidden(document.querySelector('.site-nav'), view === 'room');

  const [title, description] = PAGE_META[view] ?? DEFAULT_META;
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  window.scrollTo(0, 0);
}
