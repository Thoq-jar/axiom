import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "../components/ui/icon.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { Button } from "../components/ui/button.tsx";
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

function AppCard({
  app,
  container,
  onClick,
}: {
  app: AppShipment;
  container?: Container;
  onClick: () => void;
  loading: boolean;
}) {
  const isInstalled = !!container;
  const isRunning = container?.state === "running";

  return (
    <div
      class={`rounded-xl p-5 cursor-pointer flex gap-4 border [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform] ${
        isInstalled ? "border-[var(--accent)]" : "border-[var(--ui-border)]"
      }`}
      onClick={onClick}
    >
      <div
        class={`w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-200 border ${
          isInstalled
            ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)]"
            : "bg-[var(--ui-bg)] border-[var(--ui-border)] text-[var(--text-primary)]"
        }`}
      >
        <Icon
          name={app.icon.split(" ").pop()?.replace("fa-", "") || "box"}
          size={28}
        />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2 mb-2">
          <h3 class="text-base font-semibold text-[var(--text-primary)]">
            {app.name}
          </h3>
          <span
            class={`text-[0.7rem] font-semibold py-1 px-2 rounded-md uppercase whitespace-nowrap ${
              isInstalled
                ? isRunning
                  ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]"
                  : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                : "bg-[var(--accent-dim)] text-[var(--accent)]"
            }`}
          >
            {isInstalled ? (isRunning ? "Running" : "Stopped") : "Install"}
          </span>
        </div>
        <p class="app-card-desc text-[0.8rem] text-[var(--text-secondary)] leading-snug">
          {app.description}
        </p>
        {isInstalled && container && (
          <div class="mt-2 text-xs text-[var(--text-muted)]">
            <span>{container.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ManageModal({
  app,
  container,
  onClose,
  onAction,
  actioning,
}: {
  app: AppShipment;
  container: Container;
  onClose: () => void;
  onAction: (action: string) => void;
  actioning: boolean;
}) {
  const icon = app.icon.split(" ").pop()?.replace("fa-", "") || "box";
  return (
    <Modal title={app.name} icon={icon} onClose={onClose}>
      <div class="p-6">
        <div class="flex justify-between py-3 border-b border-[var(--border-subtle)]">
          <span class="text-[0.9rem] text-[var(--text-secondary)]">Status</span>
          <span
            class={`text-[0.9rem] font-semibold ${
              container.state === "running"
                ? "text-[#22c55e]"
                : "text-[#ef4444]"
            }`}
          >
            {container.state}
          </span>
        </div>
        <div class="flex justify-between py-3 border-b border-[var(--border-subtle)]">
          <span class="text-[0.9rem] text-[var(--text-secondary)]">
            Container
          </span>
          <span class="text-[0.9rem] font-semibold text-[var(--text-primary)]">
            {container.name}
          </span>
        </div>
        <div class="flex justify-between py-3 border-b border-[var(--border-subtle)]">
          <span class="text-[0.9rem] text-[var(--text-secondary)]">Image</span>
          <span class="text-[0.9rem] font-semibold text-[var(--text-primary)]">
            {app.deployment.image}:{app.deployment.tag}
          </span>
        </div>
        <div class="flex justify-between py-3">
          <span class="text-[0.9rem] text-[var(--text-secondary)]">Ports</span>
          <span class="text-[0.9rem] font-semibold text-[var(--text-primary)]">
            {container.ports || "None"}
          </span>
        </div>
      </div>
      <div class="p-6 border-t border-[var(--border-subtle)] flex gap-3">
        {container.state === "running"
          ? (
            <Button
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[0.85rem] font-semibold cursor-pointer border transition-all duration-200 font-[inherit] bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)] hover:bg-[#ef4444] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onAction("stop")}
              disabled={actioning}
            >
              <Icon name="power" size={16} />
              Stop
            </Button>
          )
          : (
            <Button
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[0.85rem] font-semibold cursor-pointer border transition-all duration-200 font-[inherit] bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-[rgba(34,197,94,0.3)] hover:bg-[#22c55e] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onAction("start")}
              disabled={actioning}
            >
              <Icon name="play" size={16} />
              Start
            </Button>
          )}
        <Button
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[0.85rem] font-semibold cursor-pointer border transition-all duration-200 font-[inherit] bg-[rgba(234,179,8,0.15)] text-[#eab308] border-[rgba(234,179,8,0.3)] hover:bg-[#eab308] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onAction("restart")}
          disabled={actioning}
        >
          <Icon name="refresh-cw" size={16} />
          Restart
        </Button>
        <Button
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[0.85rem] font-semibold cursor-pointer border transition-all duration-200 font-[inherit] bg-[rgba(107,114,128,0.15)] text-[#9ca3af] border-[rgba(107,114,128,0.3)] hover:bg-[#6b7280] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            if (confirm(`Uninstall ${app.name}?`)) onAction("remove");
          }}
          disabled={actioning}
        >
          <Icon name="trash-2" size={16} />
          Uninstall
        </Button>
      </div>
    </Modal>
  );
}

export function AppStorePage() {
  const [apps, setApps] = useState<AppShipment[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppShipment | null>(null);
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

  const getContainer = (app: AppShipment): Container | undefined => {
    return containers.find((c) => {
      const appName = app.name.toLowerCase().replace(/\s+/g, "-");
      const appId = app.id.toLowerCase();
      const containerName = c.name.toLowerCase();
      const imageName = c.image.toLowerCase().split("/").pop() || "";
      return containerName.includes(appName) || containerName.includes(appId) ||
        imageName.includes(appId);
    });
  };

  const handleCardClick = async (app: AppShipment) => {
    const container = getContainer(app);
    if (container) {
      setSelectedApp(app);
    } else {
      await installApp(app);
    }
  };

  const installApp = async (app: AppShipment) => {
    if (installingId) return;
    if (dockerError) {
      addToast("Docker is not running", "error");
      return;
    }
    setInstallingId(app.id);
    addToast(`Installing ${app.name}...`, "info");

    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || `Failed to install ${app.name}`, "error");
        return;
      }
      addToast(`${app.name} installation started`, "success");
      setTimeout(fetchData, 2000);
    } catch {
      addToast(`Failed to install ${app.name}`, "error");
    } finally {
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

  if (loading) {
    return (
      <div class="max-w-[1100px] mx-auto py-12 px-8 relative z-[1]">
        <header
          class="mb-16 opacity-0 flex items-center justify-between"
          style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 relative flex items-center justify-center text-[var(--accent)] bg-transparent rounded-lg text-2xl">
              <Icon name="package" size={24} />
            </div>
            <div class="flex flex-col">
              <h1 class="text-[1.75rem] font-semibold tracking-tight text-[var(--text-primary)] leading-none mb-1">
                Apps
              </h1>
              <p class="text-[0.7rem] text-[var(--text-muted)] tracking-widest uppercase">
                Manage your applications
              </p>
            </div>
          </div>
        </header>
        <div class="text-[var(--text-secondary)] text-center p-8">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div class="max-w-[1100px] mx-auto py-12 px-8 relative z-[1]">
      <header
        class="mb-16 opacity-0 flex items-center justify-between"
        style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 relative flex items-center justify-center text-[var(--accent)] bg-transparent rounded-lg text-2xl">
            <Icon name="package" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-[var(--text-primary)] leading-none mb-1">
              Apps
            </h1>
            <p class="text-[0.7rem] text-[var(--text-muted)] tracking-widest uppercase">
              Manage your applications
            </p>
          </div>
        </div>
      </header>

      {dockerError && (
        <div class="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[var(--danger)] py-4 px-5 rounded-lg text-[0.8rem] mb-6 flex items-center gap-2">
          <Icon name="alert-circle" size={16} />
          {dockerError} — container management unavailable
        </div>
      )}

      <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        {apps.map((app) => {
          const container = getContainer(app);
          return (
            <AppCard
              key={app.id}
              app={app}
              container={container}
              onClick={() => handleCardClick(app)}
              loading={installingId === app.id}
            />
          );
        })}
      </div>

      {selectedApp && (
        <ManageModal
          app={selectedApp}
          container={getContainer(selectedApp)!}
          onClose={() => setSelectedApp(null)}
          onAction={(action) =>
            handleAction(getContainer(selectedApp)!.id, action)}
          actioning={actioningId === getContainer(selectedApp)?.id}
        />
      )}
    </div>
  );
}
