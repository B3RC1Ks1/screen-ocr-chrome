// scripts/logger.js

const Logger = (() => {
    const log = (message, ...args) => {
      console.log(`[LOG]: ${message}`, ...args);
    };
  
    const error = (message, ...args) => {
      console.error(`[ERROR]: ${message}`, ...args);
    };
  
    const warn = (message, ...args) => {
      console.warn(`[WARN]: ${message}`, ...args);
    };
  
    return {
      log,
      error,
      warn
    };
  })();
  
  // Make Logger available globally
  window.Logger = Logger;
  