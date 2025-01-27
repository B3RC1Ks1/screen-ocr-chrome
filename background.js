// background.js

const SERVER_URL = "https://screen-ocr-chrome.onrender.com/chat";

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
    // Retrieve the selected model from storage
    chrome.storage.local.get(["selectedModel"], async ({ selectedModel }) => {
      const model = selectedModel || "gpt-4o-mini"; // Default model if not set

      const response = await fetch(SERVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `If you see multiple choice test like A,B,C and so on, return just an answer, without any elaboration or additional text. If you see coding question, just output an answer without any elaboration\n${text}`,
          model: model, // Include the selected model
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data?.response) {
        sendResponse({ answer: data.response });
      } else {
        throw new Error("Invalid response structure from server.");
      }
    });
  } catch (error) {
    console.error("Error communicating with server:", error);
    sendResponse({ error: error.message });
  }
};

/**
 * Handle keyboard shortcut commands.
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "start-ocr-selection") {
    console.log("Keyboard shortcut triggered: Start OCR Selection");

    try {
      // Get the active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!activeTab.id) {
        console.error("No active tab found.");
        return;
      }

      // Retrieve saved settings
      chrome.storage.local.get(
        ["openScreenshot", "openOcrText"],
        ({ openScreenshot, openOcrText }) => {
          // Send a message to the content script to begin the overlay selection
          chrome.tabs.sendMessage(activeTab.id, {
            action: "start-ocr-selection",
            openScreenshot: openScreenshot !== undefined ? openScreenshot : true,
            openOcrText: openOcrText !== undefined ? openOcrText : true,
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending message to content script:", chrome.runtime.lastError.message);
            } else {
              console.log("OCR selection started via keyboard shortcut.");
            }
          });
        }
      );
    } catch (error) {
      console.error("Error handling keyboard shortcut:", error);
    }
  }
});
