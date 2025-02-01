// scripts/ocr.js

const OCR = (() => {
  /**
   * Perform OCR on a Base64-encoded image using Tesseract.js.
   * @param {string} base64Image - DataURL of the cropped screenshot.
   */
  const ocrScreenshot = async (base64Image) => {
    const currentState = State.getState();
    if (!currentState.tesseractReady || !window.Tesseract) {
      Logger.error("Tesseract.js is not loaded yet!");
      return;
    }

    try {
      const { data: { text } } = await window.Tesseract.recognize(base64Image, "eng+pol", {
        logger: (m) => Logger.log("[Tesseract progress]", m),
      });

      const extractedText = text.trim();
      Logger.log("OCR recognized text:", extractedText);

      if (currentState.openOcrText) {
        UI.openTextInNewTab(extractedText);
      } else {
        Logger.log("OCR Text:", extractedText);
      }

      // Send the OCR text to the background script to query OpenAI
      await Communication.sendOcrTextToBackground(extractedText);
    } catch (err) {
      Logger.error("Tesseract OCR Error:", err);
    }
  };

  return {
    ocrScreenshot,
  };
})();

// Make OCR available globally
window.OCR = OCR;
