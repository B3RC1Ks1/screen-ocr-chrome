// scripts/communication.js

const Communication = (function () {
  function sendOcrTextToBackground(text) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(["stealthMode"], function (settings) {
        var stealthMode;
        if (settings.stealthMode !== undefined) {
          stealthMode = settings.stealthMode;
        } else {
          stealthMode = false;
        }
        chrome.runtime.sendMessage(
          { action: "send-ocr-text", text: text, stealthMode: stealthMode },
          function (response) {
            if (chrome.runtime.lastError) {
              Logger.error("Error sending message to background script: " + chrome.runtime.lastError.message);
            } else if (response && response.answer) {
              Logger.log("Received answer from OpenAI: " + response.answer);
              UI.displayChatGptResponse(response.answer, stealthMode);
            } else if (response && response.error) {
              Logger.error("Error from background script: " + response.error);
            } else {
              Logger.error("No response received from background script.");
            }
            resolve();
          }
        );
      });
    });
  }

  function captureScreenshot(coords) {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.get(["stealthMode"], function (settings) {
        var stealthMode;
        if (settings.stealthMode !== undefined) {
          stealthMode = settings.stealthMode;
        } else {
          stealthMode = false;
        }
        chrome.runtime.sendMessage({ action: "selection-complete", coords: coords, stealthMode: stealthMode }, function (response) {
          if (chrome.runtime.lastError) {
            Logger.error("Error capturing screenshot: " + chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.screenshotBase64) {
            resolve(response);
          } else {
            Logger.error("No data URL received from captureVisibleTab.");
            reject(new Error("Failed to capture screenshot."));
          }
        });
      });
    });
  }

  // Listen for messages from other parts of the extension.
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (message.action === "check-tesseract-ready") {
        sendResponse({ tesseractReady: State.getState().tesseractReady });
      } else if (message.action === "start-ocr-selection") {
        Logger.log("[Content Script] Starting OCR Selection");
        var openScreenshot;
        if (message.openScreenshot !== undefined) {
          openScreenshot = message.openScreenshot;
        } else {
          openScreenshot = false;
        }
        var openOcrText;
        if (message.openOcrText !== undefined) {
          openOcrText = message.openOcrText;
        } else {
          openOcrText = false;
        }
        var stealthMode;
        if (message.stealthMode !== undefined) {
          stealthMode = message.stealthMode;
        } else {
          stealthMode = false;
        }
        State.setState({
          openScreenshot: openScreenshot,
          openOcrText: openOcrText,
          stealthMode: stealthMode,
        });
        // Remove any existing overlay to prevent duplicates
        var existingOverlay = document.getElementById("my-ocr-overlay");
        if (existingOverlay) {
          existingOverlay.remove();
        }
        var overlay = SelectionOverlay.createSelectionOverlay(stealthMode);
        SelectionOverlay.initSelectionHandlers(overlay, stealthMode);
        sendResponse({ status: "Selection overlay started." });
      } else {
        Logger.warn("Unknown action: " + message.action);
      }
    });
  }

  setupMessageListener();

  return {
    sendOcrTextToBackground: sendOcrTextToBackground,
    captureScreenshot: captureScreenshot,
    setupMessageListener: setupMessageListener,
  };
})();

window.Communication = Communication;


