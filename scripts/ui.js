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
   * Display the ChatGPT response discreetly based on Stealth Mode
   * @param {string} answer - The response from ChatGPT
   * @param {boolean} stealthMode - Whether Stealth Mode is enabled
   */
  const displayChatGptResponse = (answer, stealthMode) => {
    // Prevent multiple overlays
    if (document.getElementById("chatgpt-response-overlay")) return;

    // Create an overlay
    const overlay = document.createElement("div");
    overlay.id = "chatgpt-response-overlay";

    // Set styles based on Stealth Mode
    if (stealthMode) {
      Object.assign(overlay.style, {
        position: "fixed",
        bottom: "10px", // Retain original position
        right: "50px",  // Retain original position
        width: "200px",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        padding: "5px",
        borderRadius: "4px",
        boxShadow: "0 0 5px rgba(0,0,0,0.2)",
        opacity: "0.7",
        transition: "opacity 0.3s ease",
        zIndex: 1000001,
        pointerEvents: "none", // Allow clicks to pass through
        fontSize: "12px", // Smaller font for discretion
      });

      // Add content
      const content = document.createElement("div");
      content.innerHTML = `
          <p style="margin: 0;">${sanitizeHtml(answer)}</p>
        `;
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      // Automatically remove the overlay after a short duration in Stealth Mode
      setTimeout(() => {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 300);
      }, 3000); // Display for 3 seconds
    } else {
      Object.assign(overlay.style, {
        position: "fixed",
        bottom: "10px", // Original position
        right: "50px",  // Original position
        width: "300px",
        backgroundColor: "white",
        padding: "10px",
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.3)",
        zIndex: 1000001,
        cursor: "pointer", // Indicate clickable
        fontSize: "14px", // Standard font size
      });

      // Click anywhere on the overlay to remove it
      overlay.addEventListener("click", () => {
        overlay.remove();
      });

      // Add content
      const content = document.createElement("div");
      content.innerHTML = `
          <p style="margin: 0;">${sanitizeHtml(answer)}</p>
        `;
      overlay.appendChild(content);
      document.body.appendChild(overlay);
    }
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
