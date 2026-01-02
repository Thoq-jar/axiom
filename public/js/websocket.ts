interface SystemData {
  cpu_usage_percent?: number | null;
  memory?: {
    used: number;
    total: number;
    free: number;
  };
  gpu?: number | string | null;
  cpu_info?: {
    arch?: string;
    cores?: number;
    freq?: number;
    cache?: number;
    vendor?: string;
    model?: string;
  };
  processes?: Array<{
    name: string;
    cpu: number;
    mem: number;
  }>;
  error?: string;
}

type MessageHandler = (data: SystemData) => void;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let messageHandler: MessageHandler | null = null;

export function connectWebSocket(onMessage?: MessageHandler): void {
  if (onMessage) {
    messageHandler = onMessage;
  }

  const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${globalThis.location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      reconnectAttempts = 0;

      const savedInterval = localStorage.getItem("refreshInterval");
      if (savedInterval && ws) {
        ws.send(JSON.stringify({
          type: "setRefreshInterval",
          interval: parseInt(savedInterval, 10),
        }));
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SystemData;
        if (messageHandler) {
          messageHandler(data);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      if (messageHandler) {
        messageHandler({ error: "WebSocket error occurred" });
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      ws = null;

      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        console.log(
          `Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`,
        );
        setTimeout(() => {
          connectWebSocket(messageHandler!);
        }, delay);
      } else {
        if (messageHandler) {
          messageHandler({
            error: "Connection lost. Attempting to reconnect...",
          });
        }
      }
    };
  } catch (error) {
    console.error("Error creating WebSocket:", error);
    if (messageHandler) {
      messageHandler({ error: "Failed to connect to WebSocket" });
    }
  }
}

interface WebSocketMessage {
  type: string;
  interval?: number;
}

export function sendWebSocketMessage(message: WebSocketMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function getWebSocket(): WebSocket | null {
  return ws;
}
