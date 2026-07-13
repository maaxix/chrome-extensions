create Chrome Extension (Manifest V3) that captures media/video URLs and lets the user enable/disable capturing, you'll want a combination of Chrome APIs, a service worker, and a popup or separate UI.

Core Features
1. Enable/Disable Capture
Global ON/OFF toggle
Per-tab enable/disable
Remember state between browser restarts


1- To make it fit your needs, I need answers to these design decisions:

1- Chrome compatibility: Chrome only

2- Detection method: chrome.webRequest + content script (recommended)

3- Streaming support : Capture  playlist URLs (.m3u8, .mpd, .mp4) and media type in response type
add option to allow  capture every .ts/segment request (be defalt is false)

4- Storage
Session only (cleared on browser exit)

5- UI: Both (recommended) Dedicated popup window and side panel


6- Export format txt,




Modern HTML/CSS/JavaScript 
Clean modular architecture.
No external frameworks 