# YouTube Description Chrome Extension

**YouTube Description** is an open-source Chrome extension designed for busy YouTubers. It generates YouTube video titles and descriptions with a single click, leveraging OpenAI's API and your video's transcript.

---

## Features

- **One-click title & description generation**  
  Automatically fills in your video's title and description fields in YouTube Studio.
- **OpenAI integration**  
  Uses your custom prompt and API key for tailored results.
- **Transcript-based**  
  Generates content based on your video's actual transcript for accuracy and SEO.

---

## How It Works

1. **Install the extension** and set your OpenAI API key and prompt.
2. **Open YouTube Studio** and navigate to your video's details page.
3. **Click the extension icon**—the title and description fields will be filled automatically, based on your video's transcript.

---

## Demo

*The extension in action: auto-filling the title and description fields in YouTube Studio.*

---

## Sample Code: Fetching YouTube Video Transcript

This extension uses the [youtube-captions-scraper](https://www.npmjs.com/package/youtube-captions-scraper) to fetch video transcripts:

```js
const fs = require('fs');
const { getSubtitles } = require('youtube-captions-scraper');

async function fetchTranscript(videoId) {
    try {
        // Fetch transcript using youtube-captions-scraper
        const subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });
        return subtitles; // Return the subtitles object
    } catch (error) {
        console.error('Failed to fetch subtitles:', error);
        throw error; // Re-throw the error for handling in the caller function
    }
}

async function saveTranscriptToFile(videoId) {
    try {
        const subtitles = await fetchTranscript(videoId); // Fetch subtitles
        const jsonContent = JSON.stringify(subtitles, null, 2); // Convert to formatted JSON string
        fs.writeFileSync('transcript.json', jsonContent); // Write to transcript.json file
        console.log('Transcript saved successfully!');
    } catch (error) {
        console.error('Failed to save transcript to file:', error);
    }
}

// Usage example: Replace 'VIDEO_ID' with the actual YouTube video ID
saveTranscriptToFile('QXBmdsWFglE');
```

---

## DOM Selectors for Robust Automation

To ensure your extension works reliably for all videos (without dynamic IDs), use the following selectors:

### Title Field

```js
document.querySelector('.input-container.title ytcp-social-suggestions-textbox[required] [contenteditable="true"]')
```
- **Explanation:**  
  Selects the editable title field inside the YouTube Studio video details page.  
  - `.input-container.title` ensures you're in the title section.
  - `ytcp-social-suggestions-textbox[required]` targets the required title input.
  - `[contenteditable="true"]` is the actual editable div.

### Description Field

```js
document.querySelector('.input-container.description ytcp-social-suggestions-textbox:not([required]) [contenteditable="true"]')
```
- **Explanation:**  
  Selects the editable description field.  
  - `.input-container.description` ensures you're in the description section.
  - `ytcp-social-suggestions-textbox:not([required])` targets the description input (not required).
  - `[contenteditable="true"]` is the editable div.

### Video ID Extraction

```js
document.querySelector('.row .label + .value a').href
```
- **Explanation:**  
  Selects the anchor tag containing the video link (e.g., `https://youtu.be/VIDEO_ID`).  
  - `.row .label + .value a` finds the link next to the "Video link" label.

---

## Notes

- **No dynamic IDs:** All selectors use class names and attributes that are stable across uploads.
- **Image demo:** Place your screenshot as `demo.png` in the root directory for the demo section.

---

## License

MIT 