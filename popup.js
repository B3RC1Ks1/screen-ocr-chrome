// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const startSelectionBtn = document.getElementById("start-selection");
  const openScreenshotCheckbox = document.getElementById("toggle-open-screenshot");
  const openOcrTextCheckbox = document.getElementById("toggle-open-ocr-text"); // Existing Checkbox
  const modelSelect = document.getElementById("model-select"); // Dropdown
  const currentModelSpan = document.getElementById("current-model"); // New Display Element
  const statusSpan = document.getElementById("status");

  // Load saved settings from chrome.storage.local
  chrome.storage.local.get(
    ["openScreenshot", "openOcrText", "selectedModel"],
    ({ openScreenshot, openOcrText, selectedModel }) => {
      openScreenshotCheckbox.checked =
        openScreenshot !== undefined ? openScreenshot : true;
      openOcrTextCheckbox.checked =
        openOcrText !== undefined ? openOcrText : true;
      modelSelect.value = selectedModel || "gpt-4o-mini"; // Set default model if not set

      // Update the selected model display
      currentModelSpan.textContent = modelSelect.options[modelSelect.selectedIndex].text;
    }
  );

  // Save settings to chrome.storage.local whenever they change
  const saveSettings = () => {
    const settings = {
      openScreenshot: openScreenshotCheckbox.checked,
      openOcrText: openOcrTextCheckbox.checked,
      selectedModel: modelSelect.value, // Save selected model
    };
    chrome.storage.local.set(settings, () => {
      console.log("Settings saved:", settings);
    });

    // Update the selected model display
    currentModelSpan.textContent = modelSelect.options[modelSelect.selectedIndex].text;
  };

  openScreenshotCheckbox.addEventListener("change", saveSettings);
  openOcrTextCheckbox.addEventListener("change", saveSettings);
  modelSelect.addEventListener("change", saveSettings); // Listen for dropdown changes

  // 1. Check if Tesseract is loaded in the current active tab's content script.
  //    We'll send a message: { action: "check-tesseract-ready" }.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTabId,
      { action: "check-tesseract-ready" },
      (response) => {
        // If there's an error or no content script, we'll see an error in chrome.runtime.lastError.
        if (chrome.runtime.lastError) {
          console.error(
            "No content script found or error:",
            chrome.runtime.lastError.message
          );
          statusSpan.textContent = "No content script found on this page.";
          statusSpan.style.color = "red";
          return;
        }

        // If the content script responds with tesseractReady = true
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

  // 2. When the user clicks "Start OCR Selection"
  startSelectionBtn.addEventListener("click", () => {
    // Read whether user wants to open screenshot in new tab
    const openScreenshot = openScreenshotCheckbox.checked;

    // Read whether user wants to open OCR text in new tab
    const openOcrText = openOcrTextCheckbox.checked;

    // Read the selected GPT model
    const selectedModel = modelSelect.value;

    // Save the selected model (optional, already handled by change listener)
    // chrome.storage.local.set({ selectedModel }, () => {
    //   console.log("Selected model saved:", selectedModel);
    // });

    // Send a message to the content script to begin the overlay selection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "start-ocr-selection",
        openScreenshot: openScreenshot,
        openOcrText: openOcrText,
      });

      // Optionally close the popup so it doesn't block screen area
      window.close();
    });
  });
});
