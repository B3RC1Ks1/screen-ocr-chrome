// scripts/tesseractLoader.js

const TesseractLoader = (() => {
  const loadTesseractScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) {
        Logger.log("Tesseract.js is already loaded.");
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("lib/tesseract.min.js");
      script.onload = () => {
        if (window.Tesseract) {
          Logger.log("Tesseract.js loaded successfully.");
          resolve();
        } else {
          reject(new Error("Tesseract.js did not initialize correctly."));
        }
      };
      script.onerror = () => {
        reject(new Error("Failed to load tesseract.min.js"));
      };
      document.head.appendChild(script);
    });
  };

  const initialize = async () => {
    try {
      await loadTesseractScript();
      State.setState({ tesseractReady: true });
      Logger.log("Tesseract.js is ready for use.");
    } catch (error) {
      Logger.error("Error loading Tesseract.js:", error);
    }
  };

  return {
    initialize,
  };
})();

// Initialize Tesseract when the script loads
TesseractLoader.initialize();
