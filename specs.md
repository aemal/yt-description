# Using `youtube-captions-scraper` in a Chrome Extension

## Overview

This document explains how to use the open-source [`youtube-captions-scraper`](https://github.com/algolia/youtube-captions-scraper) library inside a Chrome extension. The library allows you to fetch either user-submitted or auto-generated YouTube captions (subtitles) by video ID.

However, because Chrome extensions run in a restricted browser environment with CORS and JavaScript module limitations, there are key considerations and steps to make the integration successful.

---

## Core Challenges

### 1. CORS Restrictions

YouTube's caption URLs (e.g., `https://www.youtube.com/api/timedtext?...`) may be blocked by the browser due to Cross-Origin Resource Sharing (CORS) policies when requested from content scripts.

#### Solutions:

* Perform the caption fetch in a **background script** (service worker) instead of a content script.
* Add the appropriate permissions in your `manifest.json`:

```json
"permissions": [
  "https://www.youtube.com/*",
  "storage"
]
```

### 2. Node-style Code Compatibility

The `youtube-captions-scraper` uses CommonJS (`require`) and may rely on Node.js modules, which do not run natively in the browser.

#### Solution:

* Bundle the library using a bundler like **Vite**, **esbuild**, or **Webpack**, configured for a `web` target.
* Convert `require()` statements to `import` syntax or let the bundler handle it.

### 3. Manifest V3 Constraints

Chrome Extensions using **Manifest V3** use service workers instead of persistent background pages, and scripts must be modular.

#### Solution:

* Use ES Modules (`type: module`) in `manifest.json`.
* Place `getSubtitles` logic inside the background service worker.
* Communicate between content scripts and background service worker via message passing.

---

## Extension Architecture

### Content Script

* Extracts the `videoID` from the YouTube URL.
* Sends a message to the background script to fetch subtitles.

### Background Service Worker

* Imports `getSubtitles` (after bundling).
* Fetches the subtitles and sends the result back.

### Popup or UI

* Optionally display subtitles in a popup or inject into the DOM.

---

## Example: Message Passing Between Scripts

### Content Script (content.js)

```js
const videoID = new URLSearchParams(window.location.search).get("v");

chrome.runtime.sendMessage({ type: "FETCH_CAPTIONS", videoID });
```

### Background Script (background.js)

```js
import { getSubtitles } from './bundle/youtube-captions-scraper.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_CAPTIONS") {
    getSubtitles({ videoID: message.videoID, lang: "en" })
      .then(subtitles => {
        console.log("Subtitles:", subtitles);
        // Optionally send back to content script
      })
      .catch(console.error);
  }
});
```

---

## Alternative: Manual Fetch Without Library

If bundling the scraper is problematic, you can replicate its functionality manually:

```js
const url = `https://www.youtube.com/api/timedtext?lang=en&v=${videoID}`;
fetch(url)
  .then(res => res.text())
  .then(xml => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const texts = Array.from(doc.getElementsByTagName("text")).map(el => ({
      start: parseFloat(el.getAttribute("start")),
      dur: parseFloat(el.getAttribute("dur")),
      text: el.textContent
    }));
    console.log(texts);
  });
```

---

## Summary

✅ `youtube-captions-scraper` can be used inside a Chrome extension, but requires:

* Proper CORS handling via background scripts.
* Bundling the CommonJS module for browser compatibility.
* Using Manifest V3 service worker architecture with message passing.

Alternatively, the same functionality can be achieved using a simple `fetch()` to YouTube's subtitle API.

---

## Next Steps

* Set up your extension scaffold with `manifest.json`, content script, and service worker.
* Use Vite or esbuild to bundle the scraper into a browser-compatible ES Module.
* Test fetch permissions and CORS behavior.
* Add error handling and UI integration for production use.
