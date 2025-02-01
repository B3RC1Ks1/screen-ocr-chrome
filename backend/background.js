// /backend/background.js

const SERVER_URL = "https://screen-ocr-chrome.onrender.com/chat";

// Background Logger Module
const BackgroundLogger = (function () {
  var isStealthMode = false;

  // Initialize stealth mode from storage
  chrome.storage.local.get(["stealthMode"], function (settings) {
    if (settings.stealthMode !== undefined) {
      isStealthMode = settings.stealthMode;
    } else {
      isStealthMode = false;
    }
    var modeStr = "DISABLED";
    if (isStealthMode) {
      modeStr = "ENABLED";
    }
    console.log("[BG LOG INIT]: Stealth Mode is " + modeStr);
  });

  // Listen for changes
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "local" && changes.stealthMode) {
      isStealthMode = changes.stealthMode.newValue;
    }
  });

  return {
    log: function (message) {
      if (!isStealthMode) {
        console.log("[BG LOG]: " + message);
      }
    },
    error: function (message) {
      if (!isStealthMode) {
        console.error("[BG ERROR]: " + message);
      }
    },
    warn: function (message) {
      if (!isStealthMode) {
        console.warn("[BG WARN]: " + message);
      }
    },
  };
})();

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "selection-complete") {
    handleSelectionComplete(request, sendResponse);
    return true; // asynchronous response
  } else if (request.action === "send-ocr-text") {
    handleSendOcrText(request, sendResponse);
    return true;
  } else {
    BackgroundLogger.warn("Unknown action received in background: " + request.action);
    sendResponse({ error: "Unknown action." });
    return false;
  }
});

function handleSelectionComplete(request, sendResponse) {
  BackgroundLogger.log("Handling 'selection-complete' action.");
  chrome.tabs.captureVisibleTab(null, { format: "png" }, function (dataUrl) {
    if (chrome.runtime.lastError) {
      BackgroundLogger.error("Error capturing visible tab: " + chrome.runtime.lastError.message);
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
}

function handleSendOcrText(request, sendResponse) {
  var text = request.text;
  var stealthMode = request.stealthMode;
  if (!text) {
    BackgroundLogger.warn("No text provided for OCR processing.");
    sendResponse({ error: "No text provided for OCR processing." });
    return;
  }
  chrome.storage.local.get(["selectedModel"], function (settings) {
    var model;
    if (
      settings.selectedModel !== undefined &&
      settings.selectedModel !== null &&
      settings.selectedModel !== ""
    ) {
      model = settings.selectedModel;
    } else {
      model = "gpt-4o";
    }
    fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message:
          "If you see multiple choice test like A,B,C and so on, return just an answer, without any elaboration or additional text. If you see coding question, just output an answer without any elaboration\n" +
          text,
        model: model,
      }),
    })
      .then(function (response) {
        if (!response.ok) {
          return response.text().then(function (errorText) {
            BackgroundLogger.error("Server error: " + response.status + " - " + errorText);
            sendResponse({ error: "Server responded with status " + response.status + ": " + errorText });
          });
        }
        return response.json();
      })
      .then(function (data) {
        if (data && data.response) {
          sendResponse({ answer: data.response, stealthMode: stealthMode });
        } else {
          BackgroundLogger.error("Invalid response structure from server.");
          sendResponse({ error: "Invalid response structure from server." });
        }
      })
      .catch(function (error) {
        BackgroundLogger.error("Error communicating with server: " + error.message);
        sendResponse({ error: error.message });
      });
  });
}

// Handle keyboard shortcut commands.
chrome.commands.onCommand.addListener(async function (command) {
  if (command === "start-ocr-selection") {
    BackgroundLogger.log("Keyboard shortcut triggered: Start OCR Selection");
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      BackgroundLogger.error("No active tab found.");
      return;
    }
    const activeTab = tabs[0];
    if (!activeTab.id) {
      BackgroundLogger.error("Active tab has no ID.");
      return;
    }
    chrome.storage.local.get(["openScreenshot", "openOcrText", "stealthMode"], function (settings) {
      var openScreenshot;
      if (settings.openScreenshot !== undefined) {
        openScreenshot = settings.openScreenshot;
      } else {
        openScreenshot = true;
      }
      var openOcrText;
      if (settings.openOcrText !== undefined) {
        openOcrText = settings.openOcrText;
      } else {
        openOcrText = true;
      }
      var stealthMode;
      if (settings.stealthMode !== undefined) {
        stealthMode = settings.stealthMode;
      } else {
        stealthMode = false;
      }
      chrome.tabs.sendMessage(
        activeTab.id,
        {
          action: "start-ocr-selection",
          openScreenshot: openScreenshot,
          openOcrText: openOcrText,
          stealthMode: stealthMode,
        },
        function (response) {
          if (chrome.runtime.lastError) {
            BackgroundLogger.error("Error sending message to content script: " + chrome.runtime.lastError.message);
          } else {
            BackgroundLogger.log("OCR selection started via keyboard shortcut.");
          }
        }
      );
    });
  }
});


