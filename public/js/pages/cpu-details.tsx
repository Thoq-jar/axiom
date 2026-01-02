import { useEffect, useState } from "preact/hooks";
import { DetailCard, Dropdown, InfoRow } from "../components.tsx";
import { connectWebSocket, sendWebSocketMessage } from "../websocket.ts";

interface SystemData {
  cpu_usage_percent?: number | null;
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
}

export function CpuDetailsPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    connectWebSocket((newData) => {
      if (newData.error) {
        setError(true);
      } else {
        setError(false);
        setData(newData);
      }
    });
  }, []);

  const cpuUsage = data?.cpu_usage_percent;
  const cpuInfo = data?.cpu_info || {};

  const cpuUsageValue = cpuUsage !== null && cpuUsage !== undefined
    ? `${cpuUsage.toFixed(1)}%`
    : "--";
  const cpuUsageExtra = cpuUsage !== null && cpuUsage !== undefined
    ? `Current CPU utilization: ${cpuUsage.toFixed(1)}%`
    : "Waiting for data...";

  const loadAverage = cpuUsage !== null && cpuUsage !== undefined
    ? (cpuUsage / 100).toFixed(2)
    : "--";
  const loadAverageExtra = cpuUsage !== null && cpuUsage !== undefined
    ? "System load average (1 min)"
    : "Calculating...";

  const coreCount = cpuInfo.cores?.toString() || "--";
  const coreCountExtra = cpuInfo.cores ? "CPU cores available" : "Loading...";

  const architecture = cpuInfo.arch || "Unknown";
  const cores = (cpuInfo.cores || "Unknown").toString();
  const frequency = cpuInfo.freq
    ? `${(cpuInfo.freq / 1000).toFixed(2)} GHz`
    : "Unknown";
  const cache = cpuInfo.cache ? `${cpuInfo.cache} MB` : "Unknown";
  const vendor = cpuInfo.vendor || "Unknown";
  const model = cpuInfo.model || "Unknown";

  return (
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-mark">
            <i class="fa-solid fa-microchip"></i>
          </div>
          <div class="logo-content">
            <h1>CPU Details</h1>
            <p class="subtitle">Processor Information</p>
          </div>
        </div>
      </header>

      {error && (
        <div class="error-banner" id="errorBanner">
          Connection lost. Attempting to reconnect...
        </div>
      )}

      <div class="details-grid" id="cpuDetailsGrid">
        <DetailCard
          title="CPU Usage"
          icon="fa-solid fa-microchip"
          value={cpuUsageValue}
          subtitle="Current Utilization"
          extra={cpuUsageExtra}
        />
        <DetailCard
          title="Load Average"
          icon="fa-solid fa-chart-line"
          value={loadAverage}
          subtitle="System Load"
          extra={loadAverageExtra}
        />
        <DetailCard
          title="Core Count"
          icon="fa-solid fa-list"
          value={coreCount}
          subtitle="CPU cores present"
          extra={coreCountExtra}
        />
      </div>

      <Dropdown id="cpu-advanced" title="Advanced CPU Information">
        <div class="mt-1">
          <InfoRow label="Architecture" value={architecture} />
          <InfoRow label="Cores" value={cores} />
          <InfoRow label="Frequency" value={frequency} />
          <InfoRow label="Cache Size" value={cache} />
          <InfoRow label="Vendor" value={vendor} />
          <InfoRow label="Model" value={model} />
        </div>
      </Dropdown>

      <Dropdown id="cpu-processes" title="Top Processes by CPU Usage">
        <div class="mt-1" id="cpu-processes-list">
          {data?.processes && Array.isArray(data.processes) &&
              data.processes.length > 0
            ? (
              <div class="processes-grid">
                {data.processes.map((proc, idx) => (
                  <div key={idx} class="process-item">
                    <div class="process-item-content">
                      <div class="process-item-name">
                        {idx + 1}. {proc.name}
                      </div>
                      <div class="process-item-details">
                        CPU: {proc.cpu.toFixed(1)}% | Memory:{" "}
                        {proc.mem.toFixed(1)}%
                      </div>
                    </div>
                    <div class="process-bar-container">
                      <div
                        class="process-bar-fill"
                        style={{ width: `${proc.cpu}%` }}
                      >
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
            : (
              <p class="text-secondary">
                {data
                  ? "No process information available"
                  : "Loading process information..."}
              </p>
            )}
        </div>
      </Dropdown>
    </div>
  );
}

export function getLastCpuData(): SystemData | null {
  return null;
}
