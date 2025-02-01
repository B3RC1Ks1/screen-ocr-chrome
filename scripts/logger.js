// scripts/logger.js

const Logger = (() => {
  let isStealthMode = false;

  /**
   * Initialize the Logger by fetching the Stealth Mode setting.
   */
  const initialize = () => {
    chrome.storage.local.get(["stealthMode"], ({ stealthMode }) => {
      try {
        isStealthMode = stealthMode || false;
      } catch (error) {
        console.error("Error initializing Logger:", error);
        isStealthMode = false;
      }
    });
  };

  /**
   * Update the stealth mode.
   * @param {boolean} stealth - New stealth mode value.
   */
  const setStealthMode = (stealth) => {
    isStealthMode = stealth;
  };

  const log = (message, ...args) => {
    if (!isStealthMode) {
      console.log(`[LOG]: ${message}`, ...args);
    }
  };

  const error = (message, ...args) => {
    if (!isStealthMode) {
      console.error(`[ERROR]: ${message}`, ...args);
    }
  };

  const warn = (message, ...args) => {
    if (!isStealthMode) {
      console.warn(`[WARN]: ${message}`, ...args);
    }
  };

  // Initialize Logger on script load
  initialize();

  // Listen for changes in Stealth Mode setting
  chrome.storage.onChanged.addListener((changes, area) => {
    try {
      if (area === "local" && changes.stealthMode) {
        setStealthMode(changes.stealthMode.newValue);
      }
    } catch (error) {
      console.error("Error handling storage change in Logger:", error);
    }
  });

  return {
    log,
    error,
    warn,
    setStealthMode,
  };
})();

// Make Logger available globally
window.Logger = Logger;
