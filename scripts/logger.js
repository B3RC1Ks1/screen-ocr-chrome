// scripts/logger.js

const Logger = (() => {
  let isStealthMode = false;

  /**
   * Initialize the Logger by fetching the Stealth Mode setting.
   */
  const initialize = () => {
    chrome.storage.local.get(["stealthMode"], ({ stealthMode }) => {
      isStealthMode = stealthMode || false;
    });
  };

  /**
   * Optionally, allow dynamic updating of Stealth Mode.
   * This can be called whenever the Stealth Mode setting changes.
   * @param {boolean} stealth - Current Stealth Mode status.
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
    if (area === "local" && changes.stealthMode) {
      setStealthMode(changes.stealthMode.newValue);
    }
  });

  return {
    log,
    error,
    warn,
    setStealthMode, // Expose setter if needed elsewhere
  };
})();

// Make Logger available globally
window.Logger = Logger;
