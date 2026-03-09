import { useEffect, useState } from "preact/hooks";
import { Icon, useToast } from "../components.tsx";

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
  loading,
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
      class={`app-card-interactive ${isInstalled ? "installed" : ""}`}
      onClick={onClick}
    >
      <div class="app-card-icon">
        <Icon
          name={app.icon.split(" ").pop()?.replace("fa-", "") || "box"}
          size={28}
        />
      </div>
      <div class="app-card-content">
        <div class="app-card-header">
          <h3>{app.name}</h3>
          <span
            class={`app-status ${
              isInstalled ? (isRunning ? "running" : "stopped") : "available"
            }`}
          >
            {isInstalled ? (isRunning ? "Running" : "Stopped") : "Install"}
          </span>
        </div>
        <p class="app-card-desc">{app.description}</p>
        {isInstalled && container && (
          <div class="app-card-meta">
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
  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal-content" onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="modal-title-row">
            <Icon
              name={app.icon.split(" ").pop()?.replace("fa-", "") || "box"}
              size={24}
            />
            <h3>{app.name}</h3>
          </div>
          <button class="modal-close-btn" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <div class="modal-body">
          <div class="modal-stat">
            <span class="modal-stat-label">Status</span>
            <span class={`modal-stat-value ${container.state}`}>
              {container.state}
            </span>
          </div>
          <div class="modal-stat">
            <span class="modal-stat-label">Container</span>
            <span class="modal-stat-value">{container.name}</span>
          </div>
          <div class="modal-stat">
            <span class="modal-stat-label">Image</span>
            <span class="modal-stat-value">
              {app.deployment.image}:{app.deployment.tag}
            </span>
          </div>
          <div class="modal-stat">
            <span class="modal-stat-label">Ports</span>
            <span class="modal-stat-value">{container.ports || "None"}</span>
          </div>
        </div>
        <div class="modal-actions">
          {container.state === "running"
            ? (
              <button
                class="modal-btn stop"
                onClick={() => onAction("stop")}
                disabled={actioning}
              >
                <Icon name="power" size={16} />
                Stop
              </button>
            )
            : (
              <button
                class="modal-btn start"
                onClick={() => onAction("start")}
                disabled={actioning}
              >
                <Icon name="play" size={16} />
                Start
              </button>
            )}
          <button
            class="modal-btn restart"
            onClick={() => onAction("restart")}
            disabled={actioning}
          >
            <Icon name="refresh-cw" size={16} />
            Restart
          </button>
          <button
            class="modal-btn uninstall"
            onClick={() => {
              if (confirm(`Uninstall ${app.name}?`)) onAction("remove");
            }}
            disabled={actioning}
          >
            <Icon name="trash-2" size={16} />
            Uninstall
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppStorePage() {
  const [apps, setApps] = useState<AppShipment[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppShipment | null>(null);
  const { addToast } = useToast();

  const fetchData = () => {
    Promise.all([
      fetch("/data/ships.json").then((res) => res.json()),
      fetch("/api/containers").then((res) => res.json()),
    ])
      .then(([appsData, containersData]) => {
        setApps(appsData);
        setContainers(containersData);
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
    setInstallingId(app.id);
    addToast(`Installing ${app.name}...`, "info");

    try {
      await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
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
      <div class="container">
        <header>
          <div class="logo">
            <div class="logo-mark">
              <Icon name="package" size={24} />
            </div>
            <div class="logo-content">
              <h1>Apps</h1>
              <p class="subtitle">Manage your applications</p>
            </div>
          </div>
        </header>
        <div class="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-mark">
            <Icon name="package" size={24} />
          </div>
          <div class="logo-content">
            <h1>Apps</h1>
            <p class="subtitle">Manage your applications</p>
          </div>
        </div>
      </header>

      <div class="app-grid">
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
