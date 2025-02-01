// scripts/logger.js

const Logger = (function () {
  let isStealthMode = false;

  chrome.storage.local.get(["stealthMode"], function (settings) {
    if (settings.stealthMode !== undefined) {
      isStealthMode = settings.stealthMode;
    } else {
      isStealthMode = false;
    }
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "local" && changes.stealthMode) {
      isStealthMode = changes.stealthMode.newValue;
    }
  });

  return {
    log: function (message) {
      if (!isStealthMode) {
        console.log("[LOG]: " + message);
      }
    },
    error: function (message) {
      if (!isStealthMode) {
        console.error("[ERROR]: " + message);
      }
    },
    warn: function (message) {
      if (!isStealthMode) {
        console.warn("[WARN]: " + message);
      }
    },
    setStealthMode: function (stealth) {
      isStealthMode = stealth;
    },
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.Logger = Logger;
} else if (typeof self !== "undefined") {
  self.Logger = Logger;
} else if (typeof window !== "undefined") {
  window.Logger = Logger;
}


