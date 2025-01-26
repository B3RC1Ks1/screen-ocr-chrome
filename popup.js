// popup.js

(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const startSelectionBtn = document.getElementById("start-selection");
    const openScreenshotCheckbox = document.getElementById("toggle-open-screenshot");
    const openOcrTextCheckbox = document.getElementById("toggle-open-ocr-text"); // New Checkbox
    const statusSpan = document.getElementById("status");

    /**
     * Initialize the popup by checking if Tesseract is ready in the active tab.
     */
    const initializePopup = async () => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!activeTab.id) {
          throw new Error("No active tab found.");
        }

        const response = await chrome.tabs.sendMessage(activeTab.id, { action: "check-tesseract-ready" });

        if (response?.tesseractReady) {
          statusSpan.textContent = "Tesseract ready!";
          statusSpan.style.color = "green";
          startSelectionBtn.disabled = false;
        } else {
          statusSpan.textContent = "Tesseract not yet loaded.";
          statusSpan.style.color = "orange";
          startSelectionBtn.disabled = true;
        }
      } catch (error) {
        console.error("Error initializing popup:", error);
        statusSpan.textContent = "No content script found on this page.";
        statusSpan.style.color = "red";
        startSelectionBtn.disabled = true;
      }
    };

    /**
     * Start OCR Selection by sending a message to the content script.
     */
    const startOcrSelection = async () => {
      try {
        startSelectionBtn.disabled = true;
        statusSpan.textContent = "Starting OCR Selection...";
        statusSpan.style.color = "blue";

        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!activeTab.id) {
          throw new Error("No active tab found.");
        }

        await chrome.tabs.sendMessage(activeTab.id, {
          action: "start-ocr-selection",
          openScreenshot: openScreenshotCheckbox.checked,
          openOcrText: openOcrTextCheckbox.checked
        });

        // Optionally close the popup so it doesn't block screen area
        window.close();
      } catch (error) {
        console.error("Error starting OCR selection:", error);
        statusSpan.textContent = "Failed to start OCR selection.";
        statusSpan.style.color = "red";
      }
    };

    // Event Listener for Start Selection Button
    startSelectionBtn.addEventListener("click", startOcrSelection);

    // Initialize the popup on load
    initializePopup();
  });
})();
