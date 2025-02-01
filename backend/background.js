// /backend/background.js

const SERVER_URL = "http://localhost:9005/chat";

/**
 * Background Logger Module
 */
const BackgroundLogger = (() => {
  let isStealthMode = false;

  /**
   * Initialize the Logger by fetching the Stealth Mode setting.
   */
  const initialize = () => {
    chrome.storage.local.get(["stealthMode"], (settings) => {
      let storedStealthMode = settings.stealthMode;
      if (storedStealthMode === undefined) {
        storedStealthMode = false;
      }
      isStealthMode = storedStealthMode;
      logInitialization();
    });
  };

  /**
   * Log initial stealth mode status for debugging.
   * This log will always appear regardless of Stealth Mode to help with debugging.
   */
  const logInitialization = () => {
    console.log(
      `[BG LOG INIT]: Stealth Mode is ${isStealthMode ? "ENABLED" : "DISABLED"}`
    );
  };

  /**
   * Optionally, allow dynamic updating of Stealth Mode.
   * This can be called whenever the Stealth Mode setting changes.
   * @param {boolean} stealth - Current Stealth Mode status.
   */
  const setStealthMode = (stealth) => {
    isStealthMode = stealth;
  };

  const log = (message, ...args) => {
    if (!isStealthMode) {
      console.log(`[BG LOG]: ${message}`, ...args);
    }
  };

  const error = (message, ...args) => {
    if (!isStealthMode) {
      console.error(`[BG ERROR]: ${message}`, ...args);
    }
  };

  const warn = (message, ...args) => {
    if (!isStealthMode) {
      console.warn(`[BG WARN]: ${message}`, ...args);
    }
  };

  // Initialize Logger on script load
  initialize();

  // Listen for changes in Stealth Mode setting
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.stealthMode) {
      setStealthMode(changes.stealthMode.newValue);
    }
  });

  return {
    log,
    error,
    warn,
  };
})();

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
      BackgroundLogger.warn("Unknown action received in background:", request.action);
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
  BackgroundLogger.log("Handling 'selection-complete' action.");
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      BackgroundLogger.error(
        "Error capturing visible tab:",
        chrome.runtime.lastError.message
      );
      sendResponse({ error: chrome.runtime.lastError.message });
      return;
    }

    if (dataUrl) {
      sendResponse({ screenshotBase64: dataUrl });
    } else {
      BackgroundLogger.error("No data URL received from captureVisibleTab.");
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
  const { text, stealthMode } = request;
  if (!text) {
    BackgroundLogger.warn("No text provided for OCR processing.");
    sendResponse({ error: "No text provided for OCR processing." });
    return;
  }

  try {
    // Retrieve the selected model from storage
    chrome.storage.local.get(["selectedModel"], async (settings) => {
      let model = settings.selectedModel;
      if (model === undefined || model === null || model === "") {
        model = "gpt-4o"; // Default model if not set
      }

      const response = await fetch(SERVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message:
            "If you see multiple choice test like A,B,C and so on, return just an answer, without any elaboration or additional text. If you see coding question, just output an answer without any elaboration\n" +
            text,
          model: model, // Include the selected model
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Server responded with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      if (data && data.response) {
        sendResponse({ answer: data.response, stealthMode });
      } else {
        throw new Error("Invalid response structure from server.");
      }
    });
  } catch (error) {
    BackgroundLogger.error("Error communicating with server:", error);
    sendResponse({ error: error.message });
  }
};

/**
 * Handle keyboard shortcut commands.
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "start-ocr-selection") {
    BackgroundLogger.log("Keyboard shortcut triggered: Start OCR Selection");

    try {
      // Get the active tab
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!activeTab || !activeTab.id) {
        BackgroundLogger.error("No active tab found.");
        return;
      }

      // Retrieve saved settings
      chrome.storage.local.get(
        ["openScreenshot", "openOcrText", "stealthMode"],
        (settings) => {
          let openScreenshot = settings.openScreenshot;
          if (openScreenshot === undefined) {
            openScreenshot = true;
          }
          let openOcrText = settings.openOcrText;
          if (openOcrText === undefined) {
            openOcrText = true;
          }
          let stealthMode = settings.stealthMode;
          if (stealthMode === undefined) {
            stealthMode = false;
          }

          // Send a message to the content script to begin the overlay selection
          chrome.tabs.sendMessage(
            activeTab.id,
            {
              action: "start-ocr-selection",
              openScreenshot: openScreenshot,
              openOcrText: openOcrText,
              stealthMode: stealthMode, // Include Stealth Mode flag
            },
            (response) => {
              if (chrome.runtime.lastError) {
                BackgroundLogger.error(
                  "Error sending message to content script:",
                  chrome.runtime.lastError.message
                );
              } else {
                BackgroundLogger.log("OCR selection started via keyboard shortcut.");
              }
            }
          );
        }
      );
    } catch (error) {
      BackgroundLogger.error("Error handling keyboard shortcut:", error);
    }
  }
});
