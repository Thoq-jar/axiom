import { useEffect, useState } from "preact/hooks";
import { formatBytes } from "./utils.ts";
import { connectWebSocket, sendWebSocketMessage } from "./websocket.ts";

interface GPU {
  id: number;
  name: string;
  utilization: number;
  memory_used: number;
  memory_total: number;
  temperature: number | null;
}

interface SystemData {
  cpu_usage_percent?: number | null;
  memory?: {
    used: number;
    total: number;
    free: number;
  };
  gpu?: number | string | null | GPU[];
}

function StatCard({
  title,
  icon,
  value,
  details,
  progress,
}: {
  title: string;
  icon: string;
  value: string;
  details: string;
  progress: number;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [prevValue, setPrevValue] = useState("");

  useEffect(() => {
    if (value !== prevValue && prevValue !== "") {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 300);
    }
    setPrevValue(value);
  }, [value, prevValue]);

  return (
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-title">{title}</span>
        <div class="stat-icon">
          <i class={icon}></i>
        </div>
      </div>
      <div class={`stat-value${isUpdating ? " updating" : ""}`}>{value}</div>
      <div class="stat-details">{details}</div>
      <div class="progress-container">
        <div class="progress-bar">
          <div
            class={`progress-fill${
              progress === 0 ? " progress-fill-initial" : ""
            }`}
            style={{ width: `${progress}%` }}
          >
          </div>
        </div>
        <div class="progress-labels">
          <span>0 %</span>
          <span>100 %</span>
        </div>
      </div>
    </div>
  );
}

function MultiGPUCard({ gpu }: { gpu: GPU }) {
  const memPercent = ((gpu.memory_used / gpu.memory_total) * 100).toFixed(1);

  return (
    <div class="stat-card gpu-detail-card">
      <div class="stat-header">
        <span class="stat-title">GPU {gpu.id}: {gpu.name}</span>
        <div class="stat-icon">
          <i class="fa-solid fa-microchip"></i>
        </div>
      </div>
      <div class="gpu-metrics">
        <div class="gpu-metric">
          <div class="gpu-metric-label">Utilization</div>
          <div class="gpu-metric-value">{gpu.utilization.toFixed(1)} %</div>
          <div class="progress-container">
            <div class="progress-bar">
              <div
                class="progress-fill"
                style={{ width: `${gpu.utilization.toFixed(1)}%` }}
              >
              </div>
            </div>
          </div>
        </div>
        <div class="gpu-metric">
          <div class="gpu-metric-label">Memory</div>
          <div class="gpu-metric-value">{memPercent} %</div>
          <div class="gpu-metric-details">
            {gpu.memory_used.toFixed(0)} / {gpu.memory_total.toFixed(0)} MB
          </div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style={{ width: `${memPercent}%` }}>
              </div>
            </div>
          </div>
        </div>
        {gpu.temperature !== null && (
          <div class="gpu-metric">
            <div class="gpu-metric-label">Temperature</div>
            <div class="gpu-metric-value">{gpu.temperature.toFixed(0)}°C</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MonitorPage() {
  const [data, setData] = useState<SystemData>({});
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("--");

  useEffect(() => {
    const updateData = (newData: SystemData) => {
      // if (newData.error) {
      //  setError(true);
      // } else {
      setError(false);
      setData(newData);
      setLastUpdate(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      // }
    };

    connectWebSocket(updateData);

    const savedInterval = localStorage.getItem("refreshInterval");
    if (savedInterval) {
      sendWebSocketMessage({
        type: "setRefreshInterval",
        interval: parseInt(savedInterval, 10),
      });
    }
  }, []);

  const cpuValue =
    data.cpu_usage_percent !== null && data.cpu_usage_percent !== undefined
      ? `${data.cpu_usage_percent.toFixed(1)}%`
      : "N/A";
  const cpuDetails =
    data.cpu_usage_percent !== null && data.cpu_usage_percent !== undefined
      ? "Current utilization"
      : "Unable to read";
  const cpuProgress =
    data.cpu_usage_percent !== null && data.cpu_usage_percent !== undefined
      ? data.cpu_usage_percent
      : 0;

  const memPercent = data.memory
    ? ((data.memory.used / data.memory.total) * 100).toFixed(1)
    : "0";
  const memValue = data.memory ? `${memPercent}%` : "N/A";
  const memDetails = data.memory
    ? `${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}`
    : "Unable to read";
  const memProgress = data.memory ? parseFloat(memPercent) : 0;

  let gpuValue = "--";
  let gpuDetails = "Initializing";
  let gpuProgress = 0;
  let multiGPUs: GPU[] | null = null;

  if (data.gpu !== null && data.gpu !== undefined) {
    if (Array.isArray(data.gpu)) {
      const gpus = data.gpu as GPU[];
      if (gpus.length === 1) {
        const gpu = gpus[0];
        gpuValue = `${gpu.utilization.toFixed(1)}%`;
        gpuProgress = gpu.utilization;
        let details = gpu.name;
        if (gpu.temperature !== null) {
          details += ` • ${gpu.temperature}°C`;
        }
        const memPercent = ((gpu.memory_used / gpu.memory_total) * 100).toFixed(
          0,
        );
        details += ` • ${memPercent}% VRAM`;
        gpuDetails = details;
      } else {
        const avgUtil = gpus.reduce((sum, gpu) => sum + gpu.utilization, 0) /
          gpus.length;
        gpuValue = `${avgUtil.toFixed(1)}%`;
        gpuProgress = avgUtil;
        gpuDetails = `${gpus.length} GPUs detected • Avg utilization`;
        multiGPUs = gpus;
      }
    } else if (typeof data.gpu === "number") {
      gpuValue = `${data.gpu.toFixed(1)}%`;
      gpuProgress = data.gpu;
      gpuDetails = "Current utilization";
    } else {
      gpuValue = data.gpu;
      gpuDetails = "Detected GPU";
    }
  } else {
    gpuValue = "N/A";
    gpuDetails = "No GPU detected";
  }

  return (
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-mark">
            <i class="fa-solid fa-cube"></i>
          </div>
          <div class="logo-content">
            <h1>AxiomOS</h1>
            <p class="subtitle">Server[OSS]</p>
          </div>
        </div>
        <button type="button" class="settings-btn" id="settingsBtn">
          <i class="fa-solid fa-gear"></i>
        </button>
      </header>

      {error && (
        <div class="error-banner" id="errorBanner">
          Connection lost.Attempting to reconnect...
        </div>
      )}

      <div class="stats-grid" id="statsGrid">
        <StatCard
          title="Processor"
          icon="fa-solid fa-microchip"
          value={cpuValue}
          details={cpuDetails}
          progress={cpuProgress}
        />

        <StatCard
          title="Memory"
          icon="fa-solid fa-memory"
          value={memValue}
          details={memDetails}
          progress={memProgress}
        />

        <StatCard
          title="Graphics"
          icon="fa-solid fa-display"
          value={gpuValue}
          details={gpuDetails}
          progress={gpuProgress}
        />

        {multiGPUs && (
          <div class="multi-gpu-container">
            {multiGPUs.map((gpu) => <MultiGPUCard key={gpu.id} gpu={gpu} />)}
          </div>
        )}
      </div>

      <footer class="footer">
        <div class="status">
          <div class="status-dot"></div>
          <div class="status-text">
            Updated <span id="lastUpdate">{lastUpdate}</span>
          </div>
        </div>
        <div class="version">v1.0.0</div>
      </footer>
    </div>
  );
}

export function getLastData(): SystemData {
  return {};
}
