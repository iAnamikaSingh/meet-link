import { postToMeeting } from './api.js';

/**
 * Live connection to one meeting: Server-Sent Events for receiving,
 * POST requests for sending.
 *
 * @param {{code: string, clientId: string, name: string, onExpired: () => void}} options
 */
export function createChannel({ code, clientId, name, onExpired }) {
  const handlers = new Map();
  const peerListeners = [];
  let knownPeers = [];
  let firstSnapshot = true;

  const url = `/api/events/${code}?id=${clientId}&name=${encodeURIComponent(name)}`;
  const source = new EventSource(url);

  source.addEventListener('msg', (event) => {
    const { topic, data } = JSON.parse(event.data);
    (handlers.get(topic) ?? []).forEach((handler) => handler(data));
  });

  source.addEventListener('peers', (event) => {
    const peers = JSON.parse(event.data).peers.map(({ id, n }) => ({
      id,
      name: n,
      isSelf: id === clientId,
    }));
    const joined = firstSnapshot ? [] : peers.filter((p) => !knownPeers.some((k) => k.id === p.id));
    const left = knownPeers.filter((k) => !peers.some((p) => p.id === k.id));
    knownPeers = peers;
    firstSnapshot = false;
    peerListeners.forEach((listener) => listener({ peers, joined, left }));
  });

  source.addEventListener('expired', () => {
    source.close();
    onExpired();
  });

  // A closed stream after an error means the server rejected us (meeting gone).
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) onExpired();
  };

  return {
    emit: (topic, data) => postToMeeting(code, clientId, topic, data),
    on(topic, handler) {
      handlers.set(topic, [...(handlers.get(topic) ?? []), handler]);
    },
    onPeers: (listener) => peerListeners.push(listener),
    close: () => source.close(),
  };
}
