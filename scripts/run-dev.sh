#!/bin/bash

# Start the server in background
echo "Starting server..."
cd server && npm install && npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Build the extension
echo "Building extension..."
npm run build

echo ""
echo "============================"
echo "✅ Server running at http://localhost:3040"
echo "✅ Extension built in 'dist' directory"
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable 'Developer mode' (top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist' directory"
echo ""
echo "To use ngrok for remote access:"
echo "Run in another terminal: ngrok http 3040"
echo "Then update the Server URL in the extension popup"
echo "============================"
echo ""
echo "Press Ctrl+C to stop the server"

# Wait for Ctrl+C
trap "kill $SERVER_PID; echo 'Server stopped.'; exit 0" INT
wait 