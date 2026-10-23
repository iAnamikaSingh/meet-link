import { FALLBACK_ICE_SERVERS } from './config.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

/** @returns {Promise<{code: string, token: string}>} */
export function createMeeting(minutes, visibility) {
  return requestJson('/api/create', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ minutes, vis: visibility }),
  });
}

/** @returns {Promise<{ok: boolean, admin?: boolean, vis?: string, exp?: number|null}>} */
export async function fetchMeeting(code, adminToken = '') {
  try {
    return await requestJson(`/api/meeting/${code}?token=${encodeURIComponent(adminToken)}`);
  } catch {
    return { ok: false };
  }
}

export async function fetchIceServers() {
  try {
    return await requestJson('/api/ice');
  } catch {
    return FALLBACK_ICE_SERVERS;
  }
}

export function postToMeeting(code, clientId, topic, data) {
  return fetch(`/api/send/${code}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ id: clientId, topic, data }),
  }).catch(() => {});
}
