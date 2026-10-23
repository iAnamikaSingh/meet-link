# MeetLink

Meeting links with a passcode, auto-expiry (60 min default), admin-controlled expiry visibility,
group chat, image sharing, and video/voice calls. Node.js 18+, no npm packages needed.

## Run locally
    node server.js          # (ES modules: serve over http, not by opening the file) then open http://localhost:3000

## Deploy
Use any host that runs Node.js (VPS, Hostinger Node.js/VPS plan, Render, Railway, Fly.io).
1. Upload this folder, set the start command to `node server.js`.
2. Serve it over HTTPS. Browsers only allow camera and microphone on HTTPS (or localhost).
3. Optional: set PORT if your host needs it.

## Calls on strict networks (TURN)
Calls use a free public STUN server by default. For reliable calls behind strict firewalls, add a TURN
service (Twilio, Metered, coturn) and set this environment variable:
    ICE_SERVERS='[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:YOUR_HOST:3478","username":"USER","credential":"PASS"}]'

## SEO checklist
- In public/index.html replace `https://YOUR-DOMAIN/` in the canonical tag.
- Add your sitemap URL to public/robots.txt.
- Routes use hash links (#create, #join ...). For separate indexable URLs, move each section into its own page.

## Project structure
    server.js                 HTTP server, REST API and Server-Sent Events relay (no dependencies)
    public/
      index.html              Markup and SEO metadata only
      robots.txt
      css/styles.css          Design tokens, base, components, room, utilities
      js/
        main.js               Entry point: wires modules and starts the router
        config.js             Constants, page titles and descriptions
        router.js             Hash router (#create, #join, #<passcode> ...)
        meeting.js            Create, join, lobby and room lifecycle
        chat.js               Chat, image sharing and people list
        calls.js              WebRTC call manager and call controls
        realtime.js           Live channel to the server (SSE + POST)
        api.js                REST calls
        state.js              Session state
        ui.js                 Views, toasts, page metadata
        utils.js              Small shared helpers

## How it works
- Server keeps meetings in memory: expiry and "who sees expiry" are enforced on the server. Guests never
  receive the expiry time when the admin hides it. Restarting the server ends all meetings.
- Live chat, images and call setup use Server-Sent Events plus POST (works through most proxies).
- Video and voice are peer-to-peer (WebRTC mesh), best for about 4 to 6 people.

## Before real production use
Add rate limiting on /api/create, and consider a reverse proxy (nginx/Caddy) with HTTPS.
