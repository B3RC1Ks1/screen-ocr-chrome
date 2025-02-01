// scripts/selectionOverlay.js

const SelectionOverlay = (function () {
  function createSelectionOverlay(stealthMode) {
    const overlay = document.createElement("div");
    overlay.id = "my-ocr-overlay";
    if (stealthMode) {
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.background = "rgba(0, 0, 0, 0.02)";
      overlay.style.cursor = "default";
      overlay.style.zIndex = "999999";
      overlay.style.transition = "background 0.1s ease";
    } else {
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.background = "rgba(0, 0, 0, 0.2)";
      overlay.style.cursor = "crosshair";
      overlay.style.zIndex = "999999";
    }
    document.body.appendChild(overlay);
    return overlay;
  }

  function initSelectionHandlers(overlay, stealthMode) {
    function onMouseDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      const currentSelection = State.getState().selection;
      currentSelection.isSelecting = true;
      currentSelection.startX = e.clientX;
      currentSelection.startY = e.clientY;
      const selectionRect = document.createElement("div");
      if (stealthMode) {
        selectionRect.style.position = "fixed";
        selectionRect.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        selectionRect.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
        selectionRect.style.left = e.clientX + "px";
        selectionRect.style.top = e.clientY + "px";
        selectionRect.style.zIndex = "1000000";
        selectionRect.style.pointerEvents = "none";
      } else {
        selectionRect.style.position = "fixed";
        selectionRect.style.border = "2px dashed #000";
        selectionRect.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
        selectionRect.style.left = e.clientX + "px";
        selectionRect.style.top = e.clientY + "px";
        selectionRect.style.zIndex = "1000000";
        selectionRect.style.pointerEvents = "none";
      }
      document.body.appendChild(selectionRect);
      const stateSelection = State.getState().selection;
      stateSelection.selectionRect = selectionRect;
    }

    function onMouseMove(e) {
      const currentSelection = State.getState().selection;
      if (!currentSelection.isSelecting) return;
      const startX = currentSelection.startX;
      const startY = currentSelection.startY;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const selectionRect = currentSelection.selectionRect;
      selectionRect.style.left = Math.min(startX, currentX) + "px";
      selectionRect.style.top = Math.min(startY, currentY) + "px";
      selectionRect.style.width = width + "px";
      selectionRect.style.height = height + "px";
    }

    function onMouseUp(e) {
      if (e.button !== 0 || !State.getState().selection.isSelecting) return;
      e.preventDefault();
      const currentSelection = State.getState().selection;
      currentSelection.isSelecting = false;
      overlay.remove();
      finalizeSelection();
    }

    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.removedNodes.forEach(function (node) {
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
  }

  function finalizeSelection() {
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
    currentState.selection.selectionRect = null;
    Communication.captureScreenshot(coords)
      .then(function (response) {
        if (response && response.screenshotBase64) {
          const screenshotBase64 = response.screenshotBase64;
          cropScreenshot(screenshotBase64, coords)
            .then(function (croppedDataUrl) {
              Logger.log("Cropped screenshot: " + croppedDataUrl);
              chrome.storage.local.get(["stealthMode"], function (settings) {
                let isStealthMode;
                if (settings.stealthMode !== undefined) {
                  isStealthMode = settings.stealthMode;
                } else {
                  isStealthMode = false;
                }
                if (currentState.openScreenshot && !isStealthMode) {
                  UI.openImageInNewTab(croppedDataUrl);
                }
                OCR.ocrScreenshot(croppedDataUrl);
              });
            })
            .catch(function (error) {
              Logger.error("Error cropping screenshot: " + error.message);
            });
        } else {
          Logger.error("No screenshot data received from background script.");
        }
      })
      .catch(function (error) {
        Logger.error("Error during selection finalization: " + error.message);
      });
  }

  function cropScreenshot(base64, coords) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.src = base64;
      img.onload = function () {
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
          ctx.drawImage(img, scaledX, scaledY, scaledWidth, scaledHeight, 0, 0, scaledWidth, scaledHeight);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          reject(new Error("Failed to crop the screenshot: " + error.message));
        }
      };
      img.onerror = function () {
        reject(new Error("Failed to load the screenshot image for cropping."));
      };
    });
  }

  return {
    createSelectionOverlay: createSelectionOverlay,
    initSelectionHandlers: initSelectionHandlers,
  };
})();

window.SelectionOverlay = SelectionOverlay;



