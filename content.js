// Extract video ID from the current YouTube URL
const videoID = new URLSearchParams(window.location.search).get("v");

// Send a message to the background service worker to fetch captions
chrome.runtime.sendMessage({ type: "FETCH_CAPTIONS", videoID }, response => {
  if (response.success) {
    console.log("Received subtitles:", response.subtitles);
    // Here you can process the subtitles further or update the UI
  } else {
    console.error("Failed to fetch subtitles:", response.error);
  }
}); 