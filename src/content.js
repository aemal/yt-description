// Content script that runs on YouTube pages

// Extract video ID from the current YouTube URL
function getYoutubeVideoId() {
  const url = new URL(window.location.href);
  
  if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v');
    }
  }
  
  return null;
}

// Fill YouTube title and description fields in YouTube Studio
function fillYouTubeForm(content) {
  try {
    // Parse content into title and description
    // Expected format: "Title: xxx\n\nDescription: yyy"
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
    
    console.log('Filling in title:', title);
    console.log('Filling in description:', description);
    
    // Fill in the title field
    const titleField = document.querySelector('.input-container.title ytcp-social-suggestions-textbox[required] [contenteditable="true"]');
    if (titleField) {
      titleField.textContent = title;
      // Dispatch input event to trigger YouTube's validation
      titleField.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('Title filled successfully');
    } else {
      console.error('Title field not found');
    }
    
    // Fill in the description field
    const descriptionField = document.querySelector('.input-container.description ytcp-social-suggestions-textbox:not([required]) [contenteditable="true"]');
    if (descriptionField) {
      descriptionField.textContent = description;
      // Dispatch input event to trigger YouTube's validation
      descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('Description filled successfully');
    } else {
      console.error('Description field not found');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error filling YouTube form:', error);
    return { success: false, error: error.message };
  }
}

// Wait for page to be fully loaded
window.addEventListener('load', () => {
  console.log('YouTube Description Generator content script loaded');
  
  const videoId = getYoutubeVideoId();
  if (videoId) {
    console.log('Detected YouTube video ID:', videoId);
  }
});

// Listen for messages from the popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.type === 'GET_VIDEO_ID') {
    const videoId = getYoutubeVideoId();
    sendResponse({ videoId });
  }
  else if (message.type === 'FILL_YOUTUBE_FORM') {
    const result = fillYouTubeForm(message.content);
    sendResponse(result);
  }
  return true;
}); 