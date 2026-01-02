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
let reconnectTimeout: number | null = null;
let isIntentionallyClosing = false;

export function connectWebSocket(onMessage?: MessageHandler): void {
  if (onMessage) {
    messageHandler = onMessage;
  }

  if (reconnectTimeout !== null) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  if (ws) {
    try {
      ws.close();
    } catch {
      null;
    }
    ws = null;
  }

  const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${globalThis.location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      reconnectAttempts = 0;
      isIntentionallyClosing = false;

      const savedInterval = localStorage.getItem("refreshInterval");
      if (savedInterval && ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: "setRefreshInterval",
            interval: parseInt(savedInterval, 10),
          }));
        } catch (error) {
          console.warn("Failed to send initial message:", error);
        }
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
      console.warn(
        "WebSocket error occurred, closing connection gracefully...",
        error,
      );
    };

    ws.onclose = (event: CloseEvent) => {
      const wasClean = event.wasClean;
      const code = event.code;
      const reason = event.reason || "Connection closed";

      console.log(
        `WebSocket disconnected${
          wasClean ? " cleanly" : ""
        } (code: ${code}, reason: ${reason})`,
      );

      ws = null;

      if (isIntentionallyClosing) {
        return;
      }

      if (code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);

        if (messageHandler) {
          messageHandler({
            error: `Connection lost. Reconnecting in ${
              Math.ceil(delay / 1000)
            }s... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`,
          });
        }

        console.log(
          `Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`,
        );

        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null;
          if (
            reconnectAttempts <= maxReconnectAttempts && !isIntentionallyClosing
          ) {
            connectWebSocket(messageHandler!);
          }
        }, delay) as unknown as number;
      } else if (reconnectAttempts >= maxReconnectAttempts) {
        if (messageHandler) {
          messageHandler({
            error: "Connection lost. Please refresh the page to reconnect.",
          });
        }
        console.error("Max reconnection attempts reached");
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
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.warn("Failed to send WebSocket message:", error);
      if (ws) {
        ws.close();
      }
    }
  }
}

export function closeWebSocket(): void {
  isIntentionallyClosing = true;
  if (reconnectTimeout !== null) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    try {
      ws.close(1000, "Intentional close");
    } catch {
      null;
    }
    ws = null;
  }
}

export function getWebSocket(): WebSocket | null {
  return ws;
}
