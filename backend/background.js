// /backend/background.js

importScripts("../scripts/logger.js");

const SERVER_URL = "https://screen-ocr-chrome.onrender.com/chat";

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "selection-complete") {
    handleSelectionComplete(request, sendResponse);
    return true; // asynchronous response
  } else if (request.action === "send-ocr-text") {
    handleSendOcrText(request, sendResponse);
    return true;
  } else {
    Logger.warn("Unknown action received in background: " + request.action);
    sendResponse({ error: "Unknown action." });
    return false;
  }
});

function handleSelectionComplete(request, sendResponse) {
  Logger.log("Handling 'selection-complete' action.");
  chrome.tabs.captureVisibleTab(null, { format: "png" }, function (dataUrl) {
    if (chrome.runtime.lastError) {
      Logger.error("Error capturing visible tab: " + chrome.runtime.lastError.message);
      sendResponse({ error: chrome.runtime.lastError.message });
      return;
    }
    if (dataUrl) {
      sendResponse({ screenshotBase64: dataUrl });
    } else {
      Logger.error("No data URL received from captureVisibleTab.");
      sendResponse({ error: "Failed to capture screenshot." });
    }
  });
}

function handleSendOcrText(request, sendResponse) {
  var text = request.text;
  var stealthMode = request.stealthMode;
  if (!text) {
    Logger.warn("No text provided for OCR processing.");
    sendResponse({ error: "No text provided for OCR processing." });
    return;
  }
  chrome.storage.local.get(["selectedModel"], function (settings) {
    var model;
    if (settings.selectedModel) {
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
            Logger.error("Server error: " + response.status + " - " + errorText);
            sendResponse({ error: "Server responded with status " + response.status + ": " + errorText, });
          });
        }
        return response.json();
      })
      .then(function (data) {
        if (data && data.response) {
          sendResponse({ answer: data.response, stealthMode: stealthMode });
        } else {
          Logger.error("Invalid response structure from server.");
          sendResponse({ error: "Invalid response structure from server." });
        }
      })
      .catch(function (error) {
        Logger.error("Error communicating with server: " + error.message);
        sendResponse({ error: error.message });
      });
  });
}

// Handle keyboard shortcut commands.
chrome.commands.onCommand.addListener(async function (command) {
  if (command === "start-ocr-selection") {
    Logger.log("Keyboard shortcut triggered: Start OCR Selection");
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      Logger.error("No active tab found.");
      return;
    }
    const activeTab = tabs[0];
    if (!activeTab.id) {
      Logger.error("Active tab has no ID.");
      return;
    }
    chrome.storage.local.get(["openScreenshot", "openOcrText", "stealthMode"], function (settings) {
      var openScreenshot = settings.openScreenshot !== undefined ? settings.openScreenshot : true;
      var openOcrText = settings.openOcrText !== undefined ? settings.openOcrText : true;
      var stealthMode = settings.stealthMode !== undefined ? settings.stealthMode : false;

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
            Logger.error("Error sending message to content script: " + chrome.runtime.lastError.message);
          } else {
            Logger.log("OCR selection started via keyboard shortcut.");
          }
        }
      );
    });
  }
});



