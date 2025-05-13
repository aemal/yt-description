const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { getSubtitles } = require('youtube-captions-scraper');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3040;

// Config file path
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Default config
let config = {
  defaultPrompt: 'Generate a YouTube title and description based on the following transcript. Title should be catchy and SEO-friendly. Description should summarize key points, include timestamps for major sections, and ask viewers to like and subscribe.'
};

// Load API key from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Load config if exists
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = { ...config, ...JSON.parse(configData) };
    console.log('Config loaded successfully');
  } else {
    // Create default config file
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('Default config created');
  }
} catch (error) {
  console.error('Error loading config:', error.message);
}

// Save config
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('Config saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving config:', error.message);
    return false;
  }
}

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'YouTube Description API is running',
    apiKeyConfigured: Boolean(OPENAI_API_KEY)
  });
});

// Get config
app.get('/api/config', (req, res) => {
  // Don't send the API key to the frontend, just whether it's set
  res.json({
    success: true, 
    config: {
      hasApiKey: Boolean(OPENAI_API_KEY),
      defaultPrompt: config.defaultPrompt
    }
  });
});

// Update config
app.post('/api/config', (req, res) => {
  try {
    const { defaultPrompt } = req.body;
    
    if (defaultPrompt !== undefined) {
      config.defaultPrompt = defaultPrompt;
    }
    
    const saved = saveConfig();
    
    if (saved) {
      res.json({ 
        success: true, 
        message: 'Config updated successfully',
        hasApiKey: Boolean(OPENAI_API_KEY)
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save config' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to fetch YouTube captions
app.get('/api/captions/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { lang = 'en' } = req.query;
    
    console.log(`Fetching captions for video: ${videoId}, language: ${lang}`);
    
    // Use youtube-captions-scraper (works server-side without CORS issues)
    const captions = await getSubtitles({ 
      videoID: videoId, 
      lang: lang 
    });
    
    res.json({ success: true, subtitles: captions });
  } catch (error) {
    console.error('Error fetching captions:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Fallback endpoint that uses direct YouTube API if youtube-captions-scraper fails
app.get('/api/captions-fallback/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { lang = 'en' } = req.query;
    
    console.log(`Using fallback to fetch captions for video: ${videoId}, language: ${lang}`);
    
    // First fetch the caption track list
    const trackListUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`;
    const trackListResponse = await axios.get(trackListUrl);
    
    // Parse XML to get available tracks
    const trackListData = await parseStringPromise(trackListResponse.data);
    const tracks = trackListData?.transcript_list?.track || [];
    
    if (!tracks.length) {
      throw new Error('No caption tracks available for this video');
    }
    
    // Find requested language or use first available
    let selectedTrack = tracks.find(track => track.$.lang_code === lang);
    if (!selectedTrack && tracks.length > 0) {
      selectedTrack = tracks[0];
    }
    
    const langCode = selectedTrack.$.lang_code;
    const trackName = selectedTrack.$.name;
    
    // Fetch the actual captions
    const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${langCode}${trackName ? `&name=${encodeURIComponent(trackName)}` : ''}`;
    const captionResponse = await axios.get(captionUrl);
    
    // Parse the XML caption data
    const captionData = await parseStringPromise(captionResponse.data);
    const textElements = captionData?.transcript?.text || [];
    
    // Format captions to match the extension's expected format
    const captions = textElements.map(text => ({
      start: parseFloat(text.$.start),
      dur: parseFloat(text.$.dur),
      text: text._ || ''
    }));
    
    res.json({ success: true, subtitles: captions });
  } catch (error) {
    console.error('Error in fallback caption fetching:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// OpenAI proxy endpoint to avoid exposing API key in client-side code
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, transcript } = req.body;
    
    // Check if API key is configured
    if (!OPENAI_API_KEY) {
      return res.status(400).json({ 
        success: false, 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to the .env file.' 
      });
    }
    
    if (!transcript) {
      return res.status(400).json({ success: false, error: 'Transcript is required' });
    }
    
    // Use provided prompt or default
    const promptText = prompt || config.defaultPrompt;
    
    console.log('Generating content with OpenAI');
    
    // Format transcript
    const fullTranscript = transcript.map(item => item.text).join(' ');
    const fullPrompt = `${promptText}\n\nTranscript:\n${fullTranscript.substring(0, 15000)}`;
    
    // Call OpenAI API
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates YouTube titles and descriptions.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    res.json({
      success: true,
      content: openaiResponse.data.choices[0].message.content
    });
  } catch (error) {
    console.error('Error calling OpenAI:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`👉 Captions API: http://localhost:${PORT}/api/captions/:videoId`);
  console.log(`👉 OpenAI Proxy: http://localhost:${PORT}/api/generate`);
  console.log(`👉 API Key configured: ${Boolean(OPENAI_API_KEY)}`);
  console.log(`\nTo create a public URL with ngrok:\nngrok http ${PORT}`);
}); 