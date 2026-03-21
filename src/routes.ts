import { start_monitor } from "~/src/monitor.ts";
import { detectAttachedDisks } from "~/src/disks.ts";
import { Route, StoragePool } from "~/src/types.ts";
import { getContentType } from "~/src/utils.ts";
import { globalClients } from "~/src/websockets.ts";
import {
  loadFileMetadata,
  loadStoragePools,
  saveFileMetadata,
  saveStoragePools,
} from "~/src/filesystem.ts";
import {
  getContainers,
  isDockerRunning,
  runDockerCommand,
  runDockerInstall,
} from "~/src/docker.ts";
import {
  AXIOM_DATA_DIR,
  FILE_CATEGORIES_PATH,
  METADATA_PATH,
} from "./config.ts";

function handleWebSocket(request: Request): Response {
  const upgrade = request.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() != "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(request);
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

function handleShellSocket(request: Request): Response {
  const upgrade = request.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(request);

  socket.onopen = () => {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const bridgePath = new URL("./pty_bridge.py", import.meta.url).pathname;
    const pythonProcess = new Deno.Command("python3", {
      args: [bridgePath],
      stdin: "piped",
      stdout: "piped",
      stderr: "null",
    }).spawn();

    const writer = pythonProcess.stdin.getWriter();

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

    pump(pythonProcess.stdout);

    socket.onmessage = (event) => writer.write(encoder.encode(event.data));

    socket.onclose = () => {
      writer.close().catch(() => {});
      pythonProcess.kill();
    };
  };

  return response;
}

const ROUTES: Route[] = [
  {
    path: "/ws",
    handler: (request) => Promise.resolve(handleWebSocket(request)),
  },
  {
    path: "/shell",
    handler: (request) => Promise.resolve(handleShellSocket(request)),
  },
  {
    path: "/api/version",
    handler: (_request) => Promise.resolve(new Response("v1.0.4")),
  },
  {
    path: "/api/containers",
    method: "GET",
    handler: async (_request) => {
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
    },
  },
  {
    // POST /api/container/:id
    pattern: /^\/api\/container\/[^/]+$/,
    method: "POST",
    handler: async (request) => {
      const pathname = new URL(request.url).pathname;
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

        const { action, image } = await request.json();

        let dockerArguments: string[] = [];

        if (action === "start") {
          dockerArguments = ["start", containerId];
        } else if (action === "stop") {
          dockerArguments = ["stop", containerId];
        } else if (action === "restart") {
          dockerArguments = ["restart", containerId];
        } else if (action === "remove") {
          dockerArguments = ["rm", "-fv", containerId];
          const removeResult = await runDockerCommand(dockerArguments);

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

        const result = await runDockerCommand(dockerArguments);

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
    },
  },
  {
    path: "/api/install",
    method: "POST",
    handler: async (request) => {
      try {
        if (!await isDockerRunning()) {
          return new Response(
            JSON.stringify({ error: "Docker is not running" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const appData = await request.json();
        runDockerInstall(appData);

        return new Response(JSON.stringify({ status: "queued" }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Invalid Request" }), {
          status: 400,
        });
      }
    },
  },
  {
    // GET /api/container/:id/files
    pattern: /^\/api\/container\/[^/]+\/files$/,
    method: "GET",
    handler: async (request) => {
      const requestUrl = new URL(request.url);
      const pathname = requestUrl.pathname;
      try {
        const parts = pathname.split("/");
        const containerId = parts[3];
        const queryPath = requestUrl.searchParams.get("path") || "/";

        const result = await runDockerCommand([
          "exec",
          containerId,
          "sh",
          "-c",
          `cd "${queryPath}" && ls -la 2>/dev/null | awk 'NR>1 {type=substr($1,1,1); size=$5; name=$NF; if(name!="." && name!="..") print type"\\t"size"\\t"name}'`,
        ]);

        if (!result.success && !result.output.trim()) {
          return new Response(
            JSON.stringify({
              error: result.error || "Failed to list directory",
            }),
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
          .filter((entry) => entry.name !== "" && entry.name !== "." && entry.name !== "..")
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
    },
  },
  {
    // GET /api/container/:id/file
    pattern: /^\/api\/container\/[^/]+\/file$/,
    method: "GET",
    handler: async (request) => {
      const requestUrl = new URL(request.url);
      const pathname = requestUrl.pathname;
      try {
        const containerId = pathname.split("/")[3];
        const filePath = requestUrl.searchParams.get("path");
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
    },
  },
  {
    // POST /api/container/:id/file
    pattern: /^\/api\/container\/[^/]+\/file$/,
    method: "POST",
    handler: async (request) => {
      const pathname = new URL(request.url).pathname;
      try {
        const containerId = pathname.split("/")[3];
        const { path: filePath, content } = await request.json();
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
    },
  },
  {
    path: "/api/fs/mkdir",
    method: "POST",
    handler: async (request) => {
      try {
        const home = Deno.env.get("HOME") ?? "/tmp";
        let { path: directoryPath } = await request.json();
        if (!directoryPath) {
          return new Response(JSON.stringify({ error: "path required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (directoryPath.startsWith("~/")) directoryPath = home + directoryPath.slice(1);
        await Deno.mkdir(directoryPath, { recursive: true });
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  },
  {
    path: "/api/home",
    method: "GET",
    handler: (_request) => {
      const home = Deno.env.get("HOME") ?? "/tmp";
      return Promise.resolve(
        new Response(JSON.stringify({ home }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    },
  },
  {
    path: "/api/fs/list",
    method: "GET",
    handler: async (request) => {
      const requestUrl = new URL(request.url);
      const home = Deno.env.get("HOME") ?? "/tmp";
      const rawPath = requestUrl.searchParams.get("path");
      let queryPath = rawPath || home || "/";
      if (queryPath.startsWith("~/")) queryPath = home + queryPath.slice(1);
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
            const fileStats = await Deno.stat(`${queryPath}/${entry.name}`);
            entries.push({
              name: entry.name,
              isDir: entry.isDirectory,
              isFile: entry.isFile,
              size: fileStats.size,
              modified: fileStats.mtime?.getTime() ?? 0,
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
    },
  },
  {
    path: "/api/fs/read",
    method: "GET",
    handler: async (request) => {
      const filePath = new URL(request.url).searchParams.get("path");
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
    },
  },
  {
    path: "/api/fs/write",
    method: "POST",
    handler: async (request) => {
      try {
        const { path: filePath, content } = await request.json();
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
    },
  },
  {
    path: "/api/fs/upload",
    method: "POST",
    handler: async (request) => {
      try {
        const home = Deno.env.get("HOME") ?? "/tmp";
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        let destinationPath = formData.get("path") as string | null;
        const usage = (formData.get("usage") as string | null) ?? "other";
        const fileType = (formData.get("fileType") as string | null) ?? "Other";
        if (!file || !destinationPath) {
          return new Response(
            JSON.stringify({ error: "file and path required" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        if (destinationPath.startsWith("~/")) destinationPath = home + destinationPath.slice(1);
        await Deno.mkdir(destinationPath, { recursive: true });
        const bytes = new Uint8Array(await file.arrayBuffer());
        const fullPath = `${destinationPath}/${file.name}`;
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
    },
  },
  {
    path: "/api/fs/move",
    method: "POST",
    handler: async (request) => {
      try {
        const home = Deno.env.get("HOME") ?? "/tmp";
        let { sourcePath, destinationPath } = await request.json();
        if (!sourcePath || !destinationPath) {
          return new Response(
            JSON.stringify({
              error: "sourcePath and destinationPath required",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        if (sourcePath.startsWith("~/")) {
          sourcePath = home + sourcePath.slice(1);
        }
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
    },
  },
  {
    path: "/api/fs/delete",
    method: "DELETE",
    handler: async (request) => {
      const requestUrl = new URL(request.url);
      const filePath = requestUrl.searchParams.get("path");
      const isDirectory = requestUrl.searchParams.get("dir") === "true";
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
    },
  },
  {
    path: "/api/file-categories",
    method: "GET",
    handler: async (_request) => {
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
    },
  },
  {
    path: "/api/file-categories",
    method: "POST",
    handler: async (request) => {
      try {
        const categories = await request.json();
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
    },
  },
  {
    path: "/api/fs/stream",
    method: "GET",
    handler: async (request) => {
      const requestUrl = new URL(request.url);
      const filePath = requestUrl.searchParams.get("path");
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
        const rangeHeader = request.headers.get("range");

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
    },
  },
  {
    path: "/api/fs/metadata",
    method: "GET",
    handler: async (_request) => {
      const data = await loadFileMetadata();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  {
    path: "/api/fs/metadata",
    method: "POST",
    handler: async (request) => {
      try {
        const { path: filePath, ...metadata } = await request.json();
        if (!filePath) {
          return new Response(JSON.stringify({ error: "path required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        await saveFileMetadata(filePath, metadata);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  },
  {
    path: "/api/disks",
    method: "GET",
    handler: async (_request) => {
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
    },
  },
  {
    path: "/api/storage-pools",
    method: "GET",
    handler: async (_request) => {
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
    },
  },
  {
    path: "/api/storage-pools",
    method: "POST",
    handler: async (request) => {
      try {
        const storagePools = await request.json() as StoragePool[];
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
    },
  },
  {
    path: "/api/stats",
    method: "GET",
    handler: async (_request) => {
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
    },
  },
];

export default ROUTES;
