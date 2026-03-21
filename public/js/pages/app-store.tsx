import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "../components/ui/icon.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { Button } from "../components/ui/button.tsx";
import { FileBrowser } from "../components/ui/file-browser.tsx";
import { useToast } from "../hooks/use-toast.ts";

interface InstallStep {
  action: string;
  target?: string;
  name?: string;
}

interface AppShipment {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  webui_path?: string;
  deployment: {
    image: string;
    tag: string;
    ports: Array<{ host: number; container: number; protocol: string }>;
  };
  install_steps: InstallStep[];
}

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

const BTN =
  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-all duration-200 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

export function AppStorePage() {
  const [apps, setApps] = useState<AppShipment[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<
    {
      step: number;
      total: number;
      step_name: string;
    } | null
  >(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppShipment | null>(null);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const { addToast } = useToast();
  const dockerErrorShownRef = useRef(false);

  const fetchData = () => {
    Promise.all([
      fetch("/data/ships.json").then((res) => res.json()),
      fetch("/api/containers").then((res) => res.json()),
    ])
      .then(([appsData, containersData]) => {
        setApps(appsData);
        if (containersData.error) {
          setDockerError(containersData.error);
          setContainers([]);
          if (!dockerErrorShownRef.current) {
            addToast(containersData.error, "error");
            dockerErrorShownRef.current = true;
          }
        } else {
          setContainers(containersData);
          setDockerError(null);
          dockerErrorShownRef.current = false;
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onProgress = (event: Event) => {
      const { step, total, step_name } = (event as CustomEvent).detail;
      setInstallProgress({ step, total, step_name });
    };
    const onFinished = () => {
      setInstallingId(null);
      setInstallProgress(null);
      fetchData();
    };
    globalThis.addEventListener("installProgress", onProgress);
    globalThis.addEventListener("installFinished", onFinished);
    return () => {
      globalThis.removeEventListener("installProgress", onProgress);
      globalThis.removeEventListener("installFinished", onFinished);
    };
  }, []);

  const getContainer = (app: AppShipment): Container | undefined => {
    return containers.find((container) => {
      const appName = app.name.toLowerCase().replace(/\s+/g, "-");
      const appId = app.id.toLowerCase();
      const containerName = container.name.toLowerCase();
      const imageName = container.image.toLowerCase().split("/").pop() || "";
      return containerName.includes(appName) || containerName.includes(appId) ||
        imageName.includes(appId);
    });
  };

  const installApp = async (app: AppShipment) => {
    if (installingId) return;
    if (dockerError) {
      addToast("Docker is not running", "error");
      return;
    }
    setInstallingId(app.id);
    setInstallProgress(null);
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || `Failed to install ${app.name}`, "error");
        setInstallingId(null);
      }
    } catch {
      addToast(`Failed to install ${app.name}`, "error");
      setInstallingId(null);
    }
  };

  const handleAction = async (containerId: string, action: string) => {
    setActioningId(containerId);
    try {
      const res = await fetch(`/api/container/${containerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (result.success) {
        addToast(`Container ${action}ed`, "success");
        fetchData();
        if (action === "remove") setSelectedApp(null);
      } else {
        addToast(result.error || `Failed to ${action}`, "error");
      }
    } catch {
      addToast(`Failed to ${action}`, "error");
    } finally {
      setActioningId(null);
    }
  };

  const header = (
    <header
      class="mb-16 opacity-0 flex items-center justify-between"
      style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
    >
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 relative flex items-center justify-center text-(--accent) bg-transparent rounded-lg text-2xl">
          <Icon name="package" size={24} />
        </div>
        <div class="flex flex-col">
          <h1 class="text-[1.75rem] font-semibold tracking-tight text-(--text-primary) leading-none mb-1">
            Apps
          </h1>
          <p class="text-[0.7rem] text-(--text-muted) tracking-widest uppercase">
            Manage your applications
          </p>
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
        {header}
        <div class="text-(--text-secondary) text-center p-8">Loading...</div>
      </div>
    );
  }

  const selectedContainer = selectedApp ? getContainer(selectedApp) : undefined;
  const icon = selectedApp?.icon.split(" ").pop()?.replace("fa-", "") || "box";

  return (
    <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
      {header}

      {dockerError && (
        <div class="bg-[rgba(239,68,68,0.1)] text-(--danger) py-4 px-5 rounded-lg text-[0.8rem] mb-6 flex items-center gap-2">
          <Icon name="alert-circle" size={16} />
          {dockerError} — container management unavailable
        </div>
      )}

      <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        {apps.map((app) => {
          const container = getContainer(app);
          const isInstalled = !!container;
          const isRunning = container?.state === "running";
          const isInstalling = installingId === app.id;
          const progress = isInstalling && installProgress
            ? Math.round(
              ((installProgress.step + 1) / installProgress.total) * 100,
            )
            : isInstalling
            ? 0
            : null;
          return (
            <div
              key={app.id}
              class="rounded-xl p-5 cursor-pointer flex gap-4 backdrop-blur-sm will-change-transform"
              style={{ background: "var(--ui-bg)" }}
              onClick={() =>
                !isInstalling &&
                (isInstalled ? setSelectedApp(app) : installApp(app))}
            >
              <div
                class={`w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-200 ${
                  isInstalling
                    ? "bg-(--accent-dim) text-(--accent)"
                    : isInstalled
                    ? "bg-(--accent-dim) text-(--accent)"
                    : "bg-(--ui-bg) text-(--text-primary)"
                }`}
              >
                <Icon
                  name={app.icon.split(" ").pop()?.replace("fa-", "") || "box"}
                  size={28}
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <h3 class="text-base font-semibold text-(--text-primary)">
                    {app.name}
                  </h3>
                  <span
                    class={`text-[0.7rem] font-semibold py-1 px-2 rounded-md uppercase whitespace-nowrap ${
                      isInstalling
                        ? "bg-(--accent-dim) text-(--accent)"
                        : isInstalled
                        ? isRunning
                          ? "bg-[rgba(34,197,94,0.15)] text-success"
                          : "bg-[rgba(239,68,68,0.15)] text-danger"
                        : "bg-(--accent-dim) text-(--accent)"
                    }`}
                  >
                    {isInstalling
                      ? "Installing"
                      : isInstalled
                      ? (isRunning ? "Running" : "Stopped")
                      : "Install"}
                  </span>
                </div>
                {isInstalling
                  ? (
                    <div class="flex flex-col gap-1.5">
                      <p class="text-[0.78rem] text-(--accent) leading-snug truncate">
                        {installProgress?.step_name ?? "Starting..."}
                      </p>
                      <div class="w-full h-1 rounded-full bg-(--ui-border) overflow-hidden">
                        <div
                          class="h-full rounded-full bg-(--accent) transition-all duration-500"
                          style={{ width: `${progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                  )
                  : (
                    <>
                      <p class="line-clamp-2 text-[0.8rem] text-(--text-secondary) leading-snug">
                        {app.description}
                      </p>
                      {isInstalled && (
                        <div class="mt-2 text-xs text-(--text-muted)">
                          {container.name}
                        </div>
                      )}
                    </>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedApp && selectedContainer && (
        <Modal
          title={selectedApp.name}
          icon={icon}
          onClose={() => setSelectedApp(null)}
          class="max-w-150!"
        >
          <div class="p-6">
            <div class="flex justify-between py-3">
              <span class="text-[0.9rem] text-(--text-secondary)">Status</span>
              <span
                class={`text-[0.9rem] font-semibold ${
                  selectedContainer.state === "running"
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {selectedContainer.state}
              </span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-[0.9rem] text-(--text-secondary)">
                Container
              </span>
              <span class="text-[0.9rem] font-semibold text-(--text-primary)">
                {selectedContainer.name}
              </span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-[0.9rem] text-(--text-secondary)">Image</span>
              <span class="text-[0.9rem] font-semibold text-(--text-primary)">
                {selectedApp.deployment.image}:{selectedApp.deployment.tag}
              </span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-[0.9rem] text-(--text-secondary)">Ports</span>
              <span class="text-[0.9rem] font-semibold text-(--text-primary)">
                {selectedContainer.ports || "None"}
              </span>
            </div>
          </div>
          <div class="p-4 flex flex-wrap gap-2">
            {selectedContainer.state === "running" && (() => {
              const match = selectedContainer.ports.match(
                /(?:[\d.]+:)?(\d+)->(\d+)\/(tcp)/,
              );
              const hostPort = match ? match[1] : null;
              const webuiPath = selectedApp.webui_path || "/";
              if (!hostPort) return null;
              return (
                <a
                  href={`http://localhost:${hostPort}${webuiPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class={`${BTN} bg-(--accent-dim) text-(--accent) hover:bg-(--accent) no-underline`}
                >
                  <Icon name="external-link" size={15} />
                  Open Web UI
                </a>
              );
            })()}

            <Button
              class={`${BTN} bg-[rgba(139,92,246,0.15)] text-[#a78bfa] hover:bg-accent`}
              onClick={() => setShowFileBrowser(true)}
              disabled={actioningId === selectedContainer.id}
            >
              <Icon name="folder-open" size={16} />
              Browse Files
            </Button>

            {selectedContainer.state === "running"
              ? (
                <Button
                  class={`${BTN} bg-[rgba(239,68,68,0.15)] text-danger hover:bg-danger`}
                  onClick={() => handleAction(selectedContainer.id, "stop")}
                  disabled={actioningId === selectedContainer.id}
                >
                  <Icon name="power" size={16} />
                  Stop
                </Button>
              )
              : (
                <Button
                  class={`${BTN} bg-[rgba(34,197,94,0.15)] text-success hover:bg-success`}
                  onClick={() => handleAction(selectedContainer.id, "start")}
                  disabled={actioningId === selectedContainer.id}
                >
                  <Icon name="play" size={16} />
                  Start
                </Button>
              )}
            <Button
              class={`${BTN} bg-[rgba(234,179,8,0.15)] text-warning hover:bg-warning`}
              onClick={() => handleAction(selectedContainer.id, "restart")}
              disabled={actioningId === selectedContainer.id}
            >
              <Icon name="refresh-cw" size={16} />
              Restart
            </Button>
            <Button
              class={`${BTN} bg-[rgba(107,114,128,0.15)] text-[#9ca3af] hover:bg-[#6b7280]`}
              onClick={() => {
                if (confirm(`Uninstall ${selectedApp.name}?`)) {
                  handleAction(selectedContainer.id, "remove");
                }
              }}
              disabled={actioningId === selectedContainer.id}
            >
              <Icon name="trash-2" size={16} />
              Uninstall
            </Button>
          </div>
        </Modal>
      )}

      {showFileBrowser && selectedContainer && (
        <FileBrowser
          containerId={selectedContainer.id}
          onClose={() => setShowFileBrowser(false)}
        />
      )}
    </div>
  );
}
