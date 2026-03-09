import { useEffect, useState } from "preact/hooks";
import { DetailCard, Dropdown, InfoRow } from "../components.tsx";

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

export function AppStorePage() {
  const [apps, setApps] = useState<AppShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const installApp = async (app: AppShipment) => {
    if (installingId) return;

    setInstallingId(app.id);
    try {
      const response = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });

      if (!response.ok) throw new Error("Installation failed");

      alert(`Installation started for ${app.name}`);
    } catch (err) {
      console.error(err);
      alert("Failed to reach server");
    } finally {
      setInstallingId(null);
    }
  };

  useEffect(() => {
    fetch("/data/ships.json")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-mark">
            <i class="fa-brands fa-app-store"></i>
          </div>
          <div class="logo-content">
            <h1>App Store</h1>
            <p class="subtitle">Get apps for your server</p>
          </div>
        </div>
      </header>

      {error && (
        <div class="error-banner">
          Failed to load app repository. Please check your connection.
        </div>
      )}

      {loading
        ? <div class="text-secondary">Loading available shipments...</div>
        : (
          <div class="details-grid">
            {apps.map((app) => (
              <DetailCard
                key={app.id}
                title={app.name}
                icon={app.icon}
                value={installingId === app.id
                  ? "Installing..."
                  : app.deployment.tag}
                subtitle={app.category}
                extra={app.description}
                onClick={() => installApp(app)}
              />
            ))}
          </div>
        )}

      <Dropdown id="app-deployments" title="Pending Installations & Steps">
        <div class="mt-1">
          {apps.map((app) => (
            <div key={`${app.id}-steps`} class="mb-2">
              <h4
                class="text-primary"
                style={{ fontSize: "0.9rem", margin: "10px 0 5px 0" }}
              >
                {app.name} Automations
              </h4>
              {app.install_steps.map((step, idx) => (
                <InfoRow
                  key={idx}
                  label={step.action.replace("_", " ")}
                  value={step.target || step.name || "N/A"}
                />
              ))}
            </div>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
