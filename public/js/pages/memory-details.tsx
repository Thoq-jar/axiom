import { useEffect, useState } from "preact/hooks";
import { DetailCard, Dropdown, InfoRow } from "../components.tsx";
import { formatBytes } from "../utils.ts";
import { connectWebSocket } from "../websocket.ts";

interface SystemData {
  memory?: {
    used: number;
    total: number;
    free: number;
  };
}

export function MemoryDetailsPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [error, setError] = useState(false);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);

  useEffect(() => {
    connectWebSocket((newData) => {
      if (newData.error) {
        setError(true);
      } else {
        setError(false);
        setData(newData);

        if (newData.memory) {
          const usedPercent = (newData.memory.used / newData.memory.total) *
            100;
          setMemoryHistory((prev) => {
            const updated = [...prev, usedPercent];
            return updated.length > 10 ? updated.slice(-10) : updated;
          });
        }
      }
    });
  }, []);

  const mem = data?.memory;
  const usedPercent = mem ? ((mem.used / mem.total) * 100).toFixed(1) : "0";

  const totalMemory = mem ? formatBytes(mem.total) : "--";
  const totalMemoryExtra = mem ? "Total system memory available" : "Loading...";

  const usedMemory = mem ? formatBytes(mem.used) : "--";
  const usedMemoryExtra = mem
    ? `${usedPercent}% of total memory in use`
    : "Calculating...";

  const freeMemory = mem ? formatBytes(mem.free) : "--";
  const freeMemoryExtra = mem ? "Available for new processes" : "Loading...";

  const usagePercentage = mem ? `${usedPercent}%` : "--";
  const usagePercentageExtra = mem
    ? `${formatBytes(mem.used)} used of ${formatBytes(mem.total)} total`
    : "Waiting...";

  const cached = mem
    ? mem.total - mem.used - mem.free > 0
      ? formatBytes(mem.total - mem.used - mem.free)
      : "N/A"
    : "--";

  const availableForApps = mem ? formatBytes(mem.free) : "--";

  const maxValue = Math.max(...memoryHistory, 100);

  return (
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-mark">
            <i class="fa-solid fa-memory"></i>
          </div>
          <div class="logo-content">
            <h1>Memory Details</h1>
            <p class="subtitle">RAM Information</p>
          </div>
        </div>
      </header>

      {error && (
        <div class="error-banner" id="errorBanner">
          Connection lost. Attempting to reconnect...
        </div>
      )}

      <div class="details-grid" id="memoryDetailsGrid">
        <DetailCard
          title="Total Memory"
          icon="fa-solid fa-server"
          value={totalMemory}
          subtitle="System RAM"
          extra={totalMemoryExtra}
        />
        <DetailCard
          title="Used Memory"
          icon="fa-solid fa-chart-pie"
          value={usedMemory}
          subtitle="Currently Used"
          extra={usedMemoryExtra}
        />
        <DetailCard
          title="Free Memory"
          icon="fa-solid fa-check-circle"
          value={freeMemory}
          subtitle="Available"
          extra={freeMemoryExtra}
        />
        <DetailCard
          title="Usage Percentage"
          icon="fa-solid fa-percent"
          value={usagePercentage}
          subtitle="Memory Utilization"
          extra={usagePercentageExtra}
        />
      </div>

      <Dropdown id="memory-breakdown" title="Memory Breakdown">
        <div class="mt-1">
          <InfoRow label="Total Memory" value={totalMemory} />
          <InfoRow label="Used Memory" value={usedMemory} />
          <InfoRow label="Free Memory" value={freeMemory} />
          <InfoRow label="Usage Percentage" value={usagePercentage} />
          <InfoRow label="Cached" value={cached} />
          <InfoRow label="Available for Apps" value={availableForApps} />
        </div>
      </Dropdown>

      <Dropdown id="memory-history" title="Memory Usage History">
        <div class="mt-1" id="memory-history-chart">
          <div class="flex-col">
            <div class="chart-label">
              Recent memory usage (last 10 updates)
            </div>
            <div class="chart-container" id="memory-chart-bars">
              {memoryHistory.length > 0
                ? memoryHistory.map((value, idx) => {
                  const height = (value / maxValue) * 100;
                  const color = value > 80
                    ? "var(--danger)"
                    : value > 60
                    ? "var(--warning)"
                    : "var(--accent)";
                  return (
                    <div key={idx} class="chart-bar-wrapper">
                      <div class="chart-bar-container">
                        <div
                          class="chart-bar-fill"
                          style={{ background: color, height: `${height}%` }}
                        >
                        </div>
                      </div>
                      <div class="chart-bar-label">{value.toFixed(0)}%</div>
                    </div>
                  );
                })
                : null}
            </div>
            <div class="chart-legend">
              <span>Oldest</span>
              <span>Latest</span>
            </div>
          </div>
        </div>
      </Dropdown>
    </div>
  );
}

export function getLastMemoryData(): SystemData | null {
  return null;
}
