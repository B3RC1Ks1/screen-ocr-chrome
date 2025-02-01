// /popup/popup.js

document.addEventListener("DOMContentLoaded", () => {
  const startSelectionBtn = document.getElementById("start-selection");
  const openScreenshotCheckbox = document.getElementById("toggle-open-screenshot");
  const openOcrTextCheckbox = document.getElementById("toggle-open-ocr-text");
  const stealthModeCheckbox = document.getElementById("toggle-stealth-mode");
  const modelSelect = document.getElementById("model-select");
  const statusSpan = document.getElementById("status");

  // Load saved settings from chrome.storage.local
  chrome.storage.local.get(
    ["openScreenshot", "openOcrText", "selectedModel", "stealthMode"],
    (settings) => {
      try {
        let openScreenshot = settings.openScreenshot;
        if (openScreenshot === undefined) {
          openScreenshot = false;
        }
        openScreenshotCheckbox.checked = openScreenshot;

        let openOcrText = settings.openOcrText;
        if (openOcrText === undefined) {
          openOcrText = false;
        }
        openOcrTextCheckbox.checked = openOcrText;

        let stealthMode = settings.stealthMode;
        if (stealthMode === undefined) {
          stealthMode = false;
        }
        stealthModeCheckbox.checked = stealthMode;

        let selectedModel = settings.selectedModel;
        if (selectedModel === undefined || selectedModel === null || selectedModel === "") {
          selectedModel = "gpt-4o";
        }
        modelSelect.value = selectedModel;

        // Update Logger's Stealth Mode immediately
        Logger.setStealthMode(stealthMode);
      } catch (error) {
        Logger.error("Error loading settings:", error);
      }
    }
  );

  // Save settings to chrome.storage.local whenever they change
  const saveSettings = () => {
    const settings = {
      openScreenshot: openScreenshotCheckbox.checked,
      openOcrText: openOcrTextCheckbox.checked,
      stealthMode: stealthModeCheckbox.checked,
      selectedModel: modelSelect.value,
    };
    chrome.storage.local.set(settings, () => {
      try {
        Logger.log("Settings saved:", settings);
      } catch (error) {
        Logger.error("Error saving settings:", error);
      }
    });
  };

  openScreenshotCheckbox.addEventListener("change", saveSettings);
  openOcrTextCheckbox.addEventListener("change", saveSettings);
  stealthModeCheckbox.addEventListener("change", saveSettings);
  modelSelect.addEventListener("change", saveSettings);

  // Check if Tesseract is loaded in the current active tab's content script.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      if (!tabs || tabs.length === 0) {
        statusSpan.textContent = "No active tab found.";
        statusSpan.style.color = "red";
        return;
      }
      const activeTabId = tabs[0].id;

      chrome.tabs.sendMessage(
        activeTabId,
        { action: "check-tesseract-ready" },
        (response) => {
          try {
            if (chrome.runtime.lastError) {
              throw new Error(chrome.runtime.lastError.message);
            }
            if (response && response.tesseractReady === true) {
              statusSpan.textContent = "Tesseract ready!";
              statusSpan.style.color = "green";
              startSelectionBtn.disabled = false; // enable the button
            } else {
              statusSpan.textContent = "Tesseract not yet loaded.";
              statusSpan.style.color = "orange";
              startSelectionBtn.disabled = true;
            }
          } catch (err) {
            Logger.error("Error checking Tesseract readiness:", err);
            statusSpan.textContent = "Error: " + err.message;
            statusSpan.style.color = "red";
          }
        }
      );
    } catch (error) {
      Logger.error("Error querying active tab:", error);
      statusSpan.textContent = "Error querying active tab.";
      statusSpan.style.color = "red";
    }
  });

  // When the user clicks "Start OCR Selection"
  startSelectionBtn.addEventListener("click", () => {
    chrome.storage.local.get(["stealthMode"], (settings) => {
      try {
        let isStealthMode = settings.stealthMode;
        if (isStealthMode === undefined) {
          isStealthMode = false;
        }

        const openScreenshot = openScreenshotCheckbox.checked;
        const openOcrText = openOcrTextCheckbox.checked;
        const selectedModel = modelSelect.value;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          try {
            if (tabs && tabs.length > 0) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "start-ocr-selection",
                openScreenshot: openScreenshot,
                openOcrText: openOcrText,
                stealthMode: isStealthMode,
              });
              // Optionally close the popup to prevent blocking
              window.close();
            }
          } catch (error) {
            Logger.error("Error sending start selection message:", error);
          }
        });
      } catch (error) {
        Logger.error("Error retrieving stealthMode setting:", error);
      }
    });
  });
});

