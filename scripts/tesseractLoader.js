// scripts/tesseractLoader.js

const TesseractLoader = (function () {
  function loadTesseractScript() {
    return new Promise(function (resolve, reject) {
      if (window.Tesseract) {
        Logger.log("Tesseract.js is already loaded.");
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("lib/tesseract.min.js");
      script.onload = function () {
        if (window.Tesseract) {
          Logger.log("Tesseract.js loaded successfully.");
          resolve();
        } else {
          reject(new Error("Tesseract.js did not initialize correctly."));
        }
      };
      script.onerror = function () {
        reject(new Error("Failed to load tesseract.min.js"));
      };
      document.head.appendChild(script);
    });
  }

  function initialize() {
    loadTesseractScript()
      .then(function () {
        State.setState({ tesseractReady: true });
        Logger.log("Tesseract.js is ready for use.");
      })
      .catch(function (error) {
        Logger.error("Error loading Tesseract.js: " + error.message);
      });
  }

  return {
    initialize: initialize,
  };
})();

TesseractLoader.initialize();


