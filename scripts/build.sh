#!/bin/bash

# Clean the dist directory
rm -rf dist

# Run the build
npm run build

echo "✅ Build completed! Your extension is ready in the 'dist' directory."
echo ""
echo "To load the extension in Chrome:"
echo "1. Go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist' directory" 