import { useEffect, useState } from "preact/hooks";
import { connectWebSocket, SystemData } from "../websocket.ts";
import { DetailCard } from "../components/ui/detail-card.tsx";
import { InfoRow } from "../components/ui/info-row.tsx";
import { Dropdown } from "../components/ui/dropdown.tsx";
import { Icon } from "../components/ui/icon.tsx";

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
    ? ``
    : "Waiting for data...";

  const loadAverage = cpuUsage !== null && cpuUsage !== undefined
    ? (cpuUsage / 100).toFixed(2)
    : "--";
  const loadAverageExtra = cpuUsage !== null && cpuUsage !== undefined
    ? "Average (1 min)"
    : "Calculating...";

  const coreCount = cpuInfo.cores?.toString() || "--";
  const coreCountExtra = cpuInfo.cores ? "" : "Loading...";

  const architecture = cpuInfo.arch || "Unknown";
  const cores = (cpuInfo.cores || "Unknown").toString();
  const frequency = cpuInfo.freq
    ? `${(cpuInfo.freq / 1000).toFixed(2)} GHz`
    : "Unknown";
  const cache = cpuInfo.cache ? `${cpuInfo.cache} MB` : "Unknown";
  const vendor = cpuInfo.vendor || "Unknown";
  const model = cpuInfo.model || "Unknown";

  return (
    <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
      <header
        class="mb-16 opacity-0 flex items-center justify-between"
        style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 relative flex items-center justify-center text-(--accent) bg-transparent rounded-lg text-2xl">
            <Icon name="cpu" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-(--text-primary) leading-none mb-1">
              CPU Details
            </h1>
            <p class="text-[0.7rem] text-(--text-muted) tracking-widest uppercase">
              Processor Information
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div class="bg-[rgba(239,68,68,0.1)] text-(--danger) py-4 px-5 rounded-lg text-[0.8rem] mb-6">
          Connection lost. Attempting to reconnect...
        </div>
      )}

      <div
        class="details-grid grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 mb-8 opacity-0 max-[768px]:grid-cols-1"
        style={{ animation: "fadeSlideIn 0.5s ease 0.1s forwards" }}
        id="cpuDetailsGrid"
      >
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
        <div class="mt-4">
          <InfoRow label="Architecture" value={architecture} />
          <InfoRow label="Cores" value={cores} />
          <InfoRow label="Frequency" value={frequency} />
          <InfoRow label="Cache Size" value={cache} />
          <InfoRow label="Vendor" value={vendor} />
          <InfoRow label="Model" value={model} />
        </div>
      </Dropdown>

      <Dropdown id="cpu-processes" title="Top Processes by CPU Usage">
        <div class="mt-4" id="cpu-processes-list">
          {data?.processes && Array.isArray(data.processes) &&
              data.processes.length > 0
            ? (
              <div class="grid gap-2">
                {data.processes.map((proc, idx) => (
                  <div
                    key={idx}
                    class="flex justify-between items-center p-3 bg-(--bg-secondary) rounded-lg"
                  >
                    <div class="flex-1">
                      <div class="font-semibold text-(--text-primary) mb-1">
                        {idx + 1}. {proc.name}
                      </div>
                      <div class="text-xs text-(--text-secondary)">
                        CPU: {proc.cpu.toFixed(1)}% | Memory:{" "}
                        {proc.mem.toFixed(1)}%
                      </div>
                    </div>
                    <div class="w-15 h-1 bg-(--bg-card) rounded-sm overflow-hidden ml-4">
                      <div
                        class="h-full bg-(--accent) transition-[width] duration-300"
                        style={{ width: `${proc.cpu}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
            : (
              <p class="text-(--text-secondary)">
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
