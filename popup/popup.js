// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const startSelectionBtn = document.getElementById("start-selection");
  const openScreenshotCheckbox = document.getElementById("toggle-open-screenshot");
  const openOcrTextCheckbox = document.getElementById("toggle-open-ocr-text");
  const stealthModeCheckbox = document.getElementById("toggle-stealth-mode"); // New Checkbox
  const modelSelect = document.getElementById("model-select");
  const statusSpan = document.getElementById("status");

  // Load saved settings from chrome.storage.local
  chrome.storage.local.get(
    ["openScreenshot", "openOcrText", "selectedModel", "stealthMode"],
    ({ openScreenshot, openOcrText, selectedModel, stealthMode }) => {
      openScreenshotCheckbox.checked = openScreenshot !== undefined ? openScreenshot : false;
      openOcrTextCheckbox.checked = openOcrText !== undefined ? openOcrText : false;
      stealthModeCheckbox.checked = stealthMode !== undefined ? stealthMode : false; // Set Stealth Mode
      modelSelect.value = selectedModel || "gpt-4o"; // Set default model if not set

      // Update Logger's Stealth Mode immediately
      Logger.setStealthMode(stealthMode || false);
    }
  );

  // Save settings to chrome.storage.local whenever they change
  const saveSettings = () => {
    const settings = {
      openScreenshot: openScreenshotCheckbox.checked,
      openOcrText: openOcrTextCheckbox.checked,
      stealthMode: stealthModeCheckbox.checked, // Save Stealth Mode
      selectedModel: modelSelect.value,
    };
    chrome.storage.local.set(settings, () => {
      Logger.log("Settings saved:", settings);
    });
  };

  openScreenshotCheckbox.addEventListener("change", saveSettings);
  openOcrTextCheckbox.addEventListener("change", saveSettings);
  stealthModeCheckbox.addEventListener("change", saveSettings); // Listen for Stealth Mode changes
  modelSelect.addEventListener("change", saveSettings);

  // Check if Tesseract is loaded in the current active tab's content script.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTabId,
      { action: "check-tesseract-ready" },
      (response) => {
        if (chrome.runtime.lastError) {
          Logger.error(
            "No content script found or error:",
            chrome.runtime.lastError.message
          );
          statusSpan.textContent = "No content script found on this page.";
          statusSpan.style.color = "red";
          return;
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
      }
    );
  });

  // When the user clicks "Start OCR Selection"
  startSelectionBtn.addEventListener("click", () => {
    // Read the Stealth Mode setting
    chrome.storage.local.get(["stealthMode"], ({ stealthMode }) => {
      const isStealthMode = stealthMode || false;

      // Read other settings
      const openScreenshot = openScreenshotCheckbox.checked;
      const openOcrText = openOcrTextCheckbox.checked;
      const selectedModel = modelSelect.value;

      // Send a message to the content script to begin the overlay selection
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "start-ocr-selection",
          openScreenshot: openScreenshot,
          openOcrText: openOcrText,
          stealthMode: isStealthMode, // Include Stealth Mode flag
        });

        // Optionally close the popup to prevent blocking
        window.close();
      });
    });
  });
});
