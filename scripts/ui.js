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

    if (stealthMode) {
      // Stealth Mode: Small, borderless, barely visible text in the corner
      Object.assign(overlay.style, {
        position: "fixed",
        bottom: "10px", // Position in the bottom-right corner
        right: "10px",
        color: "rgba(0, 0, 0, 0.6)", // Black color with slight opacity
        backgroundColor: "transparent", // No background
        padding: "2px 4px", // Minimal padding
        border: "none", // No border
        borderRadius: "0px", // No border radius
        fontSize: "10px", // Very small font size
        fontFamily: "Arial, sans-serif",
        zIndex: 1000001,
        pointerEvents: "none", // Allow clicks to pass through
        whiteSpace: "pre-wrap", // Preserve formatting
      });

      // Add content
      const content = document.createElement("span");
      content.textContent = answer; // Use textContent to prevent HTML injection
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      // Automatically remove the overlay after a short duration in Stealth Mode
      setTimeout(() => {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 300);
      }, 3000); // Display for 3 seconds
    } else {
      // Normal Mode: Standard overlay with borders and background
      Object.assign(overlay.style, {
        position: "fixed",
        bottom: "10px", // Original position
        right: "50px",
        width: "300px",
        backgroundColor: "white",
        padding: "10px",
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.3)",
        zIndex: 1000001,
        cursor: "pointer", // Indicate clickable
        fontSize: "14px", // Standard font size
        fontFamily: "Arial, sans-serif",
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
