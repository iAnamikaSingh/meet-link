/**
 * Application-wide constants. Nothing in this file has side effects.
 */

export const DEFAULT_EXPIRY_MINUTES = 60;
export const MAX_EXPIRY_MINUTES = 1440;
export const EXPIRY_WARNING_MS = 5 * 60 * 1000;
export const TOAST_DURATION_MS = 2200;
export const MAX_NAME_LENGTH = 24;
export const PASSCODE_PATTERN = /^[A-Z0-9]{11}$/;

export const IMAGE = Object.freeze({ maxEdgePx: 720, quality: 0.7, mime: 'image/jpeg' });
export const DATA_URL_IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,/;

/** Message topics understood by the server relay. */
export const TOPICS = Object.freeze({ chat: 'chat', signal: 'sig' });

export const STORAGE_KEYS = Object.freeze({
  displayName: 'name',
  adminToken: (code) => `admin:${code}`,
});

export const FALLBACK_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

/** Public pages reachable through hash routes (e.g. #create). */
export const PAGE_VIEWS = ['home', 'create', 'join', 'how-it-works', 'faq'];

/** [document title, meta description] per view. */
export const PAGE_META = {
  home: ['MeetLink – Free Meeting Links with Passcode, Chat & Auto-Expiry', 'Create a meeting link or passcode in one click, set when it expires (60 minutes by default), then chat, video call, voice call and share images.'],
  create: ['Create a Meeting Link and Passcode – MeetLink', 'Choose an expiry time and who can see it, then generate a meeting passcode and link to share.'],
  join: ['Join a Meeting with a Passcode – MeetLink', 'Enter your passcode to join a MeetLink meeting for chat, calls and image sharing.'],
  'how-it-works': ['How MeetLink Works – Passcodes, Expiry, Chat and Calls', 'Learn how MeetLink passcodes, auto-expiry, admin controls, chat, video and voice calls work.'],
  faq: ['MeetLink FAQ – Expiry, Passcodes and Joining', 'Answers about meeting expiry, who can join, who sees the expiry time and image sharing.'],
};
export const DEFAULT_META = ['Join a Meeting – MeetLink', 'Join a MeetLink meeting.'];
