// Get DOM elements
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyButton = document.getElementById('save-api-key');
const promptTextarea = document.getElementById('prompt');
const savePromptButton = document.getElementById('save-prompt');
const generateButton = document.getElementById('generate-button');
const transcriptDiv = document.getElementById('transcript');
const statusMessage = document.getElementById('status-message');
const serverUrlInput = document.getElementById('server-url'); 
const saveServerUrlButton = document.getElementById('save-server-url');

// Default prompt
const DEFAULT_PROMPT = 'Generate a YouTube title and description based on the following transcript. Title should be catchy and SEO-friendly. Description should summarize key points, include timestamps for major sections, and ask viewers to like and subscribe.';

// Get server URL from background script
async function getServerUrl() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SERVER_URL' }, response => {
      if (response.success) {
        resolve(response.url);
      } else {
        resolve('http://localhost:3040');
      }
    });
  });
}

// Load saved settings
async function loadSettings() {
  // Load API key and prompt from storage
  chrome.storage.sync.get(['apiKey', 'prompt'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.prompt) {
      promptTextarea.value = result.prompt;
    } else {
      promptTextarea.value = DEFAULT_PROMPT;
    }
  });
  
  // Load server URL from background
  const serverUrl = await getServerUrl();
  if (serverUrlInput) {
    serverUrlInput.value = serverUrl;
  }
}

// Save server URL
async function saveServerUrl(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SET_SERVER_URL', url }, response => {
      resolve(response);
    });
  });
}

// Save API key
saveApiKeyButton.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    chrome.storage.sync.set({ apiKey }, () => {
      showStatus('API key saved successfully!', 'success');
    });
  } else {
    showStatus('Please enter a valid API key', 'error');
  }
});

// Save prompt
savePromptButton.addEventListener('click', () => {
  const prompt = promptTextarea.value.trim();
  if (prompt) {
    chrome.storage.sync.set({ prompt }, () => {
      showStatus('Prompt saved successfully!', 'success');
    });
  } else {
    showStatus('Please enter a valid prompt', 'error');
  }
});

// Save server URL button event listener
if (saveServerUrlButton) {
  saveServerUrlButton.addEventListener('click', async () => {
    const url = serverUrlInput.value.trim();
    if (url) {
      const response = await saveServerUrl(url);
      if (response.success) {
        showStatus('Server URL saved successfully!', 'success');
      } else {
        showStatus(`Error saving server URL: ${response.error}`, 'error');
      }
    } else {
      showStatus('Please enter a valid server URL', 'error');
    }
  });
}

// Show status message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = type;
  
  // Clear after 3 seconds
  setTimeout(() => {
    statusMessage.textContent = '';
    statusMessage.className = '';
  }, 3000);
}

// Get video ID from active tab
async function getCurrentTabVideoId() {
  try {
    // Try to get video ID from the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;
    
    // Check if we're on YouTube
    const url = new URL(tab.url);
    if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
      if (url.pathname === '/watch') {
        return url.searchParams.get('v');
      }
    }
    
    // If we couldn't get it directly, ask the content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_ID' });
    return response?.videoId || null;
  } catch (error) {
    console.error('Error getting video ID:', error);
    return null;
  }
}

// Fetch transcript for a video
async function fetchTranscript(videoId) {
  transcriptDiv.textContent = `Loading transcript for video ID: ${videoId}...`;
  
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'FETCH_CAPTIONS', videoID: videoId }, resolve);
    });
    
    if (response.success) {
      // Format transcript for display
      const formattedTranscript = response.subtitles
        .map(item => `[${formatTime(item.start)}] ${item.text}`)
        .join('\n');
      
      transcriptDiv.textContent = formattedTranscript;
      return response.subtitles;
    } else {
      transcriptDiv.textContent = `Error: ${response.error || 'Failed to fetch transcript'}`;
      return null;
    }
  } catch (error) {
    transcriptDiv.textContent = `Error: ${error.message || 'Failed to fetch transcript'}`;
    return null;
  }
}

// Format time (seconds) to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate title and description using server API
async function generateDescription(transcript, apiKey, promptText) {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'GENERATE_CONTENT', 
        apiKey,
        prompt: promptText,
        transcript
      }, resolve);
    });
    
    if (response.success) {
      return response.content;
    } else {
      throw new Error(response.error || 'Failed to generate content');
    }
  } catch (error) {
    console.error('Error generating description:', error);
    throw error;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  
  try {
    const videoId = await getCurrentTabVideoId();
    
    if (videoId) {
      // Fetch transcript
      fetchTranscript(videoId);
    } else {
      transcriptDiv.textContent = 'No YouTube video detected. Open a YouTube video to use this extension.';
      generateButton.disabled = true;
    }
  } catch (error) {
    transcriptDiv.textContent = `Error: ${error.message}`;
    generateButton.disabled = true;
  }
});

// Generate description button
generateButton.addEventListener('click', async () => {
  try {
    // Get settings
    const { apiKey, prompt } = await chrome.storage.sync.get(['apiKey', 'prompt']);
    
    if (!apiKey) {
      showStatus('Please enter your OpenAI API key first', 'error');
      return;
    }
    
    const promptText = prompt || DEFAULT_PROMPT;
    const videoId = await getCurrentTabVideoId();
    
    if (!videoId) {
      showStatus('No YouTube video detected', 'error');
      return;
    }
    
    // Show loading
    showStatus('Generating description...', 'info');
    generateButton.disabled = true;
    
    // Get transcript if not already loaded
    let transcript;
    if (transcriptDiv.textContent.includes('Loading') || transcriptDiv.textContent.includes('Error')) {
      transcript = await fetchTranscript(videoId);
    } else {
      // Get from background script
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'FETCH_CAPTIONS', videoID: videoId }, resolve);
      });
      transcript = response.success ? response.subtitles : null;
    }
    
    if (!transcript) {
      showStatus('Failed to get transcript', 'error');
      generateButton.disabled = false;
      return;
    }
    
    // Generate description
    const generatedContent = await generateDescription(transcript, apiKey, promptText);
    
    // Now need to inject this into YouTube
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { 
      type: 'FILL_YOUTUBE_FORM', 
      content: generatedContent 
    });
    
    showStatus('Description generated and inserted!', 'success');
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    generateButton.disabled = false;
  }
}); 