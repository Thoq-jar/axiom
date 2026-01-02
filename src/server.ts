import { start_monitor } from "~/features/monitor.ts";

const PORT = 8000;
const PUBLIC_DIR = "./public";

function getContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
  };
  return types[ext || ""] || "application/octet-stream";
}

async function serveStaticFile(path: string): Promise<Response | null> {
  try {
    const filePath = `${PUBLIC_DIR}${path === "/" ? "/index.html" : path}`;
    const fileInfo = await Deno.stat(filePath).catch(() => null);

    if (!fileInfo || !fileInfo.isFile) {
      return null;
    }

    const file = await Deno.readFile(filePath);
    const contentType = getContentType(filePath);

    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return null;
  }
}

function handleWebSocket(req: Request): Response {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() != "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clients = new Set<WebSocket>();
  clients.add(socket);

  let refreshInterval = 2000;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const startStreaming = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }

    const sendStats = async () => {
      try {
        const stats = await start_monitor();
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(stats));
        }
      } catch (error) {
        console.error("Error getting stats:", error);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ error: String(error) }));
        }
      }
    };

    sendStats();

    intervalId = setInterval(sendStats, refreshInterval);
  };

  socket.onopen = () => {
    console.log("WebSocket client connected");
    startStreaming();
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (
        message.type === "setRefreshInterval" &&
        typeof message.interval === "number"
      ) {
        refreshInterval = Math.max(100, Math.min(10000, message.interval));
        console.log(`Refresh interval updated to ${refreshInterval}ms`);
        startStreaming();
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket client disconnected");
    clients.delete(socket);
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };

  return response;
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/ws") {
    return handleWebSocket(req);
  }

  if (url.pathname === "/api/stats") {
    try {
      const stats = await start_monitor();
      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  const staticResponse = await serveStaticFile(url.pathname);
  if (staticResponse) {
    return staticResponse;
  }

  return new Response("Not Found", { status: 404 });
}

export function startServer(port: number = PORT) {
  console.log(`Server running at http://localhost:${port}`);
  Deno.serve({ port }, handler);
}
