// scripts/ui.js

const UI = (() => {
  /**
   * Open extracted text in a new tab.
   * @param {string} text - The OCR extracted text.
   */
  const openTextInNewTab = (text) => {
    try {
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
    } catch (error) {
      Logger.error("Error opening text in new tab:", error);
    }
  };

  /**
   * Open image in a new tab.
   * @param {string} imageDataUrl - The Base64-encoded image data URL.
   */
  const openImageInNewTab = (imageDataUrl) => {
    try {
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
    } catch (error) {
      Logger.error("Error opening image in new tab:", error);
    }
  };

  /**
   * Display the ChatGPT response discreetly based on Stealth Mode.
   * @param {string} answer - The response from ChatGPT.
   * @param {boolean} stealthMode - Whether Stealth Mode is enabled.
   */
  const displayChatGptResponse = (answer, stealthMode) => {
    try {
      // Prevent multiple overlays
      if (document.getElementById("chatgpt-response-overlay")) return;

      const overlay = document.createElement("div");
      overlay.id = "chatgpt-response-overlay";

      if (stealthMode) {
        Object.assign(overlay.style, {
          position: "fixed",
          bottom: "10px",
          right: "10px",
          color: "rgba(0, 0, 0, 0.6)",
          backgroundColor: "transparent",
          padding: "2px 4px",
          border: "none",
          borderRadius: "0px",
          fontSize: "10px",
          fontFamily: "Arial, sans-serif",
          zIndex: "1000001",
          pointerEvents: "none",
          whiteSpace: "pre-wrap",
        });

        const content = document.createElement("span");
        content.textContent = answer;
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        setTimeout(() => {
          overlay.style.opacity = "0";
          setTimeout(() => overlay.remove(), 300);
        }, 3000); // Display for 3 seconds
      } else {
        Object.assign(overlay.style, {
          position: "fixed",
          bottom: "10px",
          right: "50px",
          width: "300px",
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
          zIndex: "1000001",
          cursor: "pointer",
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
        });

        overlay.addEventListener("click", () => {
          overlay.remove();
        });

        const content = document.createElement("div");
        content.innerHTML = `<p style="margin: 0;">${sanitizeHtml(answer)}</p>`;
        overlay.appendChild(content);
        document.body.appendChild(overlay);
      }
    } catch (error) {
      Logger.error("Error displaying ChatGPT response:", error);
    }
  };

  /**
   * Sanitize HTML to prevent XSS attacks.
   * @param {string} html - The HTML content to sanitize.
   * @returns {string} Sanitized HTML content.
   */
  const sanitizeHtml = (html) => {
    try {
      const div = document.createElement("div");
      div.textContent = html;
      return div.innerHTML;
    } catch (error) {
      Logger.error("Error sanitizing HTML:", error);
      return html;
    }
  };

  return {
    openTextInNewTab,
    openImageInNewTab,
    displayChatGptResponse,
  };
})();

// Make UI available globally
window.UI = UI;

