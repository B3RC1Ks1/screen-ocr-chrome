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
      try {
        let storedStealthMode = settings.stealthMode;
        if (storedStealthMode === undefined) {
          storedStealthMode = false;
        }
        isStealthMode = storedStealthMode;
        logInitialization();
      } catch (error) {
        console.error("Error initializing logger:", error);
      }
    });
  };

  /**
   * Log initial stealth mode status for debugging.
   */
  const logInitialization = () => {
    if (isStealthMode) {
      console.log("[BG LOG INIT]: Stealth Mode is ENABLED");
    } else {
      console.log("[BG LOG INIT]: Stealth Mode is DISABLED");
    }
  };

  /**
   * Update Stealth Mode.
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
    try {
      if (area === "local" && changes.stealthMode) {
        setStealthMode(changes.stealthMode.newValue);
      }
    } catch (error) {
      console.error("Error processing storage change:", error);
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
  try {
    if (request.action === "selection-complete") {
      handleSelectionComplete(request, sendResponse);
      return true; // async response
    } else if (request.action === "send-ocr-text") {
      handleSendOcrText(request, sendResponse);
      return true; // async response
    } else {
      BackgroundLogger.warn("Unknown action received in background:", request.action);
      sendResponse({ error: "Unknown action." });
      return false;
    }
  } catch (error) {
    BackgroundLogger.error("Error handling message:", error);
    sendResponse({ error: error.message });
    return false;
  }
});

/**
 * Handles the 'selection-complete' action by capturing the visible tab.
 */
const handleSelectionComplete = (request, sendResponse) => {
  BackgroundLogger.log("Handling 'selection-complete' action.");
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    try {
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      if (!dataUrl) {
        throw new Error("Failed to capture screenshot.");
      }
      sendResponse({ screenshotBase64: dataUrl });
    } catch (error) {
      BackgroundLogger.error("Error capturing visible tab:", error);
      sendResponse({ error: error.message });
    }
  });
};

/**
 * Handles the 'send-ocr-text' action by sending text to the server and retrieving ChatGPT's response.
 */
const handleSendOcrText = async (request, sendResponse) => {
  const { text, stealthMode } = request;
  if (!text) {
    BackgroundLogger.warn("No text provided for OCR processing.");
    sendResponse({ error: "No text provided for OCR processing." });
    return;
  }

  try {
    chrome.storage.local.get(["selectedModel"], async (settings) => {
      try {
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
      } catch (innerError) {
        BackgroundLogger.error("Error processing send-ocr-text:", innerError);
        sendResponse({ error: innerError.message });
      }
    });
  } catch (error) {
    BackgroundLogger.error("Error in handleSendOcrText:", error);
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
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!activeTab || !activeTab.id) {
        BackgroundLogger.error("No active tab found.");
        return;
      }

      chrome.storage.local.get(
        ["openScreenshot", "openOcrText", "stealthMode"],
        (settings) => {
          try {
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

            chrome.tabs.sendMessage(
              activeTab.id,
              {
                action: "start-ocr-selection",
                openScreenshot: openScreenshot,
                openOcrText: openOcrText,
                stealthMode: stealthMode, // Include Stealth Mode flag
              },
              (response) => {
                try {
                  if (chrome.runtime.lastError) {
                    throw new Error(chrome.runtime.lastError.message);
                  }
                  BackgroundLogger.log("OCR selection started via keyboard shortcut.");
                } catch (err) {
                  BackgroundLogger.error("Error sending message to content script:", err);
                }
              }
            );
          } catch (error) {
            BackgroundLogger.error("Error processing settings for keyboard shortcut:", error);
          }
        }
      );
    } catch (error) {
      BackgroundLogger.error("Error handling keyboard shortcut:", error);
    }
  }
});

