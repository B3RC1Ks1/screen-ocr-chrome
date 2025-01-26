(() => {
  // 1. Log to confirm the content script is running
  console.log("Content script loaded");

  // 2. State Management
  const state = {
    openScreenshot: false,
    openOcrText: false,
    tesseractReady: false,
    selection: {
      isSelecting: false,
      startX: 0,
      startY: 0,
      selectionRect: null,
    },
  };

  /**
   * Dynamically load Tesseract.js from the extension's 'lib/tesseract.min.js'.
   * Ensure "lib/tesseract.min.js" is declared in manifest.json under web_accessible_resources.
   */
  const loadTesseractScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) {
        console.log("Tesseract.js is already loaded.");
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("lib/tesseract.min.js");
      script.onload = () => {
        if (window.Tesseract) {
          resolve();
        } else {
          reject(new Error("Tesseract.js did not initialize correctly."));
        }
      };
      script.onerror = () => {
        reject(new Error("Failed to load tesseract.min.js"));
      };
      document.head.appendChild(script);
    });
  };

  // Immediately load Tesseract.js when the content script starts
  loadTesseractScript()
    .then(() => {
      state.tesseractReady = true;
      console.log("Tesseract.js loaded successfully!");
    })
    .catch((err) => {
      console.error("Error loading Tesseract.js:", err);
    });

  /**
   * Perform OCR on a Base64-encoded image using Tesseract.js
   * @param {string} base64Image - DataURL of the cropped screenshot
   */
  const ocrScreenshot = async (base64Image) => {
    if (!state.tesseractReady || !window.Tesseract) {
      console.error("Tesseract.js is not loaded yet!");
      return;
    }

    try {
      const { data: { text } } = await window.Tesseract.recognize(base64Image, "eng+pol", {
        logger: (m) => console.log("[Tesseract progress]", m),
      });

      const extractedText = text.trim();
      console.log("OCR recognized text:", extractedText);

      if (state.openOcrText) {
        openTextInNewTab(extractedText);
      } else {
        console.log("OCR Text:", extractedText);
      }

      // Send the OCR text to the background script to query OpenAI
      await sendOcrTextToBackground(extractedText);
    } catch (err) {
      console.error("Tesseract OCR Error:", err);
    }
  };

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
      console.error("Failed to open new window for OCR result.");
    }
  };

  /**
   * Send the OCR text to the background script for processing with OpenAI
   * @param {string} text - The extracted OCR text
   */
  const sendOcrTextToBackground = (text) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "send-ocr-text", text }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message to background script:", chrome.runtime.lastError.message);
          resolve();
          return;
        }

        if (response?.answer) {
          console.log("Received answer from OpenAI:", response.answer);
          displayChatGptResponse(response.answer);
        } else if (response?.error) {
          console.error("Error from background script:", response.error);
        } else {
          console.error("No response received from background script.");
        }
        resolve();
      });
    });
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
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  };

  /**
   * Listen for messages from the popup or other parts of the extension.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case "check-tesseract-ready":
        sendResponse({ tesseractReady: state.tesseractReady });
        break;

      case "start-ocr-selection":
        console.log("[Content Script] Starting OCR Selection");
        state.openScreenshot = message.openScreenshot || false;
        state.openOcrText = message.openOcrText || false;

        // Remove any existing overlay to prevent duplicates
        const existingOverlay = document.getElementById("my-ocr-overlay");
        if (existingOverlay) existingOverlay.remove();

        // Create a new overlay and initialize selection handlers
        const overlay = createSelectionOverlay();
        initSelectionHandlers(overlay);
        sendResponse({ status: 'Selection overlay started.' });
        break;

      default:
        console.warn("Unknown action:", message.action);
    }
  });

  /**
   * Create a full-page overlay for drag-selection.
   * @returns {HTMLDivElement} The overlay element.
   */
  const createSelectionOverlay = () => {
    const overlay = document.createElement("div");
    overlay.id = "my-ocr-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.2)",
      cursor: "crosshair",
      zIndex: 999999,
    });
    document.body.appendChild(overlay);
    return overlay;
  };

  /**
   * Initialize mouse event handlers on the overlay for selection.
   * @param {HTMLDivElement} overlay - The overlay element.
   */
  const initSelectionHandlers = (overlay) => {
    const onMouseDown = (e) => {
      if (e.button !== 0) return; // Only respond to left-click
      e.preventDefault();

      state.selection.isSelecting = true;
      state.selection.startX = e.clientX;
      state.selection.startY = e.clientY;

      // Create the selection rectangle
      state.selection.selectionRect = document.createElement("div");
      Object.assign(state.selection.selectionRect.style, {
        position: "fixed",
        border: "2px dashed #000",
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        left: `${state.selection.startX}px`,
        top: `${state.selection.startY}px`,
        zIndex: 1000000,
        pointerEvents: "none", // Allow mouse events to pass through
      });
      document.body.appendChild(state.selection.selectionRect);
    };

    const onMouseMove = (e) => {
      if (!state.selection.isSelecting) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      const width = Math.abs(currentX - state.selection.startX);
      const height = Math.abs(currentY - state.selection.startY);

      state.selection.selectionRect.style.left = `${Math.min(state.selection.startX, currentX)}px`;
      state.selection.selectionRect.style.top = `${Math.min(state.selection.startY, currentY)}px`;
      state.selection.selectionRect.style.width = `${width}px`;
      state.selection.selectionRect.style.height = `${height}px`;
    };

    const onMouseUp = (e) => {
      if (e.button !== 0 || !state.selection.isSelecting) return;
      e.preventDefault();

      state.selection.isSelecting = false;
      overlay.remove(); // Remove the overlay from the DOM
      finalizeSelection(); // Proceed to capture and process the screenshot
    };

    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);

    // Cleanup event listeners if the overlay is removed unexpectedly
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === overlay) {
            overlay.removeEventListener("mousedown", onMouseDown);
            overlay.removeEventListener("mousemove", onMouseMove);
            overlay.removeEventListener("mouseup", onMouseUp);
            observer.disconnect();
          }
        });
      });
    });

    observer.observe(document.body, { childList: true });
  };

  /**
   * Finalize the user's selection by capturing and processing the screenshot.
   */
  const finalizeSelection = async () => {
    if (!state.selection.selectionRect) return;

    // Get the bounding rectangle of the selection
    const rect = state.selection.selectionRect.getBoundingClientRect();
    const coords = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };

    // Remove the selection rectangle from the DOM
    state.selection.selectionRect.remove();
    state.selection.selectionRect = null;

    try {
      // Request the background script to capture the screenshot
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "selection-complete", coords }, (resp) => {
          resolve(resp);
        });
      });

      if (chrome.runtime.lastError) {
        console.error("Error capturing screenshot:", chrome.runtime.lastError.message);
        return;
      }

      if (response?.screenshotBase64) {
        const screenshotBase64 = response.screenshotBase64;

        // Crop the screenshot to the selected area
        const croppedDataUrl = await cropScreenshot(screenshotBase64, coords);
        console.log("Cropped screenshot:", croppedDataUrl);

        // Optionally open the screenshot in a new tab
        if (state.openScreenshot) {
          openImageInNewTab(croppedDataUrl);
        }

        // Perform OCR on the cropped image
        ocrScreenshot(croppedDataUrl);
      } else {
        console.error("No screenshot data received from background script.");
      }
    } catch (err) {
      console.error("Error during selection finalization:", err);
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
      console.error("Failed to open new window for screenshot.");
    }
  };

  /**
   * Crop the captured screenshot to the specified coordinates.
   * @param {string} base64 - The full screenshot as a Base64-encoded PNG data URL.
   * @param {{x: number, y: number, width: number, height: number}} coords - The coordinates for cropping.
   * @returns {Promise<string>} A promise that resolves to the cropped image as a Base64-encoded PNG data URL.
   */
  const cropScreenshot = (base64, coords) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64;

      img.onload = () => {
        try {
          const scale = window.devicePixelRatio || 1;
          const scaledX = coords.x * scale;
          const scaledY = coords.y * scale;
          const scaledWidth = coords.width * scale;
          const scaledHeight = coords.height * scale;

          const canvas = document.createElement("canvas");
          canvas.width = scaledWidth;
          canvas.height = scaledHeight;
          const ctx = canvas.getContext("2d");

          ctx.drawImage(
            img,
            scaledX,
            scaledY,
            scaledWidth,
            scaledHeight,
            0,
            0,
            scaledWidth,
            scaledHeight
          );

          const croppedDataUrl = canvas.toDataURL("image/png");
          resolve(croppedDataUrl);
        } catch (error) {
          reject(new Error("Failed to crop the screenshot: " + error.message));
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load the screenshot image for cropping."));
      };
    });
  };
})();
