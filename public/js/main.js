import { fetchIceServers } from './api.js';
import { initCalls, setIceServers } from './calls.js';
import { initChat } from './chat.js';
import { initMeeting } from './meeting.js';
import { route } from './router.js';

function bootstrap() {
  initChat();
  initCalls();
  initMeeting({ onRouteChange: route });

  window.addEventListener('hashchange', route);
  route();

  // Non-blocking: calls fall back to a public STUN server until this resolves.
  fetchIceServers().then(setIceServers);
}

bootstrap();
