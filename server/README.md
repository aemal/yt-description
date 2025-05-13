# YouTube Description Generator Server

This server component for the YouTube Description Generator handles fetching video captions and generating titles and descriptions using OpenAI's API.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the server directory with the following content:
   ```
   # OpenAI API Key (required for description generation)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Port to run the server on (default: 3040)
   PORT=3040
   ```

3. Replace `your_openai_api_key_here` with your actual OpenAI API key.

## Running the Server

Start the server:
```
npm start
```

For development (with auto-reload):
```
npm run dev
```

## API Endpoints

- **GET /** - Health check
- **GET /api/config** - Get server configuration
- **POST /api/config** - Update server configuration
- **GET /api/captions/:videoId** - Get captions for a YouTube video
- **GET /api/captions-fallback/:videoId** - Fallback endpoint for captions
- **POST /api/generate** - Generate title and description from transcript

## Remote Access

To make the server accessible from the internet (for remote use):

1. Install ngrok:
   ```
   npm install -g ngrok
   ```

2. Create a tunnel:
   ```
   ngrok http 3040
   ```

3. Copy the HTTPS URL provided by ngrok.
4. Update the Server URL in the Chrome extension popup. 