import { $, copyText, formatDuration, meetingLink, parsePasscode, storage } from './utils.js';
import {
  DEFAULT_EXPIRY_MINUTES, EXPIRY_WARNING_MS, MAX_EXPIRY_MINUTES, MAX_NAME_LENGTH, STORAGE_KEYS,
} from './config.js';
import { clientId, resetSession, session } from './state.js';
import { createMeeting, fetchMeeting } from './api.js';
import { createChannel } from './realtime.js';
import { bindChatChannel, postSystemMessage, resetChat } from './chat.js';
import { attachCallChannel, endCall } from './calls.js';
import { setHidden, toast } from './ui.js';

let rerender = () => {};
let createdCode = '';

/* ---- Create ---- */

function selectedMinutes() {
  const raw = $('duration').value === 'custom' ? $('custom-minutes').value : $('duration').value;
  const minutes = parseInt(raw, 10);
  return minutes >= 1 && minutes <= MAX_EXPIRY_MINUTES ? minutes : DEFAULT_EXPIRY_MINUTES;
}

async function handleCreate() {
  let result;
  try {
    result = await createMeeting(selectedMinutes(), $('visibility').value);
  } catch {
    toast('Couldn’t create the meeting. Try again.');
    return;
  }
  createdCode = result.code;
  storage.set(STORAGE_KEYS.adminToken(createdCode), result.token);
  storage.set(STORAGE_KEYS.displayName, $('admin-name').value.trim());

  $('created-code').textContent = createdCode;
  $('created-link').textContent = meetingLink(createdCode);
  $('open-meeting').setAttribute('href', `#${createdCode}`);
  setHidden($('created-panel'), false);
  $('created-panel').scrollIntoView({ block: 'nearest' });
}

async function copyWithToast(text, message) {
  toast((await copyText(text)) ? message : 'Copy isn’t available here');
}

function initCreateForm() {
  $('duration').addEventListener('change', () => {
    setHidden($('custom-minutes'), $('duration').value !== 'custom');
  });
  $('create-submit').addEventListener('click', handleCreate);
  $('copy-code').addEventListener('click', () => copyWithToast(createdCode, 'Passcode copied'));
  $('copy-link').addEventListener('click', () => copyWithToast(meetingLink(createdCode), 'Link copied'));
}

/* ---- Join and lobby ---- */

function initJoinForm() {
  const submit = () => {
    const code = parsePasscode($('join-code').value);
    $('join-error').textContent = code ? '' : 'That passcode isn’t valid. It has 11 letters and numbers.';
    if (code) location.hash = code;
  };
  $('join-submit').addEventListener('click', submit);
  $('join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

export async function renderLobby(code) {
  const info = await fetchMeeting(code, storage.get(STORAGE_KEYS.adminToken(code)) ?? '');
  if (parsePasscode(location.hash.slice(1)) !== code) return; // user navigated away meanwhile
  setHidden($('lobby-ready'), !info.ok);
  setHidden($('lobby-ended'), info.ok);
  if (!info.ok) {
    $('lobby-message').textContent = 'This passcode is invalid or has expired.';
    return;
  }
  $('lobby-info').textContent = info.admin
    ? 'You created this meeting, so you’re the admin.'
    : `You’ve been invited with passcode ${code}.`;
  if (!$('lobby-name').value) $('lobby-name').value = storage.get(STORAGE_KEYS.displayName) ?? '';
  $('lobby-name').focus();
}

/* ---- Room lifecycle ---- */

function updateExpiryBadge() {
  const badge = $('expiry-badge');
  if (!session.expiresAt) {
    badge.textContent = '⏱ Hidden by admin';
    return;
  }
  const remaining = session.expiresAt - Date.now();
  if (remaining <= 0) {
    handleExpired();
    return;
  }
  badge.textContent = `⏱ ${formatDuration(remaining)}${session.visibility === 'A' ? ' · only you see this' : ''}`;
  if (!session.warned && remaining < EXPIRY_WARNING_MS) {
    session.warned = true;
    toast('5 minutes left in this meeting');
  }
}

function handleExpired() {
  leaveRoom();
  toast('This meeting has expired.');
  rerender();
}

async function enterRoom() {
  const code = parsePasscode(location.hash.slice(1));
  if (!code) return rerender();

  const name = $('lobby-name').value.trim().slice(0, MAX_NAME_LENGTH) || 'Guest';
  storage.set(STORAGE_KEYS.displayName, name);
  const info = await fetchMeeting(code, storage.get(STORAGE_KEYS.adminToken(code)) ?? '');
  if (!info.ok) return rerender();

  Object.assign(session, {
    active: true, code, name, isAdmin: info.admin, visibility: info.vis, expiresAt: info.exp ?? 0, warned: false,
  });
  resetChat();
  $('invite-code').textContent = code;
  $('room-notice').textContent = '';

  session.channel = createChannel({ code, clientId, name, onExpired: handleExpired });
  bindChatChannel(session.channel);
  attachCallChannel(session.channel);
  postSystemMessage(`You joined as ${name}.`);

  updateExpiryBadge();
  session.timerId = setInterval(updateExpiryBadge, 1000);
  rerender();
}

/** Tears down the live connection. Safe to call when not in a meeting. */
export function leaveRoom() {
  if (!session.active) return;
  clearInterval(session.timerId);
  endCall(); // must run before the channel closes so peers get the "leave" signal
  session.channel?.close();
  resetSession();
}

export function initMeeting({ onRouteChange }) {
  rerender = onRouteChange;
  initCreateForm();
  initJoinForm();

  $('lobby-join').addEventListener('click', enterRoom);
  $('lobby-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') enterRoom(); });

  $('btn-invite').addEventListener('click', () => $('invite-panel').classList.toggle('is-hidden'));
  $('copy-invite-code').addEventListener('click', () => copyWithToast(session.code, 'Passcode copied'));
  $('copy-invite-link').addEventListener('click', () => copyWithToast(meetingLink(session.code), 'Link copied'));
  $('btn-leave').addEventListener('click', () => {
    leaveRoom();
    location.hash = 'home';
    toast('You left the meeting');
  });
}
