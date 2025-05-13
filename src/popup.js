// Get DOM elements
const promptTextarea = document.getElementById('prompt');
const savePromptButton = document.getElementById('save-prompt');
const generateButton = document.getElementById('generate-button');
const transcriptDiv = document.getElementById('transcript');
const statusMessage = document.getElementById('status-message');
const serverUrlInput = document.getElementById('server-url'); 
const saveServerUrlButton = document.getElementById('save-server-url');

// Generated content elements
const generatedContentSection = document.getElementById('generated-content');
const generatedTitleElement = document.getElementById('generated-title');
const generatedDescriptionElement = document.getElementById('generated-description');
const copyTitleButton = document.getElementById('copy-title');
const copyDescriptionButton = document.getElementById('copy-description');
const applyToYouTubeButton = document.getElementById('apply-to-youtube');

// Keep track of generated content
let currentGeneratedContent = {
  title: '',
  description: ''
};

// Default prompt
const DEFAULT_PROMPT = "Generate a YouTube title and description based on the following transcript. Title should be catchy and SEO-friendly. Description should summarize key points, include timestamps for major sections, and ask viewers to like and subscribe. My name is spelled as Aemal Sayer. The technologies I mention and use in my videos include n8n and Vapi. Don't give timestamps, just generate a general information about the current lecture and keep the first part as general information about this crash course called 'Build your own voice ai agent using n8n, vapi and some vibe coding'. Don't mention 'Aemal Sayer' teaches you... don't use the 3rd person, write it from my perspective. Please add hashtags and CTA to comment, subscribe and share for better SEO and reach.";

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

// Get config from server
async function getServerConfig() {
  try {
    const serverUrl = await getServerUrl();
    const response = await fetch(`${serverUrl}/api/config`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch config from server');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching server config:', error);
    return { 
      success: false, 
      config: { 
        hasApiKey: false, 
        defaultPrompt: DEFAULT_PROMPT 
      } 
    };
  }
}

// Update config on server
async function updateServerConfig(config) {
  try {
    const serverUrl = await getServerUrl();
    const response = await fetch(`${serverUrl}/api/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update config on server');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating server config:', error);
    return { success: false, error: error.message };
  }
}

// Save generated content to localStorage
function saveGeneratedContent(content) {
  try {
    localStorage.setItem('generatedContent', content);
    localStorage.setItem('generatedContentTimestamp', Date.now().toString());
    console.log('Content saved to localStorage:', content);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Load generated content from localStorage
function loadGeneratedContent() {
  try {
    const content = localStorage.getItem('generatedContent');
    console.log('Content loaded from localStorage:', content);
    return content;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
}

// Load saved settings
async function loadSettings() {
  // Load stored prompt from browser storage
  chrome.storage.sync.get(['prompt'], (result) => {
    if (result.prompt) {
      promptTextarea.value = result.prompt;
    } else {
      // Use default
      promptTextarea.value = DEFAULT_PROMPT;
    }
  });
  
  // Load server URL from background
  const serverUrl = await getServerUrl();
  if (serverUrlInput) {
    serverUrlInput.value = serverUrl;
  }
  
  // Try to load config from server
  try {
    const configResponse = await getServerConfig();
    if (configResponse.success) {
      // Update UI based on server config
      if (configResponse.config.defaultPrompt && !promptTextarea.value) {
        promptTextarea.value = configResponse.config.defaultPrompt;
      }
    }
  } catch (error) {
    console.error('Error loading server config:', error);
  }
  
  // Load previously generated content from localStorage
  const savedContent = loadGeneratedContent();
  if (savedContent) {
    console.log('Restoring previously generated content');
    updateGeneratedContent(savedContent);
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

// Save prompt on server and locally
async function savePrompt(prompt) {
  // Save locally
  chrome.storage.sync.set({ prompt });
  
  // Also save on server as default prompt
  const result = await updateServerConfig({ defaultPrompt: prompt });
  return result;
}

// Save prompt
savePromptButton.addEventListener('click', async () => {
  const prompt = promptTextarea.value.trim();
  if (prompt) {
    const result = await savePrompt(prompt);
    if (result.success) {
      showStatus('Prompt saved successfully!', 'success');
    } else {
      showStatus(`Error saving prompt: ${result.error}`, 'error');
    }
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
        // Reload config from new server
        await loadSettings();
      } else {
        showStatus(`Error saving server URL: ${response.error}`, 'error');
      }
    } else {
      showStatus('Please enter a valid server URL', 'error');
    }
  });
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

// Handle copy button clicks
copyTitleButton.addEventListener('click', async () => {
  const success = await copyToClipboard(currentGeneratedContent.title);
  if (success) {
    copyTitleButton.textContent = 'Copied!';
    copyTitleButton.classList.add('copy-success');
    setTimeout(() => {
      copyTitleButton.textContent = 'Copy';
      copyTitleButton.classList.remove('copy-success');
    }, 2000);
  } else {
    showStatus('Failed to copy text', 'error');
  }
});

copyDescriptionButton.addEventListener('click', async () => {
  const success = await copyToClipboard(currentGeneratedContent.description);
  if (success) {
    copyDescriptionButton.textContent = 'Copied!';
    copyDescriptionButton.classList.add('copy-success');
    setTimeout(() => {
      copyDescriptionButton.textContent = 'Copy';
      copyDescriptionButton.classList.remove('copy-success');
    }, 2000);
  } else {
    showStatus('Failed to copy text', 'error');
  }
});

// Apply to YouTube button
applyToYouTubeButton.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { 
      type: 'FILL_YOUTUBE_FORM', 
      content: `Title: ${currentGeneratedContent.title}\n\nDescription: ${currentGeneratedContent.description}` 
    });
    
    showStatus('Content applied to YouTube form!', 'success');
  } catch (error) {
    showStatus(`Error applying to YouTube: ${error.message}`, 'error');
  }
});

// Parse generated content to extract title and description
function parseGeneratedContent(content) {
  let title = '';
  let description = '';
  
  if (content.includes('Title:') && content.includes('Description:')) {
    const titleMatch = content.match(/Title:(.*?)(?=Description:|$)/s);
    const descriptionMatch = content.match(/Description:(.*?)$/s);
    
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    if (descriptionMatch && descriptionMatch[1]) {
      description = descriptionMatch[1].trim();
    }
  } else {
    // If content doesn't have the expected format,
    // assume first line is title and rest is description
    const lines = content.split('\n');
    title = lines[0].trim();
    description = lines.slice(1).join('\n').trim();
  }
  
  return { title, description };
}

// Update the generated content section
function updateGeneratedContent(content) {
  const { title, description } = parseGeneratedContent(content);
  
  // Store current content
  currentGeneratedContent = { title, description };
  
  // Save to localStorage for persistence
  saveGeneratedContent(content);
  
  // Update UI
  generatedTitleElement.textContent = title;
  generatedDescriptionElement.textContent = description;
  
  // Show the section
  generatedContentSection.style.display = 'block';
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
    
    // Check if we're on YouTube Studio
    if (url.hostname === 'studio.youtube.com') {
      const match = url.pathname.match(/\/video\/([^\/]+)/);
      if (match && match[1]) {
        return match[1];
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
async function generateDescription(transcript, promptText) {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'GENERATE_CONTENT', 
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
  console.log('DOM content loaded, initializing popup');
  await loadSettings();
  
  try {
    const videoId = await getCurrentTabVideoId();
    console.log('Current video ID:', videoId);
    
    if (videoId) {
      // Track current video ID in localStorage
      localStorage.setItem('lastVideoId', videoId);
      
      // Fetch transcript
      fetchTranscript(videoId);
    } else {
      transcriptDiv.textContent = 'No YouTube video detected. Open a YouTube video to use this extension.';
      generateButton.disabled = true;
      applyToYouTubeButton.disabled = true;
    }
  } catch (error) {
    console.error('Error during initialization:', error);
    transcriptDiv.textContent = `Error: ${error.message}`;
    generateButton.disabled = true;
    applyToYouTubeButton.disabled = true;
  }
});

// Generate description button
generateButton.addEventListener('click', async () => {
  try {
    // Get prompt from textarea or use default
    const promptText = promptTextarea.value.trim() || DEFAULT_PROMPT;
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
    const generatedContent = await generateDescription(transcript, promptText);
    console.log('Generated content:', generatedContent);
    
    // Update UI with generated content
    updateGeneratedContent(generatedContent);
    
    showStatus('Content generated successfully!', 'success');
  } catch (error) {
    console.error('Generation error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    generateButton.disabled = false;
  }
}); 