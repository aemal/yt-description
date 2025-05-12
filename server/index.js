const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { getSubtitles } = require('youtube-captions-scraper');

const app = express();
const PORT = process.env.PORT || 3040;

// Enable CORS for all routes
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'YouTube Description API is running' });
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
app.post('/api/generate', express.json(), async (req, res) => {
  try {
    const { apiKey, prompt, transcript } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'API key is required' });
    }
    
    if (!prompt || !transcript) {
      return res.status(400).json({ success: false, error: 'Prompt and transcript are required' });
    }
    
    console.log('Generating content with OpenAI');
    
    // Format transcript
    const fullTranscript = transcript.map(item => item.text).join(' ');
    const fullPrompt = `${prompt}\n\nTranscript:\n${fullTranscript.substring(0, 15000)}`;
    
    // Call OpenAI API
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
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
          'Authorization': `Bearer ${apiKey}`
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
  console.log(`\nTo create a public URL with ngrok:\nngrok http ${PORT}`);
}); 