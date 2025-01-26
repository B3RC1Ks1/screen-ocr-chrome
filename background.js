chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "selection-complete") {
      // Capture the visible area of the active tab
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        sendResponse({ screenshotBase64: dataUrl });
      });
      // We will send the response asynchronously
      return true; 
    }
  });