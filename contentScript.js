// 1. Log to confirm the content script is running
console.log("Content script loaded");

// 2. Global variables
let openScreenshot = false;      // Controls whether to open the screenshot in a new tab
let openOcrText = false;         // Controls whether to open OCR text in a new tab
let tesseractReady = false;      // Tracks if Tesseract.js is loaded

/**
 * Dynamically load Tesseract.js from the extension's 'lib/tesseract.min.js'.
 * Ensure "lib/tesseract.min.js" is declared in manifest.json under web_accessible_resources.
 */
function loadTesseractScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // Get the correct path to the extension file
    script.src = chrome.runtime.getURL("lib/tesseract.min.js");
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Failed to load tesseract.min.js"));
    };
    document.head.appendChild(script);
  });
}

// Immediately load Tesseract.js when the content script starts
loadTesseractScript()
  .then(() => {
    tesseractReady = true;
    console.log("Tesseract.js loaded successfully!");
  })
  .catch((err) => {
    console.error("Error loading Tesseract.js:", err);
  });

/**
 * Perform OCR on a Base64-encoded image using Tesseract.js
 * @param {string} base64Image - DataURL of the cropped screenshot
 */
function ocrScreenshot(base64Image) {
  if (!tesseractReady || !window.Tesseract) {
    console.error("Tesseract.js is not loaded yet!");
    return;
  }

  Tesseract.recognize(base64Image, "eng+pol", {
    logger: (m) => console.log("[Tesseract progress]", m),
  })
    .then((result) => {
      const extractedText = result.data.text.trim();
      console.log("OCR recognized text:", extractedText);

      // Conditionally open a new tab with the OCR result based on user preference
      if (openOcrText) { // New Condition
        const textWin = window.open("", "_blank");
        if (textWin) {
          textWin.document.write(`
            <html>
              <head><title>OCR Result</title></head>
              <body style="margin:20px; font-family: sans-serif;">
                <h1>Extracted Text</h1>
                <pre style="white-space: pre-wrap;">${extractedText}</pre>
              </body>
            </html>
          `);
          textWin.document.close();
        } else {
          console.error("Failed to open new window for OCR result.");
        }
      } else {
        // If not opening OCR text in a new tab, you might want to handle it differently
        // For example, send the text to the background script or display it within the page
        console.log("OCR Text:", extractedText);
      }
    })
    .catch((err) => {
      console.error("Tesseract OCR Error:", err);
    });
}

/**
 * Listen for messages from the popup or other parts of the extension.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "check-tesseract-ready") {
    // Respond with the current status of Tesseract.js
    sendResponse({ tesseractReady });
    return; // Indicates that no asynchronous response will be sent
  }

  if (message.action === "start-ocr-selection") {
    console.log("[Content Script] Starting OCR Selection");

    // Update the flags based on the message
    openScreenshot = message.openScreenshot || false;
    openOcrText = message.openOcrText || false; // New Option

    // Remove any existing overlay to prevent duplicates
    const existingOverlay = document.getElementById("my-ocr-overlay");
    if (existingOverlay) existingOverlay.remove();

    // Create a new overlay and initialize selection handlers
    const overlay = createSelectionOverlay();
    initSelectionHandlers(overlay);
  }
});

/**
 * Create a full-page overlay for drag-selection.
 * @returns {HTMLDivElement} The overlay element.
 */
function createSelectionOverlay() {
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
}

// Variables to track the selection state
let isSelecting = false;
let startX = 0;
let startY = 0;
let selectionRect = null;

/**
 * Initialize mouse event handlers on the overlay for selection.
 * @param {HTMLDivElement} overlay - The overlay element.
 */
function initSelectionHandlers(overlay) {
  // Mouse down: Start selection
  overlay.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // Only respond to left-click
    e.preventDefault();

    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    // Create the selection rectangle
    selectionRect = document.createElement("div");
    Object.assign(selectionRect.style, {
      position: "fixed",
      border: "2px dashed #000",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      left: `${startX}px`,
      top: `${startY}px`,
      zIndex: 1000000,
      pointerEvents: "none", // Allow mouse events to pass through
    });
    document.body.appendChild(selectionRect);
  });

  // Mouse move: Update the selection rectangle's size
  overlay.addEventListener("mousemove", (e) => {
    if (!isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionRect.style.left = `${Math.min(startX, currentX)}px`;
    selectionRect.style.top = `${Math.min(startY, currentY)}px`;
    selectionRect.style.width = `${width}px`;
    selectionRect.style.height = `${height}px`;
  });

  // Mouse up: Finalize selection
  overlay.addEventListener("mouseup", (e) => {
    if (e.button !== 0 || !isSelecting) return;
    e.preventDefault();

    isSelecting = false;
    overlay.remove(); // Remove the overlay from the DOM
    finalizeSelection(); // Proceed to capture and process the screenshot
  });
}

/**
 * Finalize the user's selection by capturing and processing the screenshot.
 */
function finalizeSelection() {
  if (!selectionRect) return;

  // Get the bounding rectangle of the selection
  const rect = selectionRect.getBoundingClientRect();
  const coords = {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };

  // Remove the selection rectangle from the DOM
  selectionRect.remove();
  selectionRect = null;

  // Request the background script to capture the screenshot
  chrome.runtime.sendMessage({ action: "selection-complete", coords }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error capturing screenshot:", chrome.runtime.lastError.message);
      return;
    }

    if (response && response.screenshotBase64) {
      const screenshotBase64 = response.screenshotBase64;

      // Crop the screenshot to the selected area
      cropScreenshot(screenshotBase64, coords)
        .then((croppedDataUrl) => {
          console.log("Cropped screenshot:", croppedDataUrl);

          // Optionally open the screenshot in a new tab
          if (openScreenshot) {
            const newWin = window.open("", "_blank");
            if (newWin) {
              newWin.document.write(`
                <html>
                  <head><title>Screenshot</title></head>
                  <body style="margin:0;">
                    <img src="${croppedDataUrl}" style="max-width:100%; height:auto;" />
                  </body>
                </html>
              `);
              newWin.document.close();
            } else {
              console.error("Failed to open new window for screenshot.");
            }
          }

          // Perform OCR on the cropped image
          ocrScreenshot(croppedDataUrl);
        })
        .catch((err) => {
          console.error("Error cropping screenshot:", err);
        });
    } else {
      console.error("No screenshot data received from background script.");
    }
  });
}

/**
 * Crop the captured screenshot to the specified coordinates.
 * @param {string} base64 - The full screenshot as a Base64-encoded PNG data URL.
 * @param {{x: number, y: number, width: number, height: number}} coords - The coordinates for cropping.
 * @returns {Promise<string>} A promise that resolves to the cropped image as a Base64-encoded PNG data URL.
 */
async function cropScreenshot(base64, coords) {
  return new Promise((resolve, reject) => {
    // Create an Image object from the Base64 data
    const img = new Image();
    img.src = base64;

    img.onload = () => {
      try {
        // Adjust for device pixel ratio if necessary
        const scale = window.devicePixelRatio || 1;
        const scaledX = coords.x * scale;
        const scaledY = coords.y * scale;
        const scaledWidth = coords.width * scale;
        const scaledHeight = coords.height * scale;

        // Create a canvas to draw the cropped image
        const canvas = document.createElement("canvas");
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        const ctx = canvas.getContext("2d");

        // Draw the cropped area onto the canvas
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

        // Convert the canvas to a Base64-encoded PNG data URL
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
}
