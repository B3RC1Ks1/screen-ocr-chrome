// scripts/selectionOverlay.js

const SelectionOverlay = (() => {
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
  
        State.setState({ selection: { ...State.getState().selection, isSelecting: true, startX: e.clientX, startY: e.clientY } });
  
        // Create the selection rectangle
        const selectionRect = document.createElement("div");
        Object.assign(selectionRect.style, {
          position: "fixed",
          border: "2px dashed #000",
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          left: `${e.clientX}px`,
          top: `${e.clientY}px`,
          zIndex: 1000000,
          pointerEvents: "none", // Allow mouse events to pass through
        });
        document.body.appendChild(selectionRect);
        State.setState({ selection: { ...State.getState().selection, selectionRect } });
      };
  
      const onMouseMove = (e) => {
        const currentState = State.getState();
        if (!currentState.selection.isSelecting) return;
  
        const { startX, startY, selectionRect } = currentState.selection;
  
        const currentX = e.clientX;
        const currentY = e.clientY;
  
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
  
        selectionRect.style.left = `${Math.min(startX, currentX)}px`;
        selectionRect.style.top = `${Math.min(startY, currentY)}px`;
        selectionRect.style.width = `${width}px`;
        selectionRect.style.height = `${height}px`;
      };
  
      const onMouseUp = (e) => {
        if (e.button !== 0 || !State.getState().selection.isSelecting) return;
        e.preventDefault();
  
        State.setState({ selection: { ...State.getState().selection, isSelecting: false } });
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
      const currentState = State.getState();
      if (!currentState.selection.selectionRect) return;
    
      // Get the bounding rectangle of the selection
      const rect = currentState.selection.selectionRect.getBoundingClientRect();
      const coords = {
        // Remove window.scrollX and window.scrollY to keep coordinates relative to the viewport
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    
      // Remove the selection rectangle from the DOM
      currentState.selection.selectionRect.remove();
      State.setState({ selection: { ...currentState.selection, selectionRect: null } });
    
      try {
        // Request the background script to capture the screenshot
        const response = await Communication.captureScreenshot(coords);
    
        if (response?.screenshotBase64) {
          const screenshotBase64 = response.screenshotBase64;
    
          // Crop the screenshot to the selected area
          const croppedDataUrl = await cropScreenshot(screenshotBase64, coords);
          Logger.log("Cropped screenshot:", croppedDataUrl);
    
          // Optionally open the screenshot in a new tab
          if (currentState.openScreenshot) {
            UI.openImageInNewTab(croppedDataUrl);
          }
    
          // Perform OCR on the cropped image
          OCR.ocrScreenshot(croppedDataUrl);
        } else {
          Logger.error("No screenshot data received from background script.");
        }
      } catch (err) {
        Logger.error("Error during selection finalization:", err);
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
  
    return {
      createSelectionOverlay,
      initSelectionHandlers
    };
  })();
  
  // Make SelectionOverlay available globally
  window.SelectionOverlay = SelectionOverlay;
  