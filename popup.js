// Always use the mocked video ID for testing
const videoID = 'JMYQmGfTltY';

document.getElementById("transcript").textContent = "Loading transcript for video ID: " + videoID + "...";

chrome.runtime.sendMessage({ type: "FETCH_CAPTIONS", videoID }, response => {
  const transcriptDiv = document.getElementById("transcript");
  if (response.success) {
    transcriptDiv.textContent = JSON.stringify(response.subtitles, null, 2);
  } else {
    transcriptDiv.textContent = "Error: " + response.error;
  }
}); 