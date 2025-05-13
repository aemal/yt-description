// Background service worker for YouTube Description Generator

// Server configuration (can be changed if using ngrok)
const SERVER_BASE_URL = 'http://localhost:3040';

// Log when the background script loads
chrome.runtime.onInstalled.addListener(() => {
  console.log("YouTube Description Generator background service worker loaded!");
});

// Get base server URL (allows updating through storage)
async function getServerUrl() {
  const result = await chrome.storage.sync.get(['serverUrl']);
  return result.serverUrl || SERVER_BASE_URL;
}

// Set base server URL
async function setServerUrl(url) {
  await chrome.storage.sync.set({ serverUrl: url });
  return url;
}

// Function to fetch captions from our Node.js server
async function fetchCaptions(videoID, lang = 'en') {
  try {
    const serverUrl = await getServerUrl();
    const url = `${serverUrl}/api/captions/${videoID}?lang=${lang}`;
    
    console.log(`Fetching captions from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch captions');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching captions:', error);
    throw error;
  }
}

// Function to generate content using our Node.js server
async function generateContent(prompt, transcript) {
  try {
    const serverUrl = await getServerUrl();
    const url = `${serverUrl}/api/generate`;
    
    console.log(`Generating content using server at: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        transcript
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate content');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.type);
  
  if (message.type === "FETCH_CAPTIONS") {
    console.log("Fetching captions for:", message.videoID);
    
    fetchCaptions(message.videoID)
      .then(response => {
        console.log("Captions fetched successfully!");
        sendResponse({ success: true, subtitles: response.subtitles });
      })
      .catch(error => {
        console.error("Error fetching subtitles:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates async response
  }
  
  if (message.type === "GENERATE_CONTENT") {
    console.log("Generating content for transcript");
    
    generateContent(message.prompt, message.transcript)
      .then(response => {
        console.log("Content generated successfully!");
        sendResponse({ success: true, content: response.content });
      })
      .catch(error => {
        console.error("Error generating content:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates async response
  }
  
  if (message.type === "SET_SERVER_URL") {
    console.log("Setting server URL to:", message.url);
    
    setServerUrl(message.url)
      .then(url => {
        console.log("Server URL updated to:", url);
        sendResponse({ success: true, url });
      })
      .catch(error => {
        console.error("Error setting server URL:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates async response
  }
  
  if (message.type === "GET_SERVER_URL") {
    getServerUrl()
      .then(url => {
        sendResponse({ success: true, url });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates async response
  }
}); 