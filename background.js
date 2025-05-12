// Mock implementation that doesn't rely on youtube-captions-scraper

// Log when the background script loads
chrome.runtime.onInstalled.addListener(() => {
  console.log("YouTube Description Generator background service worker loaded!");
});

// Mock getSubtitles function
function mockGetSubtitles(videoID) {
  console.log(`Mocking subtitles for video: ${videoID}`);
  
  // Return a promise with mock subtitles
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { start: 0, dur: 2, text: "Hello, this is a mock transcript." },
        { start: 2, dur: 3, text: "We're using this for testing the extension." },
        { start: 5, dur: 4, text: "In a real scenario, we would fetch real captions from YouTube." },
        { start: 9, dur: 3, text: "But for now, this mock data will help us test the UI flow." }
      ]);
    }, 500); // Simulate network delay
  });
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_CAPTIONS") {
    console.log("Received request to fetch captions for:", message.videoID);
    
    // Use our mock function instead of the real getSubtitles
    mockGetSubtitles(message.videoID)
      .then(subtitles => {
        console.log("Mock subtitles generated:", subtitles);
        sendResponse({ success: true, subtitles });
      })
      .catch(error => {
        console.error("Error in mock subtitles:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates async response
  }
}); 