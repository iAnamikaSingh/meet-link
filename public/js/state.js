import { randomId } from './utils.js';

/** Identifies this browser tab inside a meeting. */
export const clientId = randomId();

const initialSession = () => ({
  active: false,
  code: '',
  name: '',
  isAdmin: false,
  visibility: 'E', // 'E' everyone sees expiry, 'A' admin only
  expiresAt: 0,    // 0 means hidden from this participant
  warned: false,
  channel: null,
  timerId: null,
});

/** Mutable state for the meeting this tab is currently in. */
export const session = initialSession();

export function resetSession() {
  Object.assign(session, initialSession());
}
