import { useEffect, useState } from "preact/hooks";
import { formatBytes } from "../utils/lib.ts";
import { connectWebSocket, SystemData } from "../websocket.ts";
import { Icon } from "../components/ui/icon.tsx";
import { DetailCard } from "../components/ui/detail-card.tsx";
import { Dropdown } from "../components/ui/dropdown.tsx";
import { InfoRow } from "../components/ui/info-row.tsx";

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

  const CHART_HEIGHT_PX = 100;
  const maxValue = Math.max(...memoryHistory, 1);

  return (
    <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
      <header
        class="mb-16 opacity-0 flex items-center justify-between"
        style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 relative flex items-center justify-center text-(--accent) bg-transparent rounded-lg text-2xl">
            <Icon name="memory-stick" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-(--text-primary) leading-none mb-1">
              Memory Details
            </h1>
            <p class="text-[0.7rem] text-(--text-muted) tracking-widest uppercase">
              RAM Information
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div class="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-(--danger) py-4 px-5 rounded-lg text-[0.8rem] mb-6">
          Connection lost. Attempting to reconnect...
        </div>
      )}

      <div
        class="details-grid grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 mb-8 opacity-0 max-[768px]:grid-cols-1"
        style={{ animation: "fadeSlideIn 0.5s ease 0.1s forwards" }}
        id="memoryDetailsGrid"
      >
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
        <div class="mt-4">
          <InfoRow label="Total Memory" value={totalMemory} />
          <InfoRow label="Used Memory" value={usedMemory} />
          <InfoRow label="Free Memory" value={freeMemory} />
          <InfoRow label="Usage Percentage" value={usagePercentage} />
          <InfoRow label="Cached" value={cached} />
          <InfoRow label="Available for Apps" value={availableForApps} />
        </div>
      </Dropdown>

      <Dropdown id="memory-history" title="Memory Usage History">
        <div class="mt-4" id="memory-history-chart">
          <div class="flex flex-col gap-2">
            <div class="text-xs text-(--text-muted) mb-2">
              Recent memory usage (last 10 updates)
            </div>
            <div
              class="h-30 flex items-end gap-1 border-b border-(--border-subtle) pb-2"
              id="memory-chart-bars"
            >
              {memoryHistory.length > 0
                ? memoryHistory.map((value, idx) => {
                  const barHeightPx = Math.max(
                    2,
                    Math.round((value / maxValue) * CHART_HEIGHT_PX),
                  );
                  const color = value > 80
                    ? "var(--danger)"
                    : value > 60
                    ? "var(--warning)"
                    : "var(--accent)";
                  return (
                    <div
                      key={idx}
                      class="flex-1 flex flex-col items-center gap-1"
                    >
                      <div class="w-full bg-(--bg-secondary) rounded-t h-25 flex items-end relative">
                        <div
                          class="w-full rounded-t transition-[height] duration-300 min-h-0.5"
                          style={{
                            background: color,
                            height: `${barHeightPx}px`,
                          }}
                        />
                      </div>
                      <div class="chart-bar-label text-[0.65rem] text-(--text-muted)">
                        {value.toFixed(0)}%
                      </div>
                    </div>
                  );
                })
                : null}
            </div>
            <div class="flex justify-between text-[0.7rem] text-(--text-muted) mt-2">
              <span>Oldest</span>
              <span>Latest</span>
            </div>
          </div>
        </div>
      </Dropdown>
    </div>
  );
}
