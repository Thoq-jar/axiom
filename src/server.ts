import { start_monitor } from "~/features/monitor.ts";

const PORT = 8000;
const PUBLIC_DIR = "./public";

const globalClients = new Set<WebSocket>();

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

async function runDockerCommand(
  args: string[],
): Promise<{ success: boolean; output: string; error?: string }> {
  const command = new Deno.Command("docker", { args });
  const { code, stdout, stderr } = await command.output();
  const output = new TextDecoder().decode(stdout);
  const error = new TextDecoder().decode(stderr);
  return { success: code === 0, output, error: error || undefined };
}

async function getContainers(): Promise<Container[]> {
  const { success, output } = await runDockerCommand([
    "ps",
    "-a",
    "--format",
    "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}|{{.CreatedAt}}",
  ]);

  if (!success) {
    console.error("Failed to get containers:", output);
    return [];
  }

  const containers = output.trim().split("\n").filter(Boolean).map((line) => {
    const [id, name, image, status, state, ports, created] = line.split("|");
    return { id, name, image, status, state, ports: ports || "-", created };
  });

  return containers;
}

// deno-lint-ignore no-explicit-any
async function runDockerInstall(app: any) {
  console.log(`Starting installation for: ${app.name}`);

  for (const step of app.install_steps) {
    let cmd: string[] = [];

    if (step.action === "pull_image") {
      cmd = ["docker", "pull", step.target];
    } else if (step.action === "run_container") {
      cmd = [
        "docker",
        "run",
        "-d",
        "--name",
        app.id,
        "--restart",
        "unless-stopped",
        app.deployment.image + ":" + app.deployment.tag,
      ];
    }

    if (cmd.length > 0) {
      const command = new Deno.Command(cmd[0], { args: cmd.slice(1) });
      const { success, stderr } = await command.output();
      if (!success) {
        console.error(`Step failed: ${new TextDecoder().decode(stderr)}`);
        break;
      }
    }
  }

  console.log(`Installation finished for: ${app.name}`);

  const message = JSON.stringify({
    type: "installation_finished",
    message: "installed finished???",
    app: app.name,
  });

  for (const client of globalClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

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
  globalClients.add(socket);

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
          socket.send(JSON.stringify({ type: "stats", data: stats }));
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
    globalClients.delete(socket);
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };

  return response;
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.endsWith("/") && url.pathname.length > 1
    ? url.pathname.slice(0, -1)
    : url.pathname;

  if (pathname === "/ws") {
    return handleWebSocket(req);
  }

  if (pathname === "/api/version") {
    return new Response("v1.0.1");
  }

  if (pathname === "/api/containers" && req.method === "GET") {
    try {
      const containers = await getContainers();
      return new Response(JSON.stringify(containers), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname.startsWith("/api/container/") && req.method === "POST") {
    try {
      const pathParts = pathname.split("/");
      const containerId = pathParts.pop();

      if (!containerId) {
        return new Response(
          JSON.stringify({ error: "Container ID required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const { action, image } = await req.json();

      let dockerArgs: string[] = [];

      if (action === "start") {
        dockerArgs = ["start", containerId!];
      } else if (action === "stop") {
        dockerArgs = ["stop", containerId!];
      } else if (action === "restart") {
        dockerArgs = ["restart", containerId!];
      } else if (action === "remove") {
        dockerArgs = ["rm", "-fv", containerId!];
        const removeResult = await runDockerCommand(dockerArgs);

        if (!removeResult.success) {
          return new Response(
            JSON.stringify({
              error: removeResult.error || "Failed to remove container",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (image) {
          const imageRemoveResult = await runDockerCommand([
            "rmi",
            "-f",
            image,
          ]);
          if (!imageRemoveResult.success) {
            return new Response(
              JSON.stringify({
                success: true,
                warning: "Container removed but failed to remove image",
              }),
              {
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = await runDockerCommand(dockerArgs);

      if (result.success) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(
          JSON.stringify({ error: result.error || "Unknown error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/install" && req.method === "POST") {
    try {
      const appData = await req.json();

      runDockerInstall(appData);

      return new Response(JSON.stringify({ status: "queued" }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid Request" }), {
        status: 400,
      });
    }
  }

  if (pathname === "/api/stats") {
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

  const staticResponse = await serveStaticFile(pathname);
  if (staticResponse) {
    return staticResponse;
  }

  return new Response("Not Found", { status: 404 });
}

export function startServer(port: number = PORT) {
  console.log(`Server running at http://localhost:${port}`);
  Deno.serve({ port }, handler);
}
