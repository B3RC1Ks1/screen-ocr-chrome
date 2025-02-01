// scripts/selectionOverlay.js

const SelectionOverlay = (() => {
  /**
   * Create a full-page overlay for drag-selection.
   * @param {boolean} stealthMode - Whether Stealth Mode is enabled.
   * @returns {HTMLDivElement} The overlay element.
   */
  const createSelectionOverlay = (stealthMode) => {
    const overlay = document.createElement("div");
    overlay.id = "my-ocr-overlay";

    if (stealthMode) {
      Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.02)",
        cursor: "default",
        zIndex: "999999",
        transition: "background 0.1s ease",
      });
    } else {
      Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.2)",
        cursor: "crosshair",
        zIndex: "999999",
      });
    }

    document.body.appendChild(overlay);
    return overlay;
  };

  /**
   * Initialize mouse event handlers on the overlay for selection.
   * @param {HTMLDivElement} overlay - The overlay element.
   * @param {boolean} stealthMode - Whether Stealth Mode is enabled.
   */
  const initSelectionHandlers = (overlay, stealthMode) => {
    const onMouseDown = (e) => {
      try {
        if (e.button !== 0) return; // Only left-click
        e.preventDefault();

        const currentSelection = State.getState().selection;
        State.setState({
          selection: {
            ...currentSelection,
            isSelecting: true,
            startX: e.clientX,
            startY: e.clientY,
          },
        });

        // Create the selection rectangle
        const selectionRect = document.createElement("div");
        if (stealthMode) {
          Object.assign(selectionRect.style, {
            position: "fixed",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            left: `${e.clientX}px`,
            top: `${e.clientY}px`,
            zIndex: "1000000",
            pointerEvents: "none",
          });
        } else {
          Object.assign(selectionRect.style, {
            position: "fixed",
            border: "2px dashed #000",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            left: `${e.clientX}px`,
            top: `${e.clientY}px`,
            zIndex: "1000000",
            pointerEvents: "none",
          });
        }

        document.body.appendChild(selectionRect);
        State.setState({
          selection: { ...State.getState().selection, selectionRect: selectionRect },
        });
      } catch (error) {
        Logger.error("Error in onMouseDown handler:", error);
      }
    };

    const onMouseMove = (e) => {
      try {
        const currentSelection = State.getState().selection;
        if (!currentSelection.isSelecting) return;

        const { startX, startY, selectionRect } = currentSelection;
        const currentX = e.clientX;
        const currentY = e.clientY;
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selectionRect.style.left = `${Math.min(startX, currentX)}px`;
        selectionRect.style.top = `${Math.min(startY, currentY)}px`;
        selectionRect.style.width = `${width}px`;
        selectionRect.style.height = `${height}px`;
      } catch (error) {
        Logger.error("Error in onMouseMove handler:", error);
      }
    };

    const onMouseUp = (e) => {
      try {
        if (e.button !== 0 || !State.getState().selection.isSelecting) return;
        e.preventDefault();

        const currentSelection = State.getState().selection;
        State.setState({
          selection: { ...currentSelection, isSelecting: false },
        });
        overlay.remove(); // Remove overlay
        finalizeSelection(); // Proceed to process the screenshot
      } catch (error) {
        Logger.error("Error in onMouseUp handler:", error);
      }
    };

    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);

    // Cleanup event listeners if overlay is removed unexpectedly
    const observer = new MutationObserver((mutations) => {
      try {
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
      } catch (error) {
        Logger.error("Error in MutationObserver:", error);
      }
    });
    observer.observe(document.body, { childList: true });
  };

  /**
   * Finalize the user's selection by capturing and processing the screenshot.
   */
  const finalizeSelection = async () => {
    try {
      const currentState = State.getState();
      if (!currentState.selection.selectionRect) return;

      const rect = currentState.selection.selectionRect.getBoundingClientRect();
      const coords = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };

      currentState.selection.selectionRect.remove();
      State.setState({
        selection: { ...currentState.selection, selectionRect: null },
      });

      const response = await Communication.captureScreenshot(coords);
      if (response && response.screenshotBase64) {
        const screenshotBase64 = response.screenshotBase64;
        const croppedDataUrl = await cropScreenshot(screenshotBase64, coords);
        Logger.log("Cropped screenshot:", croppedDataUrl);

        chrome.storage.local.get(["stealthMode"], ({ stealthMode }) => {
          try {
            let isStealthMode = stealthMode;
            if (isStealthMode === undefined) {
              isStealthMode = false;
            }

            if (currentState.openScreenshot && !isStealthMode) {
              UI.openImageInNewTab(croppedDataUrl);
            }

            OCR.ocrScreenshot(croppedDataUrl);
          } catch (error) {
            Logger.error("Error processing final selection:", error);
          }
        });
      } else {
        Logger.error("No screenshot data received from background script.");
      }
    } catch (error) {
      Logger.error("Error during selection finalization:", error);
    }
  };

  /**
   * Crop the captured screenshot to the specified coordinates.
   * @param {string} base64 - The full screenshot as a Base64-encoded PNG data URL.
   * @param {{x: number, y: number, width: number, height: number}} coords - Cropping coordinates.
   * @returns {Promise<string>} Promise resolving to the cropped image as a Base64-encoded PNG.
   */
  const cropScreenshot = (base64, coords) => {
    return new Promise((resolve, reject) => {
      try {
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
      } catch (error) {
        reject(new Error("Error in cropScreenshot: " + error.message));
      }
    });
  };

  return {
    createSelectionOverlay,
    initSelectionHandlers,
  };
})();

// Make SelectionOverlay available globally
window.SelectionOverlay = SelectionOverlay;

