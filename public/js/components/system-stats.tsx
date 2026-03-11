import { useEffect, useState } from "preact/hooks";
import { connectWebSocket, SystemData } from "../websocket.ts";
import { formatBytes } from "../utils/lib.ts";
import { StatBlock } from "./stat-block.tsx";
import { Icon } from "./ui/icon.tsx";

export const SystemStats = () => {
  const [systemData, setSystemData] = useState<SystemData>({});

  useEffect(() => {
    connectWebSocket((data) => {
      if (!data.error) setSystemData(data);
    });
  }, []);

  const cpuPercentage = systemData.cpu_usage_percent ?? null;
  const memoryPercentage = systemData.memory
    ? (systemData.memory.used / systemData.memory.total) * 100
    : null;
  const memoryDetail = systemData.memory
    ? `${formatBytes(systemData.memory.used)} / ${
      formatBytes(systemData.memory.total)
    }`
    : null;

  let gpuPercentage: number | null = null;
  let gpuLabel = "GPU";
  if (systemData.gpu != null) {
    if (Array.isArray(systemData.gpu) && systemData.gpu.length > 0) {
      gpuPercentage = systemData.gpu.reduce((sum, gpu) =>
        sum + gpu.utilization, 0) / systemData.gpu.length;
      gpuLabel = systemData.gpu.length > 1
        ? `${systemData.gpu.length} GPUs`
        : (systemData.gpu[0].name?.split(" ").slice(-1)[0] || "GPU");
    } else if (typeof systemData.gpu === "number") {
      gpuPercentage = systemData.gpu;
    }
  }

  return (
    <div
      class="mb-6 opacity-0"
      style={{ animation: "fadeSlideIn 0.5s ease 0.35s forwards" }}
    >
      <div class="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.12em] text-(--text-muted) mb-3">
        <Icon name="activity" size={14} />
        System
      </div>
      <div class="flex flex-col gap-2">
        <StatBlock
          icon="cpu"
          label="Processor"
          percentage={cpuPercentage}
          targetPage="cpu-details"
        />
        <StatBlock
          icon="memory-stick"
          label="Memory"
          percentage={memoryPercentage}
          detail={memoryDetail}
          targetPage="memory-details"
        />
        {gpuPercentage != null && (
          <StatBlock
            icon="monitor"
            label={gpuLabel}
            percentage={gpuPercentage}
            targetPage="monitor"
          />
        )}
      </div>
    </div>
  );
};
