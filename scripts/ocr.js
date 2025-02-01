// scripts/ocr.js

const OCR = (function () {
  function ocrScreenshot(base64Image) {
    var currentState = State.getState();
    if (!currentState.tesseractReady || !window.Tesseract) {
      Logger.error("Tesseract.js is not loaded yet!");
      return;
    }
    window.Tesseract.recognize(base64Image, "eng+pol", {
      logger: function (m) {
        Logger.log("[Tesseract progress] " + JSON.stringify(m));
      },
    })
      .then(function (result) {
        var text = result.data.text;
        var extractedText = text.trim();
        Logger.log("OCR recognized text: " + extractedText);
        if (currentState.openOcrText) {
          UI.openTextInNewTab(extractedText);
        } else {
          Logger.log("OCR Text: " + extractedText);
        }
        Communication.sendOcrTextToBackground(extractedText);
      })
      .catch(function (err) {
        Logger.error("Tesseract OCR Error: " + err.message);
      });
  }

  return {
    ocrScreenshot: ocrScreenshot,
  };
})();

window.OCR = OCR;

