# Media URL Capturer (Chrome Extension, Manifest V3)

Captures streaming/media URLs (HLS `.m3u8`, DASH `.mpd`, MP4, WebM, audio, and
optionally raw `.ts`/`.m4s` segments) as you browse, with global and per-tab
on/off control, a popup, a full side panel, and TXT export.

## Install (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `media-url-capturer` folder (the one containing `manifest.json`)
5. Pin the extension for quick access (puzzle-piece icon → pin)

No build step, no dependencies — plain HTML/CSS/JS, Manifest V3.

## How it works

- **Network capture** — `chrome.webRequest` (`onBeforeRequest` +
  `onHeadersReceived`, observational only, non-blocking) inspects every
  request's URL and, when needed, its response `Content-Type` to classify
  it as media.
- **DOM capture** — a lightweight content script watches `<video>`,
  `<audio>`, `<source>`, and `<track>` elements (including ones added later
  by JS players) and reports their `src`/`currentSrc`/`poster` as a
  fallback/complement to network capture. This also catches `blob:` object
  URLs used by MSE-based players (the real underlying segment requests are
  still captured at the network level).
- Every found URL is **deduplicated per tab** and capped at 1500 entries per
  tab (oldest entries drop off) to keep memory/storage bounded.

## Enable / disable

- **Global switch** (popup or side panel top bar) — master on/off.
- **Per-tab switch** (popup, or the tab pills in the side panel) — turn
  capture on/off for just the current tab; new tabs inherit the global
  state.
- Both states are checked before anything is stored, so disabling a tab
  stops noise immediately without losing anything already captured.
- The global and "capture segments" toggle values persist across browser
  restarts (`chrome.storage.local`). The per-tab list itself and per-tab
  enabled flags use `chrome.storage.session`, so **captured data is cleared
  automatically when the browser exits** (matches the "session only"
  storage requirement) but survives service-worker restarts within the same
  browsing session.

## Segment capture (`.ts` / `.m4s`)

Off by default — HLS/DASH streams can generate hundreds of segment
requests per minute. Flip **"Capture .ts / segment requests"** in the
popup or side panel to include them. Playlists/manifests (`.m3u8`, `.mpd`)
are always captured regardless of this setting.

## UI

- **Popup** — quick glance: global + current-tab toggle, item count,
  "Open side panel" button, export/clear for the current tab.
- **Side panel** — the full tool: scope selector (current tab / all tabs /
  any specific tab), live search, type filter chips, a strip of per-tab
  enable toggles with live counts, and export/clear scoped to whatever
  you're currently viewing.

## Export

Click **Export .txt** in either UI. The file is a plain-text list, one URL
per line, each preceded by a `#` comment line with metadata (type, method,
HTTP status, source, tab, timestamp) — easy to skim or to feed into
`grep`/`ffmpeg`/`yt-dlp` pipelines.

## File structure

```
manifest.json
background.js            service worker: capture, state, messaging
content-script.js        DOM media-element scanner
shared/
  constants.js            message types, defaults, labels
  mediaClassifier.js       URL/content-type -> media type
  storage.js               chrome.storage.local/session helpers
  export.js                TXT export builder + download helper
popup/
  popup.html / .css / .js
sidepanel/
  sidepanel.html / .css / .js
icons/
  icon16.png icon32.png icon48.png icon128.png
```

## Permissions used

| Permission | Why |
|---|---|
| `webRequest` | Observe request URLs/response headers to detect media (no blocking, no `webRequestBlocking`) |
| `webNavigation` | Clear a tab's list on fresh top-level navigation (optional, toggle-able) |
| `storage` | Persist settings (`local`) and captured data (`session`) |
| `tabs` | Read tab titles/URLs for the tab list, open the side panel for the active tab |
| `scripting` | Inject the content script into already-open tabs right after install |
| `sidePanel` | Register and open the side panel UI |
| `host_permissions: <all_urls>` | Needed so `webRequest` can see media requests on any site |

## Notes / limitations

- Cross-origin responses fetched in `no-cors` mode are "opaque" to the
  browser — their `Content-Type` isn't visible even to `webRequest`. URL
  extension matching (`.m3u8`, `.mpd`, `.mp4`, …) still catches the vast
  majority of real-world streaming URLs in that case.
- `blob:` URLs shown in the list represent an in-page `<video>` source and
  aren't independently fetchable; enable segment capture to also grab the
  real network-level chunks feeding that player.
