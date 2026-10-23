import { $ } from './utils.js';
import { FALLBACK_ICE_SERVERS, TOPICS } from './config.js';
import { clientId } from './state.js';
import { setHidden, toast } from './ui.js';

/**
 * Peer-to-peer voice/video using a WebRTC mesh. Signalling messages
 * (join, offer, answer, ice, leave) travel over the meeting channel.
 */
class CallManager {
  #stream = null;
  #peers = new Map();
  #channel = null;
  #iceServers = FALLBACK_ICE_SERVERS;

  constructor({ onStream, onRemove }) {
    this.onStream = onStream;
    this.onRemove = onRemove;
  }

  get isActive() { return this.#stream !== null; }
  get stream() { return this.#stream; }

  setIceServers(servers) { this.#iceServers = servers; }

  attach(channel) {
    this.#channel = channel;
    channel.on(TOPICS.signal, (message) => this.#handleSignal(message));
  }

  async start({ video }) {
    if (this.isActive) return;
    this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    this.onStream('self', this.#stream, true);
    this.#send({ type: 'join' });
  }

  end() {
    if (!this.isActive) return;
    this.#send({ type: 'leave' });
    this.#peers.forEach((pc) => pc.close());
    this.#peers.clear();
    this.#stream.getTracks().forEach((track) => track.stop());
    this.#stream = null;
  }

  toggleTrack(kind) {
    const track = (kind === 'audio' ? this.#stream?.getAudioTracks() : this.#stream?.getVideoTracks())?.[0];
    if (!track) return null;
    track.enabled = !track.enabled;
    return track.enabled;
  }

  #send(payload) {
    this.#channel?.emit(TOPICS.signal, { from: clientId, ...payload });
  }

  #connection(peerId) {
    if (this.#peers.has(peerId)) return this.#peers.get(peerId);
    const pc = new RTCPeerConnection({ iceServers: this.#iceServers });
    this.#peers.set(peerId, pc);
    this.#stream?.getTracks().forEach((track) => pc.addTrack(track, this.#stream));
    pc.onicecandidate = ({ candidate }) => candidate && this.#send({ type: 'ice', to: peerId, candidate });
    pc.ontrack = ({ streams }) => this.onStream(peerId, streams[0], false);
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) this.#drop(peerId);
    };
    return pc;
  }

  #drop(peerId) {
    this.#peers.get(peerId)?.close();
    this.#peers.delete(peerId);
    this.onRemove(peerId);
  }

  async #handleSignal(message) {
    if (!message || !this.isActive || message.from === clientId) return;
    if (message.to && message.to !== clientId) return;
    const peerId = message.from;
    try {
      switch (message.type) {
        case 'join': { // an existing participant offers to the newcomer
          const pc = this.#connection(peerId);
          await pc.setLocalDescription(await pc.createOffer());
          this.#send({ type: 'offer', to: peerId, sdp: pc.localDescription });
          break;
        }
        case 'offer': {
          const pc = this.#connection(peerId);
          await pc.setRemoteDescription(message.sdp);
          await pc.setLocalDescription(await pc.createAnswer());
          this.#send({ type: 'answer', to: peerId, sdp: pc.localDescription });
          break;
        }
        case 'answer':
          await this.#peers.get(peerId)?.setRemoteDescription(message.sdp);
          break;
        case 'ice':
          await this.#peers.get(peerId)?.addIceCandidate(message.candidate);
          break;
        case 'leave':
          this.#drop(peerId);
          break;
      }
    } catch {
      /* A failed negotiation is dropped; the peer can rejoin the call. */
    }
  }
}

/* ---- DOM bindings ---- */

const IDLE_BUTTONS = ['btn-video', 'btn-voice'];
const ACTIVE_BUTTONS = ['btn-mute', 'btn-end-call'];

function renderStream(id, stream, isSelf) {
  let video = document.getElementById(`video-${id}`);
  if (!video) {
    video = document.createElement('video');
    video.id = `video-${id}`;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = isSelf;
    $('video-grid').append(video);
  }
  video.srcObject = stream;
  setHidden($('call-empty'), true);
}

function removeStream(id) {
  document.getElementById(`video-${id}`)?.remove();
  if (!$('video-grid').children.length) setHidden($('call-empty'), false);
}

const manager = new CallManager({ onStream: renderStream, onRemove: removeStream });

function renderCallControls(inCall, hasVideo = false) {
  IDLE_BUTTONS.forEach((id) => setHidden($(id), inCall));
  ACTIVE_BUTTONS.forEach((id) => setHidden($(id), !inCall));
  setHidden($('btn-camera'), !inCall || !hasVideo);
  if (!inCall) {
    $('btn-mute').textContent = 'Mute';
    $('btn-camera').textContent = 'Camera off';
    $('video-grid').replaceChildren();
    setHidden($('call-empty'), false);
  }
}

async function startCall(video) {
  try {
    await manager.start({ video });
    renderCallControls(true, video);
  } catch {
    toast(`Couldn’t access your ${video ? 'camera or microphone' : 'microphone'}. Check browser permissions.`);
  }
}

export function endCall() {
  manager.end();
  renderCallControls(false);
}

export const attachCallChannel = (channel) => manager.attach(channel);
export const setIceServers = (servers) => manager.setIceServers(servers);

export function initCalls() {
  $('btn-video').addEventListener('click', () => startCall(true));
  $('btn-voice').addEventListener('click', () => startCall(false));
  $('btn-end-call').addEventListener('click', endCall);
  $('btn-mute').addEventListener('click', () => {
    const enabled = manager.toggleTrack('audio');
    if (enabled !== null) $('btn-mute').textContent = enabled ? 'Mute' : 'Unmute';
  });
  $('btn-camera').addEventListener('click', () => {
    const enabled = manager.toggleTrack('video');
    if (enabled !== null) $('btn-camera').textContent = enabled ? 'Camera off' : 'Camera on';
  });
}
