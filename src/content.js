// Content script that runs on YouTube pages
console.log('YouTube Description Generator content script loading on: ' + window.location.href);

// Extract video ID from the current YouTube URL
function getYoutubeVideoId() {
  const url = new URL(window.location.href);
  
  if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v');
    }
  }
  
  // Add support for YouTube Studio URLs
  if (url.hostname === 'studio.youtube.com') {
    const match = url.pathname.match(/\/video\/([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Debug function to identify title input
function debugYouTubeStudio() {
  console.log('DEBUG: Running YouTube Studio debug checks');
  
  // List all elements with contenteditable="true"
  const editableElements = document.querySelectorAll('[contenteditable="true"]');
  console.log('DEBUG: Found ' + editableElements.length + ' contenteditable elements');
  
  // Try to identify possible title fields based on attributes
  editableElements.forEach((el, index) => {
    const ariaLabel = el.getAttribute('aria-label');
    const textContent = el.textContent;
    const parentNodeName = el.parentElement ? el.parentElement.nodeName : 'unknown';
    console.log(`DEBUG: Editable element #${index}:`, {
      ariaLabel,
      textContent: textContent ? textContent.substring(0, 20) + (textContent.length > 20 ? '...' : '') : '',
      parentNodeName,
      classes: el.className
    });
  });
  
  // Check if our XPath actually finds anything
  const titleXPath = '/html/body/ytcp-app/ytcp-entity-page/div/div/main/div/ytcp-animatable[10]/ytcp-video-details-section/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[1]/ytcp-video-title/ytcp-social-suggestions-textbox/ytcp-form-input-container/div[1]/div[2]/div/ytcp-social-suggestion-input/div';
  const foundWithXPath = document.evaluate(titleXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  console.log('DEBUG: Found element with XPath:', Boolean(foundWithXPath));
  
  // Try a more flexible XPath
  const flexibleXPath = "//ytcp-social-suggestion-input/div";
  const elementsWithFlexibleXPath = document.evaluate(flexibleXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  console.log('DEBUG: Found ' + elementsWithFlexibleXPath.snapshotLength + ' elements with flexible XPath');
  
  for (let i = 0; i < elementsWithFlexibleXPath.snapshotLength; i++) {
    const el = elementsWithFlexibleXPath.snapshotItem(i);
    console.log(`DEBUG: Flexible XPath element #${i}:`, {
      textContent: el.textContent ? el.textContent.substring(0, 20) + (el.textContent.length > 20 ? '...' : '') : '',
      parentNodeName: el.parentElement ? el.parentElement.nodeName : 'unknown',
      classes: el.className
    });
  }
}

// Fill YouTube title and description fields in YouTube Studio
function fillYouTubeForm(content) {
  try {
    console.log('DEBUG: Starting fillYouTubeForm with content length:', content?.length);
    
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
    
    console.log('DEBUG: Parsed title:', title);
    console.log('DEBUG: Parsed description:', description?.substring(0, 50) + (description?.length > 50 ? '...' : ''));
    
    // Run debug function first
    debugYouTubeStudio();
    
    // Use the provided XPath to find and fill the title field
    const titleXPath = '/html/body/ytcp-app/ytcp-entity-page/div/div/main/div/ytcp-animatable[10]/ytcp-video-details-section/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[1]/ytcp-video-title/ytcp-social-suggestions-textbox/ytcp-form-input-container/div[1]/div[2]/div/ytcp-social-suggestion-input/div';
    const titleField = document.evaluate(titleXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    
    console.log('DEBUG: XPath title field found:', Boolean(titleField));
    if (titleField) {
      console.log('DEBUG: Title field before:', titleField.textContent);
      titleField.textContent = title;
      // Dispatch input event to trigger YouTube's validation
      titleField.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('DEBUG: Title field after:', titleField.textContent);
      console.log('Title filled successfully using XPath');
    } else {
      console.error('Title field not found using XPath');
      // Fall back to previous selectors
      const altTitleFields = [
        document.querySelector('#textbox[aria-label="Add a title that describes your video (type @ to mention a channel)"]'),
        document.querySelector('.input-container.title ytcp-social-suggestions-textbox [contenteditable="true"]'),
        document.querySelector('ytcp-social-suggestions-textbox[required] [contenteditable="true"]'),
        document.querySelector('[aria-label="Add a title that describes your video"] [contenteditable="true"]')
      ];
      
      console.log('DEBUG: Trying alternative selectors for title field');
      for (let i = 0; i < altTitleFields.length; i++) {
        const field = altTitleFields[i];
        console.log(`DEBUG: Alt title field #${i} found:`, Boolean(field));
        if (field) {
          console.log('DEBUG: Alt title field before:', field.textContent);
          field.textContent = title;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('DEBUG: Alt title field after:', field.textContent);
          console.log('Title filled successfully with alternate selector #' + i);
          break;
        }
      }
      
      // Try a more general approach if none of the selectors worked
      if (!altTitleFields.some(f => f)) {
        console.log('DEBUG: Trying most general approach for title');
        // Find any contenteditable div with title-like text
        const allContentEditables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        const possibleTitleField = allContentEditables.find(el => 
          (el.textContent.includes('title') || el.textContent.includes('Title')) || 
          (el.getAttribute('aria-label') && el.getAttribute('aria-label').toLowerCase().includes('title'))
        );
        
        if (possibleTitleField) {
          console.log('DEBUG: Found possible title field:', possibleTitleField.textContent);
          possibleTitleField.textContent = title;
          possibleTitleField.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Title filled with general approach');
        } else {
          console.error('Could not find any title field');
        }
      }
    }
    
    // Fill in the description field - Try multiple selectors
    const descriptionField = document.querySelector('#textbox[aria-label="Tell viewers about your video (type @ to mention a channel)"]') || 
                              document.querySelector('.input-container.description ytcp-social-suggestions-textbox:not([required]) [contenteditable="true"]') || 
                              document.querySelector('ytcp-social-suggestions-textbox:not([required]) [contenteditable="true"]');
    
    console.log('DEBUG: Description field found:', Boolean(descriptionField));
    if (descriptionField) {
      console.log('DEBUG: Description field before:', descriptionField.textContent);
      descriptionField.textContent = description;
      // Dispatch input event to trigger YouTube's validation
      descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('DEBUG: Description field after:', descriptionField.textContent);
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
  console.log('YouTube Description Generator content script loaded on: ' + window.location.href);
  
  const videoId = getYoutubeVideoId();
  if (videoId) {
    console.log('Detected YouTube video ID:', videoId);
  } else {
    console.log('No YouTube video ID detected on this page');
  }
  
  // Check if we're on YouTube Studio editor
  if (window.location.href.includes('studio.youtube.com/video/')) {
    console.log('Detected YouTube Studio editor page');
    // Run debug function after page load
    setTimeout(debugYouTubeStudio, 2000); // Add a delay to ensure page elements are loaded
    
    // Try to find the title and description fields early
    const titleField = document.querySelector('#textbox[aria-label="Add a title that describes your video (type @ to mention a channel)"]');
    console.log('Title field found:', Boolean(titleField));
    
    const descField = document.querySelector('#textbox[aria-label="Tell viewers about your video (type @ to mention a channel)"]');
    console.log('Description field found:', Boolean(descField));
  }
});

// Listen for messages from the popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message on ' + window.location.href + ':', message);
  
  if (message.type === 'GET_VIDEO_ID') {
    const videoId = getYoutubeVideoId();
    console.log('GET_VIDEO_ID request, returning:', videoId);
    sendResponse({ videoId });
  }
  else if (message.type === 'FILL_YOUTUBE_FORM') {
    console.log('FILL_YOUTUBE_FORM request received with content length:', message.content?.length);
    const result = fillYouTubeForm(message.content);
    console.log('FILL_YOUTUBE_FORM result:', result);
    sendResponse(result);
  }
  return true;
}); 