import { PAGE_VIEWS } from './config.js';
import { parsePasscode } from './utils.js';
import { session } from './state.js';
import { showView } from './ui.js';
import { leaveRoom, renderLobby } from './meeting.js';

/**
 * Hash router. Maps the URL fragment to a view:
 *   #home | #create | #join | #how-it-works | #faq  -> public pages
 *   #<11-character passcode>                         -> lobby, or the room once joined
 */
export function route() {
  const hash = location.hash.slice(1);
  const code = parsePasscode(hash);

  if (session.active && code !== session.code) leaveRoom();

  let view = 'home';
  if (code) view = session.active && code === session.code ? 'room' : 'lobby';
  else if (PAGE_VIEWS.includes(hash)) view = hash;

  showView(view);
  if (view === 'lobby') renderLobby(code);
  if (view === 'join') document.getElementById('join-code').focus();
}
