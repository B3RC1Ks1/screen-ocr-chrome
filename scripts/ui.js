// scripts/ui.js

const UI = (function () {
  function openTextInNewTab(text) {
    const textWin = window.open("", "_blank");
    if (textWin) {
      const htmlContent =
        '<!DOCTYPE html><html><head><title>OCR Result</title></head><body style="margin:20px; font-family: sans-serif;"><h1>Extracted Text</h1><pre style="white-space: pre-wrap;">' +
        sanitizeHtml(text) +
        "</pre></body></html>";
      textWin.document.write(htmlContent);
      textWin.document.close();
    } else {
      Logger.error("Failed to open new window for OCR result.");
    }
  }

  function openImageInNewTab(imageDataUrl) {
    const newWin = window.open("", "_blank");
    if (newWin) {
      const htmlContent =
        '<!DOCTYPE html><html><head><title>Screenshot</title></head><body style="margin:0;"><img src="' +
        imageDataUrl +
        '" alt="Cropped Screenshot" style="max-width:100%; height:auto;" /></body></html>';
      newWin.document.write(htmlContent);
      newWin.document.close();
    } else {
      Logger.error("Failed to open new window for screenshot.");
    }
  }

  function displayChatGptResponse(answer, stealthMode) {
    if (document.getElementById("chatgpt-response-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "chatgpt-response-overlay";
    if (stealthMode) {
      overlay.style.position = "fixed";
      overlay.style.bottom = "10px";
      overlay.style.right = "10px";
      overlay.style.color = "rgba(0, 0, 0, 0.6)";
      overlay.style.backgroundColor = "transparent";
      overlay.style.padding = "2px 4px";
      overlay.style.border = "none";
      overlay.style.borderRadius = "0px";
      overlay.style.fontSize = "10px";
      overlay.style.fontFamily = "Arial, sans-serif";
      overlay.style.zIndex = "1000001";
      overlay.style.pointerEvents = "none";
      overlay.style.whiteSpace = "pre-wrap";
      const content = document.createElement("span");
      content.textContent = answer;
      overlay.appendChild(content);
      document.body.appendChild(overlay);
      setTimeout(function () {
        overlay.style.opacity = "0";
        setTimeout(function () {
          overlay.remove();
        }, 300);
      }, 3000);
    } else {
      overlay.style.position = "fixed";
      overlay.style.bottom = "10px";
      overlay.style.right = "50px";
      overlay.style.width = "300px";
      overlay.style.backgroundColor = "white";
      overlay.style.padding = "10px";
      overlay.style.borderRadius = "8px";
      overlay.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
      overlay.style.zIndex = "1000001";
      overlay.style.cursor = "pointer";
      overlay.style.fontSize = "14px";
      overlay.style.fontFamily = "Arial, sans-serif";
      overlay.addEventListener("click", function () {
        overlay.remove();
      });
      const content = document.createElement("div");
      content.innerHTML = "<p style='margin: 0;'>" + sanitizeHtml(answer) + "</p>";
      overlay.appendChild(content);
      document.body.appendChild(overlay);
    }
  }

  function sanitizeHtml(html) {
    const div = document.createElement("div");
    div.textContent = html;
    return div.innerHTML;
  }

  return {
    openTextInNewTab: openTextInNewTab,
    openImageInNewTab: openImageInNewTab,
    displayChatGptResponse: displayChatGptResponse,
  };
})();

window.UI = UI;



