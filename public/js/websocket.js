let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let messageHandler = null;

export function connectWebSocket(onMessage) {
  if (onMessage) {
    messageHandler = onMessage;
  }

  const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${globalThis.location.host}/ws`;
  
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      const errorBanner = document.getElementById("errorBanner");
      if (errorBanner) errorBanner.style.display = "none";
      reconnectAttempts = 0;
      
      const savedInterval = localStorage.getItem('refreshInterval');
      if (savedInterval) {
        ws.send(JSON.stringify({
          type: 'setRefreshInterval',
          interval: parseInt(savedInterval, 10)
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error("Error from server:", data.error);
          const errorBanner = document.getElementById("errorBanner");
          if (errorBanner) errorBanner.style.display = "block";
        } else {
          if (messageHandler) {
            messageHandler(data);
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      const errorBanner = document.getElementById("errorBanner");
      if (errorBanner) errorBanner.style.display = "block";
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      ws = null;
      
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
        reconnectTimeout = setTimeout(() => connectWebSocket(messageHandler), delay);
      } else {
        const errorBanner = document.getElementById("errorBanner");
        if (errorBanner) errorBanner.style.display = "block";
      }
    };
  } catch (error) {
    console.error("Error creating WebSocket:", error);
    const errorBanner = document.getElementById("errorBanner");
    if (errorBanner) errorBanner.style.display = "block";
  }
}

export function sendWebSocketMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function getWebSocket() {
  return ws;
}

