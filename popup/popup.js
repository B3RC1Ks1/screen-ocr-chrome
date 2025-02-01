// /popup/popup.js

document.addEventListener("DOMContentLoaded", function () {
  const startSelectionBtn = document.getElementById("start-selection");
  const openScreenshotCheckbox = document.getElementById("toggle-open-screenshot");
  const openOcrTextCheckbox = document.getElementById("toggle-open-ocr-text");
  const stealthModeCheckbox = document.getElementById("toggle-stealth-mode");
  const modelSelect = document.getElementById("model-select");
  const statusSpan = document.getElementById("status");

  // Load saved settings
  chrome.storage.local.get(["openScreenshot", "openOcrText", "selectedModel", "stealthMode"], function (settings) {
    if (settings.openScreenshot !== undefined) {
      openScreenshotCheckbox.checked = settings.openScreenshot;
    } else {
      openScreenshotCheckbox.checked = false;
    }
    if (settings.openOcrText !== undefined) {
      openOcrTextCheckbox.checked = settings.openOcrText;
    } else {
      openOcrTextCheckbox.checked = false;
    }
    if (settings.stealthMode !== undefined) {
      stealthModeCheckbox.checked = settings.stealthMode;
    } else {
      stealthModeCheckbox.checked = false;
    }
    if (
      settings.selectedModel !== undefined &&
      settings.selectedModel !== null &&
      settings.selectedModel !== ""
    ) {
      modelSelect.value = settings.selectedModel;
    } else {
      modelSelect.value = "gpt-4o";
    }
    Logger.setStealthMode(stealthModeCheckbox.checked);
  });

  // Save settings when changed
  function saveSettings() {
    const settings = {
      openScreenshot: openScreenshotCheckbox.checked,
      openOcrText: openOcrTextCheckbox.checked,
      stealthMode: stealthModeCheckbox.checked,
      selectedModel: modelSelect.value,
    };
    chrome.storage.local.set(settings, function () {
      Logger.log("Settings saved: ", settings);
    });
  }

  openScreenshotCheckbox.addEventListener("change", saveSettings);
  openOcrTextCheckbox.addEventListener("change", saveSettings);
  stealthModeCheckbox.addEventListener("change", saveSettings);
  modelSelect.addEventListener("change", saveSettings);

  // Check if Tesseract is loaded
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs || tabs.length === 0) {
      statusSpan.textContent = "No active tab found.";
      statusSpan.style.color = "red";
      return;
    }
    const activeTabId = tabs[0].id;
    chrome.tabs.sendMessage(activeTabId, { action: "check-tesseract-ready" }, function (response) {
      if (chrome.runtime.lastError) {
        Logger.error("No content script found or error: " + chrome.runtime.lastError.message);
        statusSpan.textContent = "No content script found on this page.";
        statusSpan.style.color = "red";
        return;
      }
      if (response && response.tesseractReady === true) {
        statusSpan.textContent = "Tesseract ready!";
        statusSpan.style.color = "green";
        startSelectionBtn.disabled = false;
      } else {
        statusSpan.textContent = "Tesseract not yet loaded.";
        statusSpan.style.color = "orange";
        startSelectionBtn.disabled = true;
      }
    });
  });

  // Start OCR Selection on button click
  startSelectionBtn.addEventListener("click", function () {
    chrome.storage.local.get(["stealthMode"], function (settings) {
      let isStealthMode;
      if (settings.stealthMode !== undefined) {
        isStealthMode = settings.stealthMode;
      } else {
        isStealthMode = false;
      }
      const openScreenshot = openScreenshotCheckbox.checked;
      const openOcrText = openOcrTextCheckbox.checked;
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "start-ocr-selection",
            openScreenshot: openScreenshot,
            openOcrText: openOcrText,
            stealthMode: isStealthMode,
          });
          window.close(); // Optionally close the popup
        }
      });
    });
  });
});
