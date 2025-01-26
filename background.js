chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "selection-complete") {
      // Capture the visible area of the active tab
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        sendResponse({ screenshotBase64: dataUrl });
      });
      // We will send the response asynchronously
      return true; 
    }

    if (request.action === "send-ocr-text") {
      const ocrText = request.text;
  
      // Define your server's URL
      const SERVER_URL = "http://localhost:3000/chat"; // Replace with your actual server URL
  
      // Send POST request to server
      fetch(SERVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "If you see multiple choice test like A,B,C and so on, return just an answer, without any elaboration or additional text\n" + ocrText
        }),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Server responded with status ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.response) {
            sendResponse({ answer: data.response });
          } else {
            throw new Error("Invalid response structure from server.");
          }
        })
        .catch((error) => {
          console.error("Error communicating with server:", error);
          sendResponse({ error: error.message });
        });
  
      // Indicate that the response will be sent asynchronously
      return true;
    }
});