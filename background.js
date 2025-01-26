// background.js

const SERVER_URL = "http://localhost:3000/chat"; // Consider moving to environment variables or using chrome.storage

/**
 * Handles messages from content scripts and popup.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "selection-complete":
      handleSelectionComplete(request, sendResponse);
      return true; // Indicates async response

    case "send-ocr-text":
      handleSendOcrText(request, sendResponse);
      return true; // Indicates async response

    default:
      console.warn("Unknown action received in background:", request.action);
      sendResponse({ error: "Unknown action." });
      return false;
  }
});

/**
 * Handles the 'selection-complete' action by capturing the visible tab.
 * @param {Object} request - The message request.
 * @param {Function} sendResponse - The response callback.
 */
const handleSelectionComplete = (request, sendResponse) => {
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error("Error capturing visible tab:", chrome.runtime.lastError.message);
      sendResponse({ error: chrome.runtime.lastError.message });
      return;
    }

    if (dataUrl) {
      sendResponse({ screenshotBase64: dataUrl });
    } else {
      console.error("No data URL received from captureVisibleTab.");
      sendResponse({ error: "Failed to capture screenshot." });
    }
  });
};

/**
 * Handles the 'send-ocr-text' action by sending text to the server and retrieving ChatGPT's response.
 * @param {Object} request - The message request.
 * @param {Function} sendResponse - The response callback.
 */
const handleSendOcrText = async (request, sendResponse) => {
  const { text } = request;
  if (!text) {
    sendResponse({ error: "No text provided for OCR processing." });
    return;
  }

  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `If you see multiple choice test like A,B,C and so on, return just an answer, without any elaboration or additional text.\n${text}`
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data?.response) {
      sendResponse({ answer: data.response });
    } else {
      throw new Error("Invalid response structure from server.");
    }
  } catch (error) {
    console.error("Error communicating with server:", error);
    sendResponse({ error: error.message });
  }
};
