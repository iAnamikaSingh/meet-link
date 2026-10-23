import { $ } from './utils.js';
import { DATA_URL_IMAGE_PATTERN, IMAGE, MAX_NAME_LENGTH, TOPICS } from './config.js';
import { session } from './state.js';

const log = () => $('chat-log');

function scrollToLatest() {
  log().scrollTop = log().scrollHeight;
}

export function postSystemMessage(text) {
  const row = document.createElement('div');
  row.className = 'message--system';
  row.textContent = text;
  log().append(row);
  scrollToLatest();
}

/** Renders one chat bubble. All user content is inserted as text, never HTML. */
function renderMessage({ author, text, image, own }) {
  const bubble = document.createElement('div');
  bubble.className = own ? 'message message--own' : 'message';

  const label = document.createElement('b');
  label.textContent = own ? 'You' : author;
  bubble.append(label);

  if (text) {
    const body = document.createElement('span');
    body.textContent = text;
    bubble.append(body);
  }
  if (image && DATA_URL_IMAGE_PATTERN.test(image)) {
    const img = document.createElement('img');
    img.src = image;
    img.alt = `Image shared by ${author}`;
    bubble.append(img);
  }
  log().append(bubble);
  scrollToLatest();
}

function sendMessage({ text = '', image = '' }) {
  renderMessage({ author: session.name, text, image, own: true });
  session.channel?.emit(TOPICS.chat, { name: session.name, text, image });
}

/** Scales an image down and re-encodes it so it stays small enough to relay. */
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, IMAGE.maxEdgePx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(IMAGE.mime, IMAGE.quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unreadable image')); };
    img.src = url;
  });
}

function renderPeers(peers) {
  $('people-count').textContent = `👥 ${peers.length}`;
  const list = $('people-list');
  list.replaceChildren(...peers.map(({ name, isSelf }) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = `${String(name || 'Guest').slice(0, MAX_NAME_LENGTH)}${isSelf ? ' (you)' : ''}`;
    return pill;
  }));
}

/** Subscribes the chat panel to a live channel. */
export function bindChatChannel(channel) {
  channel.on(TOPICS.chat, (data) => {
    if (!data) return;
    renderMessage({
      author: String(data.name || 'Guest').slice(0, MAX_NAME_LENGTH),
      text: String(data.text || '').slice(0, 500),
      image: data.image,
    });
  });
  channel.onPeers(({ peers, joined, left }) => {
    renderPeers(peers);
    joined.forEach((p) => postSystemMessage(`${p.name || 'Someone'} joined`));
    left.forEach((p) => postSystemMessage(`${p.name || 'Someone'} left`));
  });
}

export function resetChat() {
  log().replaceChildren();
  $('people-list').replaceChildren();
}

/** Wires static DOM controls once at startup. */
export function initChat() {
  const input = $('chat-input');
  const submit = () => {
    const text = input.value.trim();
    if (!text) return;
    sendMessage({ text });
    input.value = '';
  };
  $('chat-send').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  $('chat-image-btn').addEventListener('click', () => $('chat-image-input').click());
  $('chat-image-input').addEventListener('change', async (e) => {
    const [file] = e.target.files;
    e.target.value = '';
    if (!file?.type.startsWith('image/')) return;
    try {
      sendMessage({ image: await shrinkImage(file) });
    } catch {
      postSystemMessage('That image could not be read.');
    }
  });
}
