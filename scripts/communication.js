// scripts/communication.js

const Communication = (() => {
  /**
   * Send OCR text to the background script for processing with OpenAI
   * @param {string} text - The extracted OCR text
   */
  const sendOcrTextToBackground = (text) => {
    return new Promise((resolve) => {
      // Retrieve stealthMode setting
      chrome.storage.local.get(["stealthMode"], ({ stealthMode }) => {
        chrome.runtime.sendMessage(
          { action: "send-ocr-text", text, stealthMode },
          (response) => {
            if (chrome.runtime.lastError) {
              Logger.error(
                "Error sending message to background script:",
                chrome.runtime.lastError.message
              );
              resolve();
              return;
            }

            if (response?.answer) {
              Logger.log("Received answer from OpenAI:", response.answer);
              UI.displayChatGptResponse(response.answer, stealthMode);
            } else if (response?.error) {
              Logger.error("Error from background script:", response.error);
            } else {
              Logger.error("No response received from background script.");
            }
            resolve();
          }
        );
      });
    });
  };

  /**
   * Capture the visible tab via the background script
   * @param {{x: number, y: number, width: number, height: number}} coords - The coordinates for cropping
   */
  const captureScreenshot = (coords) => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["stealthMode"], ({ stealthMode }) => {
        chrome.runtime.sendMessage(
          { action: "selection-complete", coords, stealthMode },
          (response) => {
            if (chrome.runtime.lastError) {
              Logger.error(
                "Error capturing screenshot:",
                chrome.runtime.lastError.message
              );
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (response?.screenshotBase64) {
              resolve(response);
            } else {
              Logger.error("No data URL received from captureVisibleTab.");
              reject(new Error("Failed to capture screenshot."));
            }
          }
        );
      });
    });
  };

  /**
   * Listen for messages from other parts of the extension.
   */
  const setupMessageListener = () => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case "check-tesseract-ready":
          sendResponse({ tesseractReady: State.getState().tesseractReady });
          break;

        case "start-ocr-selection":
          Logger.log("[Content Script] Starting OCR Selection");
          State.setState({
            openScreenshot: message.openScreenshot || false,
            openOcrText: message.openOcrText || false,
            stealthMode: message.stealthMode || false, // Set Stealth Mode
          });

          // Remove any existing overlay to prevent duplicates
          const existingOverlay = document.getElementById("my-ocr-overlay");
          if (existingOverlay) existingOverlay.remove();

          // Create a new overlay and initialize selection handlers
          const overlay = SelectionOverlay.createSelectionOverlay(message.stealthMode);
          SelectionOverlay.initSelectionHandlers(overlay, message.stealthMode);
          sendResponse({ status: "Selection overlay started." });
          break;

        default:
          Logger.warn("Unknown action:", message.action);
      }
    });
  };

  return {
    sendOcrTextToBackground,
    captureScreenshot,
    setupMessageListener,
  };
})();

// Initialize message listener
Communication.setupMessageListener();

// Make Communication available globally if needed
window.Communication = Communication;
