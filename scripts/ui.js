// scripts/ui.js

const UI = (() => {
  /**
   * Open extracted text in a new tab
   * @param {string} text - The OCR extracted text
   */
  const openTextInNewTab = (text) => {
    const textWin = window.open("", "_blank");
    if (textWin) {
      textWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>OCR Result</title></head>
            <body style="margin:20px; font-family: sans-serif;">
              <h1>Extracted Text</h1>
              <pre style="white-space: pre-wrap;">${sanitizeHtml(text)}</pre>
            </body>
          </html>
        `);
      textWin.document.close();
    } else {
      Logger.error("Failed to open new window for OCR result.");
    }
  };

  /**
   * Open image in a new tab
   * @param {string} imageDataUrl - The Base64-encoded image data URL
   */
  const openImageInNewTab = (imageDataUrl) => {
    const newWin = window.open("", "_blank");
    if (newWin) {
      newWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Screenshot</title></head>
            <body style="margin:0;">
              <img src="${imageDataUrl}" alt="Cropped Screenshot" style="max-width:100%; height:auto;" />
            </body>
          </html>
        `);
      newWin.document.close();
    } else {
      Logger.error("Failed to open new window for screenshot.");
    }
  };

  /**
   * Display the ChatGPT response discretely and close on any click
   * @param {string} answer - The response from ChatGPT
   */
  const displayChatGptResponse = (answer) => {
    // Prevent multiple overlays
    if (document.getElementById("chatgpt-response-overlay")) return;

    // Create a transparent full-page overlay
    const overlay = document.createElement("div");
    overlay.id = "chatgpt-response-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.0)",
      zIndex: 1000001,
      cursor: "pointer",
    });

    // Create a content container
    const container = document.createElement("div");
    Object.assign(container.style, {
      position: "absolute",
      bottom: "10px",
      right: "50px",
      width: "300px",
      pointerEvents: "none", // allow clicks to pass through
      backgroundColor: "white",
      padding: "10px",
      borderRadius: "8px",
      boxShadow: "0 0 10px rgba(0,0,0,0.3)",
    });

    // Click anywhere to remove
    overlay.addEventListener("click", () => {
      overlay.remove();
    });

    // Add content
    const content = document.createElement("div");
    content.innerHTML = `
        <p style="margin: 0;">${sanitizeHtml(answer)}</p>
      `;
    container.appendChild(content);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  };

  /**
   * Sanitize HTML to prevent XSS attacks when injecting content into the page
   * @param {string} html - The HTML content to sanitize
   * @returns {string} - Sanitized HTML content
   */
  const sanitizeHtml = (html) => {
    const div = document.createElement("div");
    div.textContent = html;
    return div.innerHTML;
  };

  return {
    openTextInNewTab,
    openImageInNewTab,
    displayChatGptResponse,
  };
})();

// Make UI available globally
window.UI = UI;
