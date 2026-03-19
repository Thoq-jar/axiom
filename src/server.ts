import { start_monitor } from "~/src/monitor.ts";
import { detectAttachedDisks } from "~/src/disks.ts";

const PORT = 9598;
const HTTPS_PORT = 443;
const HTTP_PORT = 80;
const PROD = Deno.env.get("AXIOM_PROD") === "1";
const AXIOM_DOMAIN = Deno.env.get("AXIOM_DOMAIN") ?? "";
const TLS_CERT = `/etc/letsencrypt/live/${AXIOM_DOMAIN}/fullchain.pem`;
const TLS_KEY = `/etc/letsencrypt/live/${AXIOM_DOMAIN}/privkey.pem`;
const PUBLIC_DIR = PROD
  ? `${new URL("../dist", import.meta.url).pathname}`
  : `${new URL("../public", import.meta.url).pathname}`;

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

async function isDockerRunning(): Promise<boolean> {
  const { success } = await runDockerCommand(["info", "--format", "ok"]);
  return success;
}

async function getContainers(): Promise<
  { containers: Container[] } | { error: string }
> {
  const { success, output, error } = await runDockerCommand([
    "ps",
    "-a",
    "--format",
    "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}|{{.CreatedAt}}",
  ]);

  if (!success) {
    const msg = error?.includes("Cannot connect") ||
        error?.includes("Is the docker daemon running")
      ? "Docker is not running"
      : "Failed to reach Docker";
    console.error("Failed to get containers:", error || output);
    return { error: msg };
  }

  const containers = output.trim().split("\n").filter(Boolean).map((line) => {
    const [id, name, image, status, state, ports, created] = line.split("|");
    return { id, name, image, status, state, ports: ports || "-", created };
  });

  return { containers };
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
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
    mp4: "video/mp4",
    mkv: "video/x-matroska",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    m4v: "video/mp4",
    mp3: "audio/mpeg",
    flac: "audio/flac",
    wav: "audio/wav",
    aac: "audio/aac",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    opus: "audio/opus",
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
    globalClients.delete(socket);
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };

  return response;
}

function handleShellSocket(req: Request): Response {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const bridgePath = new URL("./pty_bridge.py", import.meta.url).pathname;
    const proc = new Deno.Command("python3", {
      args: [bridgePath],
      stdin: "piped",
      stdout: "piped",
      stderr: "null",
    }).spawn();

    const writer = proc.stdin.getWriter();

    const pump = (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      const read = () =>
        reader.read().then(({ done, value }) => {
          if (done) return;
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(decoder.decode(value));
          }
          read();
        }).catch(() => {});
      read();
    };

    pump(proc.stdout);

    socket.onmessage = (event) => writer.write(encoder.encode(event.data));

    socket.onclose = () => {
      writer.close().catch(() => {});
      proc.kill();
    };
  };

  return response;
}

const AXIOM_DATA_DIR = `${Deno.env.get("HOME") ?? "/tmp"}/.axiom`;
const METADATA_PATH = `${AXIOM_DATA_DIR}/file-metadata.json`;
const STORAGE_POOLS_PATH = `${AXIOM_DATA_DIR}/storage-pools.json`;
const FILE_CATEGORIES_PATH = `${AXIOM_DATA_DIR}/file-categories.json`;

interface StoragePool {
  poolId: string;
  poolName: string;
  poolColor: string;
  assignedDiskPaths: string[];
  dataCategories: string[];
  description: string;
}

async function loadStoragePools(): Promise<StoragePool[]> {
  try {
    return JSON.parse(await Deno.readTextFile(STORAGE_POOLS_PATH));
  } catch {
    return [];
  }
}

async function saveStoragePools(pools: StoragePool[]): Promise<void> {
  await Deno.mkdir(AXIOM_DATA_DIR, { recursive: true });
  await Deno.writeTextFile(STORAGE_POOLS_PATH, JSON.stringify(pools));
}

async function loadFileMetadata(): Promise<
  Record<string, { usage: string; fileType: string; uploadedAt: number }>
> {
  try {
    return JSON.parse(await Deno.readTextFile(METADATA_PATH));
  } catch {
    return {};
  }
}

async function saveFileMetadata(
  filePath: string,
  meta: { usage: string; fileType: string; uploadedAt: number },
): Promise<void> {
  const all = await loadFileMetadata();
  all[filePath] = meta;
  await Deno.mkdir(AXIOM_DATA_DIR, { recursive: true });
  await Deno.writeTextFile(METADATA_PATH, JSON.stringify(all));
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.endsWith("/") && url.pathname.length > 1
    ? url.pathname.slice(0, -1)
    : url.pathname;

  if (pathname === "/ws") {
    return handleWebSocket(req);
  }

  if (pathname === "/shell") {
    return handleShellSocket(req);
  }

  if (pathname === "/api/version") {
    return new Response("v1.0.3");
  }

  if (pathname === "/api/containers" && req.method === "GET") {
    try {
      const result = await getContainers();
      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(result.containers), {
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
      if (!await isDockerRunning()) {
        return new Response(
          JSON.stringify({ error: "Docker is not running" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }

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

  if (
    pathname.startsWith("/api/container/") && pathname.endsWith("/files") &&
    req.method === "GET"
  ) {
    try {
      const parts = pathname.split("/");
      const containerId = parts[3];
      const queryPath = url.searchParams.get("path") || "/";

      const result = await runDockerCommand([
        "exec",
        containerId,
        "sh",
        "-c",
        `cd "${queryPath}" && ls -la 2>/dev/null | awk 'NR>1 {type=substr($1,1,1); size=$5; name=$NF; if(name!="." && name!="..") print type"\\t"size"\\t"name}'`,
      ]);

      if (!result.success && !result.output.trim()) {
        return new Response(
          JSON.stringify({ error: result.error || "Failed to list directory" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      const entries = result.output.trim().split("\n").filter(Boolean)
        .map((line) => {
          const [type, size, ...rest] = line.split("\t");
          const name = rest.join("\t").trim();
          const isDir = type === "d";
          const isLink = type === "l";
          return {
            name,
            isDir,
            isLink,
            size: parseInt(size) || 0,
            modified: "",
          };
        })
        .filter((e) => e.name !== "" && e.name !== "." && e.name !== "..")
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      return new Response(JSON.stringify({ path: queryPath, entries }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (
    pathname.startsWith("/api/container/") && pathname.endsWith("/file") &&
    req.method === "GET"
  ) {
    try {
      const containerId = pathname.split("/")[3];
      const filePath = url.searchParams.get("path");
      if (!filePath) {
        return new Response(JSON.stringify({ error: "path required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const result = await runDockerCommand([
        "exec",
        containerId,
        "cat",
        filePath,
      ]);
      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error || result.output }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ content: result.output }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (
    pathname.startsWith("/api/container/") && pathname.endsWith("/file") &&
    req.method === "POST"
  ) {
    try {
      const containerId = pathname.split("/")[3];
      const { path: filePath, content } = await req.json();
      if (!filePath) {
        return new Response(JSON.stringify({ error: "path required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const writeResult = await runDockerCommand([
        "exec",
        containerId,
        "sh",
        "-c",
        `printf '%s' ${JSON.stringify(content)} > "${filePath}"`,
      ]);
      if (!writeResult.success) {
        return new Response(
          JSON.stringify({ error: writeResult.error || "Write failed" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/fs/list" && req.method === "GET") {
    const rawPath = url.searchParams.get("path");
    const queryPath = rawPath || Deno.env.get("HOME") || "/";
    try {
      const entries: Array<{
        name: string;
        isDir: boolean;
        isFile: boolean;
        size: number;
        modified: number;
      }> = [];
      for await (const entry of Deno.readDir(queryPath)) {
        try {
          const stat = await Deno.stat(`${queryPath}/${entry.name}`);
          entries.push({
            name: entry.name,
            isDir: entry.isDirectory,
            isFile: entry.isFile,
            size: stat.size,
            modified: stat.mtime?.getTime() ?? 0,
          });
        } catch {
          entries.push({
            name: entry.name,
            isDir: entry.isDirectory,
            isFile: entry.isFile,
            size: 0,
            modified: 0,
          });
        }
      }
      entries.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return new Response(JSON.stringify({ path: queryPath, entries }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/fs/read" && req.method === "GET") {
    const filePath = url.searchParams.get("path");
    if (!filePath) {
      return new Response(JSON.stringify({ error: "path required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      const content = await Deno.readTextFile(filePath);
      return new Response(JSON.stringify({ content }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/fs/write" && req.method === "POST") {
    try {
      const { path: filePath, content } = await req.json();
      if (!filePath) {
        return new Response(JSON.stringify({ error: "path required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await Deno.writeTextFile(filePath, content);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/fs/upload" && req.method === "POST") {
    try {
      const home = Deno.env.get("HOME") ?? "/tmp";
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      let destPath = formData.get("path") as string | null;
      const usage = (formData.get("usage") as string | null) ?? "other";
      const fileType = (formData.get("fileType") as string | null) ?? "Other";
      if (!file || !destPath) {
        return new Response(
          JSON.stringify({ error: "file and path required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (destPath.startsWith("~/")) destPath = home + destPath.slice(1);
      await Deno.mkdir(destPath, { recursive: true });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fullPath = `${destPath}/${file.name}`;
      await Deno.writeFile(fullPath, bytes);
      await saveFileMetadata(fullPath, {
        usage,
        fileType,
        uploadedAt: Date.now(),
      });
      return new Response(JSON.stringify({ success: true, path: fullPath }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/fs/move" && req.method === "POST") {
    try {
      const home = Deno.env.get("HOME") ?? "/tmp";
      let { sourcePath, destinationPath } = await req.json();
      if (!sourcePath || !destinationPath) {
        return new Response(
          JSON.stringify({ error: "sourcePath and destinationPath required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (sourcePath.startsWith("~/")) sourcePath = home + sourcePath.slice(1);
      if (destinationPath.startsWith("~/")) {
        destinationPath = home + destinationPath.slice(1);
      }
      const destinationDirectory = destinationPath.split("/").slice(0, -1)
        .join("/");
      if (destinationDirectory) {
        await Deno.mkdir(destinationDirectory, { recursive: true });
      }
      try {
        await Deno.rename(sourcePath, destinationPath);
      } catch {
        await Deno.copyFile(sourcePath, destinationPath);
        await Deno.remove(sourcePath);
      }
      const allFileMetadata = await loadFileMetadata();
      if (allFileMetadata[sourcePath]) {
        allFileMetadata[destinationPath] = allFileMetadata[sourcePath];
        delete allFileMetadata[sourcePath];
        await Deno.mkdir(AXIOM_DATA_DIR, { recursive: true });
        await Deno.writeTextFile(
          METADATA_PATH,
          JSON.stringify(allFileMetadata),
        );
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/fs/delete" && req.method === "DELETE") {
    const filePath = url.searchParams.get("path");
    const isDirectory = url.searchParams.get("dir") === "true";
    if (!filePath) {
      return new Response(JSON.stringify({ error: "path required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      await Deno.remove(filePath, { recursive: isDirectory });
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/file-categories" && req.method === "GET") {
    try {
      const content = await Deno.readTextFile(FILE_CATEGORIES_PATH);
      return new Response(content, {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify([]), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/file-categories" && req.method === "POST") {
    try {
      const categories = await req.json();
      await Deno.mkdir(AXIOM_DATA_DIR, { recursive: true });
      await Deno.writeTextFile(
        FILE_CATEGORIES_PATH,
        JSON.stringify(categories),
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/fs/stream" && req.method === "GET") {
    const filePath = url.searchParams.get("path");
    if (!filePath) {
      return new Response(JSON.stringify({ error: "path required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      const fileInfo = await Deno.stat(filePath);
      const fileSize = fileInfo.size;
      const contentType = getContentType(filePath);
      const rangeHeader = req.headers.get("range");

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1]);
          const end = match[2] ? parseInt(match[2]) : fileSize - 1;
          const chunkSize = end - start + 1;
          const file = await Deno.open(filePath, { read: true });
          await file.seek(start, Deno.SeekMode.Start);
          const limitedStream = file.readable.pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                controller.enqueue(chunk);
              },
            }),
          );
          return new Response(limitedStream, {
            status: 206,
            headers: {
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": String(chunkSize),
              "Content-Type": contentType,
            },
          });
        }
      }

      const file = await Deno.open(filePath, { read: true });
      return new Response(file.readable, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/fs/metadata" && req.method === "GET") {
    const data = await loadFileMetadata();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (pathname === "/api/fs/metadata" && req.method === "POST") {
    try {
      const { path: filePath, ...meta } = await req.json();
      if (!filePath) {
        return new Response(JSON.stringify({ error: "path required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await saveFileMetadata(filePath, meta);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/disks" && req.method === "GET") {
    try {
      const detectedDisks = await detectAttachedDisks();
      return new Response(JSON.stringify(detectedDisks), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/storage-pools" && req.method === "GET") {
    try {
      const storagePools = await loadStoragePools();
      return new Response(JSON.stringify(storagePools), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/storage-pools" && req.method === "POST") {
    try {
      const storagePools = await req.json() as StoragePool[];
      await saveStoragePools(storagePools);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
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

function hasTlsCerts(): boolean {
  if (!AXIOM_DOMAIN) return false;
  try {
    Deno.statSync(TLS_CERT);
    Deno.statSync(TLS_KEY);
    return true;
  } catch {
    return false;
  }
}

function httpRedirectHandler(req: Request): Response {
  const url = new URL(req.url);
  return new Response(null, {
    status: 301,
    headers: {
      Location: `https://${AXIOM_DOMAIN}${url.pathname}${url.search}`,
    },
  });
}

export function startServer(port: number = PORT) {
  if (PROD && hasTlsCerts()) {
    console.log(`Server running at https://${AXIOM_DOMAIN}`);
    Deno.serve({
      port: HTTPS_PORT,
      cert: Deno.readTextFileSync(TLS_CERT),
      key: Deno.readTextFileSync(TLS_KEY),
    }, handler);
    Deno.serve({ port: HTTP_PORT }, httpRedirectHandler);
  } else {
    console.log(`Server running at http://localhost:${port}`);
    Deno.serve({ port }, handler);
  }
}
