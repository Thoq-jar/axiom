import { useEffect, useState } from "preact/hooks";
import {
  connectWebSocket,
  GPU,
  sendWebSocketMessage,
  SystemData,
} from "./websocket.ts";
import { Icon } from "./components/ui/icon.tsx";
import { formatBytes } from "./utils/lib.ts";
import { StatCard } from "./components/ui/stat-card.tsx";

function MultiGPUCard({ gpu }: { gpu: GPU }) {
  const memPercent = ((gpu.memory_used / gpu.memory_total) * 100).toFixed(1);

  return (
    <div
      class="gpu-detail-card stat-card rounded-xl p-7 relative backdrop-blur-sm will-change-transform"
      style={{ background: "var(--ui-bg)", animation: "fadeSlideIn 0.5s ease" }}
    >
      <div class="flex items-center justify-between mb-6">
        <span class="text-[0.7rem] font-medium text-(--text-muted) uppercase tracking-[0.12em]">
          GPU {gpu.id}: {gpu.name}
        </span>
        <div class="w-8 h-8 flex items-center justify-center bg-(--accent-dim) rounded-lg text-(--accent)">
          <Icon name="cpu" />
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="text-[0.65rem] font-medium text-(--text-muted) uppercase tracking-widest">
            Utilization
          </div>
          <div class="text-2xl font-bold text-(--text-primary) tracking-tight tabular-nums">
            {gpu.utilization.toFixed(1)} %
          </div>
          <div class="w-full h-1 bg-(--bg-secondary) rounded-sm overflow-hidden relative">
            <div
              class="progress-fill h-full bg-(--accent) rounded-sm relative"
              style={{ width: `${gpu.utilization.toFixed(1)}%` }}
            />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-[0.65rem] font-medium text-(--text-muted) uppercase tracking-widest">
            Memory
          </div>
          <div class="text-2xl font-bold text-(--text-primary) tracking-tight tabular-nums">
            {memPercent} %
          </div>
          <div class="text-[0.7rem] text-(--text-secondary) -mt-1">
            {gpu.memory_used.toFixed(0)} / {gpu.memory_total.toFixed(0)} MB
          </div>
          <div class="w-full h-1 bg-(--bg-secondary) rounded-sm overflow-hidden relative">
            <div
              class="progress-fill h-full bg-(--accent) rounded-sm relative"
              style={{ width: `${memPercent}%` }}
            />
          </div>
        </div>
        {gpu.temperature !== null && (
          <div class="flex flex-col gap-2">
            <div class="text-[0.65rem] font-medium text-(--text-muted) uppercase tracking-widest">
              Temperature
            </div>
            <div class="text-2xl font-bold text-(--text-primary) tracking-tight tabular-nums">
              {gpu.temperature.toFixed(0)}°C
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MonitorPage() {
  const [data, setData] = useState<SystemData>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    const updateData = (newData: SystemData) => {
      if (newData.error) {
        setError(true);
      } else {
        setError(false);
        setData(newData);
      }
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
    <div class="max-w-275 mx-auto py-12 px-8 relative z-1">
      <header
        class="mb-16 opacity-0 flex items-center justify-between"
        style={{ animation: "fadeSlideIn 0.6s ease forwards" }}
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 relative flex items-center justify-center text-(--accent) bg-transparent rounded-lg text-2xl">
            <Icon name="box" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-(--text-primary) leading-none mb-1">
              Monitor
            </h1>
            <p class="text-[0.7rem] text-(--text-muted) tracking-widest uppercase">
              System Overview
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
        class="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1"
        id="statsGrid"
      >
        <StatCard
          title="Processor"
          iconName="cpu"
          value={cpuValue}
          details={cpuDetails}
          progress={cpuProgress}
        />
        <StatCard
          title="Memory"
          iconName="memory-stick"
          value={memValue}
          details={memDetails}
          progress={memProgress}
        />
        <StatCard
          title="Graphics"
          iconName="monitor"
          value={gpuValue}
          details={gpuDetails}
          progress={gpuProgress}
        />

        {multiGPUs && (
          <div class="col-span-full grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 mt-5 max-[900px]:grid-cols-1">
            {multiGPUs.map((gpu) => <MultiGPUCard key={gpu.id} gpu={gpu} />)}
          </div>
        )}
      </div>
    </div>
  );
}
