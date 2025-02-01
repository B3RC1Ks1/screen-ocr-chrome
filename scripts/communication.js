// scripts/communication.js

const Communication = (() => {
  /**
   * Send OCR text to the background script for processing with OpenAI.
   * @param {string} text - The extracted OCR text.
   */
  const sendOcrTextToBackground = (text) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(["stealthMode"], (settings) => {
        try {
          let stealthMode = settings.stealthMode;
          if (stealthMode === undefined) {
            stealthMode = false;
          }
          chrome.runtime.sendMessage(
            { action: "send-ocr-text", text: text, stealthMode: stealthMode },
            (response) => {
              try {
                if (chrome.runtime.lastError) {
                  throw new Error(chrome.runtime.lastError.message);
                }
                if (response && response.answer) {
                  Logger.log("Received answer from OpenAI:", response.answer);
                  UI.displayChatGptResponse(response.answer, stealthMode);
                } else if (response && response.error) {
                  Logger.error("Error from background script:", response.error);
                } else {
                  Logger.error("No response received from background script.");
                }
              } catch (error) {
                Logger.error("Error processing background response:", error);
              }
              resolve();
            }
          );
        } catch (error) {
          Logger.error("Error in sendOcrTextToBackground:", error);
          resolve();
        }
      });
    });
  };

  /**
   * Capture the visible tab via the background script.
   * @param {{x: number, y: number, width: number, height: number}} coords - Coordinates for cropping.
   */
  const captureScreenshot = (coords) => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["stealthMode"], (settings) => {
        try {
          let stealthMode = settings.stealthMode;
          if (stealthMode === undefined) {
            stealthMode = false;
          }
          chrome.runtime.sendMessage(
            { action: "selection-complete", coords: coords, stealthMode: stealthMode },
            (response) => {
              try {
                if (chrome.runtime.lastError) {
                  throw new Error(chrome.runtime.lastError.message);
                }
                if (response && response.screenshotBase64) {
                  resolve(response);
                } else {
                  throw new Error("Failed to capture screenshot.");
                }
              } catch (error) {
                Logger.error("Error capturing screenshot:", error);
                reject(new Error(error.message));
              }
            }
          );
        } catch (error) {
          Logger.error("Error in captureScreenshot:", error);
          reject(new Error(error.message));
        }
      });
    });
  };

  /**
   * Listen for messages from other parts of the extension.
   */
  const setupMessageListener = () => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (message.action === "check-tesseract-ready") {
          sendResponse({ tesseractReady: State.getState().tesseractReady });
        } else if (message.action === "start-ocr-selection") {
          Logger.log("[Content Script] Starting OCR Selection");

          let openScreenshot = message.openScreenshot;
          if (openScreenshot === undefined) {
            openScreenshot = false;
          }
          let openOcrText = message.openOcrText;
          if (openOcrText === undefined) {
            openOcrText = false;
          }
          let stealthMode = message.stealthMode;
          if (stealthMode === undefined) {
            stealthMode = false;
          }

          State.setState({
            openScreenshot: openScreenshot,
            openOcrText: openOcrText,
            stealthMode: stealthMode,
          });

          // Remove any existing overlay to prevent duplicates
          const existingOverlay = document.getElementById("my-ocr-overlay");
          if (existingOverlay) {
            existingOverlay.remove();
          }

          // Create a new overlay and initialize selection handlers
          const overlay = SelectionOverlay.createSelectionOverlay(stealthMode);
          SelectionOverlay.initSelectionHandlers(overlay, stealthMode);
          sendResponse({ status: "Selection overlay started." });
        } else {
          Logger.warn("Unknown action:", message.action);
        }
      } catch (error) {
        Logger.error("Error in message listener:", error);
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

