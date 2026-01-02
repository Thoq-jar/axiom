import { formatBytes } from "./utils.ts";

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

let lastData: SystemData = {};

export function getLastData(): SystemData {
  return lastData;
}

export function updateStatsFromData(data: SystemData): void {
  const errorBanner = document.getElementById("errorBanner");
  if (errorBanner) errorBanner.style.display = "none";

  if (data.cpu_usage_percent !== null && data.cpu_usage_percent !== undefined) {
    const cpu = data.cpu_usage_percent.toFixed(1);
    const cpuEl = document.getElementById("cpuValue");
    if (cpuEl && cpuEl.textContent !== cpu + "%") {
      cpuEl.classList.add("updating");
      setTimeout(() => cpuEl.classList.remove("updating"), 300);
    }
    if (cpuEl) cpuEl.textContent = cpu + "%";
    const cpuDetails = document.getElementById("cpuDetails");
    if (cpuDetails) cpuDetails.textContent = "Current utilization";
    const cpuProgress = document.getElementById("cpuProgress");
    if (cpuProgress) (cpuProgress as HTMLElement).style.width = cpu + "%";
  } else {
    const cpuValue = document.getElementById("cpuValue");
    if (cpuValue) cpuValue.textContent = "N/A";
    const cpuDetails = document.getElementById("cpuDetails");
    if (cpuDetails) cpuDetails.textContent = "Unable to read";
  }

  if (data.memory) {
    const mem = data.memory;
    const usedPercent = ((mem.used / mem.total) * 100).toFixed(1);
    const memEl = document.getElementById("memValue");
    if (memEl && memEl.textContent !== usedPercent + "%") {
      memEl.classList.add("updating");
      setTimeout(() => memEl.classList.remove("updating"), 300);
    }
    if (memEl) memEl.textContent = usedPercent + "%";
    const memDetails = document.getElementById("memDetails");
    if (memDetails) {
      memDetails.textContent = formatBytes(mem.used) + " / " +
        formatBytes(mem.total);
    }
    const memProgress = document.getElementById("memProgress");
    if (memProgress) {
      (memProgress as HTMLElement).style.width = usedPercent + "%";
    }
  } else {
    const memValue = document.getElementById("memValue");
    if (memValue) memValue.textContent = "N/A";
    const memDetails = document.getElementById("memDetails");
    if (memDetails) memDetails.textContent = "Unable to read";
  }

  if (data.gpu !== null && data.gpu !== undefined) {
    const gpuEl = document.getElementById("gpuValue");
    const gpuDetails = document.getElementById("gpuDetails");

    if (gpuEl) {
      if (Array.isArray(data.gpu)) {
        const gpus = data.gpu as GPU[];

        if (gpus.length === 1) {
          const gpu = gpus[0];
          const gpuVal = gpu.utilization.toFixed(1) + "%";
          gpuEl.textContent = gpuVal;
          gpuEl.classList.remove("gpu-model");

          if (gpuDetails) {
            let details = gpu.name;
            if (gpu.temperature !== null) {
              details += ` • ${gpu.temperature}°C`;
            }
            const memPercent = ((gpu.memory_used / gpu.memory_total) * 100)
              .toFixed(0);
            details += ` • ${memPercent}% VRAM`;
            gpuDetails.textContent = details;
          }

          const gpuProgress = document.getElementById("gpuProgress");
          if (gpuProgress) {
            (gpuProgress as HTMLElement).style.width =
              gpu.utilization.toFixed(1) + "%";
          }
        } else {
          const avgUtil = gpus.reduce((sum, gpu) => sum + gpu.utilization, 0) /
            gpus.length;
          const gpuVal = avgUtil.toFixed(1) + "%";
          gpuEl.textContent = gpuVal;
          gpuEl.classList.remove("gpu-model");

          if (gpuDetails) {
            gpuDetails.textContent =
              `${gpus.length} GPUs detected • Avg utilization`;
          }

          const gpuProgress = document.getElementById("gpuProgress");
          if (gpuProgress) {
            (gpuProgress as HTMLElement).style.width = avgUtil.toFixed(1) + "%";
          }

          renderMultipleGPUs(gpus);
        }
      } else if (typeof data.gpu === "number") {
        const gpuVal = data.gpu.toFixed(1) + "%";
        gpuEl.textContent = gpuVal;
        gpuEl.classList.remove("gpu-model");
        if (gpuDetails) gpuDetails.textContent = "Current utilization";

        const gpuProgress = document.getElementById("gpuProgress");
        if (gpuProgress) {
          (gpuProgress as HTMLElement).style.width = gpuVal;
        }
      } else {
        gpuEl.textContent = data.gpu;
        gpuEl.classList.add("gpu-model");
        if (gpuDetails) gpuDetails.textContent = "Detected GPU";
      }
    }
  } else {
    const gpuValue = document.getElementById("gpuValue");
    if (gpuValue) gpuValue.textContent = "N/A";
    const gpuDetails = document.getElementById("gpuDetails");
    if (gpuDetails) gpuDetails.textContent = "No GPU detected";
  }

  const lastUpdate = document.getElementById("lastUpdate");
  if (lastUpdate) {
    lastUpdate.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  lastData = data;
}

function renderMultipleGPUs(gpus: GPU[]): void {
  const statsGrid = document.getElementById("statsGrid");
  if (!statsGrid) return;

  const existingMultiGPU = document.getElementById("multiGPUContainer");
  if (existingMultiGPU) {
    existingMultiGPU.remove();
  }

  const multiGPUContainer = document.createElement("div");
  multiGPUContainer.id = "multiGPUContainer";
  multiGPUContainer.className = "multi-gpu-container";

  gpus.forEach((gpu) => {
    const gpuCard = document.createElement("div");
    gpuCard.className = "stat-card gpu-detail-card";

    const memPercent = ((gpu.memory_used / gpu.memory_total) * 100).toFixed(1);

    gpuCard.innerHTML = `
      <div class="stat-header">
        <span class="stat-title">GPU ${gpu.id}: ${gpu.name}</span>
        <div class="stat-icon">
          <i class="fa-solid fa-microchip"></i>
        </div>
      </div>
      <div class="gpu-metrics">
        <div class="gpu-metric">
          <div class="gpu-metric-label">Utilization</div>
          <div class="gpu-metric-value">${gpu.utilization.toFixed(1)}%</div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${
      gpu.utilization.toFixed(1)
    }%"></div>
            </div>
          </div>
        </div>
        <div class="gpu-metric">
          <div class="gpu-metric-label">Memory</div>
          <div class="gpu-metric-value">${memPercent}%</div>
          <div class="gpu-metric-details">${gpu.memory_used.toFixed(0)} / ${
      gpu.memory_total.toFixed(0)
    } MB</div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${memPercent}%"></div>
            </div>
          </div>
        </div>
        ${
      gpu.temperature !== null
        ? `
        <div class="gpu-metric">
          <div class="gpu-metric-label">Temperature</div>
          <div class="gpu-metric-value">${gpu.temperature.toFixed(0)}°C</div>
        </div>
        `
        : ""
    }
      </div>
    `;

    multiGPUContainer.appendChild(gpuCard);
  });

  statsGrid.appendChild(multiGPUContainer);
}

export function renderMonitorPage(): string {
  return /* HTML */ `
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-mark">
            <i class="fa-solid fa-cube"></i>
          </div>
          <div class="logo-content">
            <h1>AxiomOS</h1>
            <p class="subtitle">Server [OSS]</p>
          </div>
        </div>
        <button class="settings-btn" id="settingsBtn">
          <i class="fa-solid fa-gear"></i>
        </button>
      </header>

      <div class="error-banner" id="errorBanner">
        Connection lost. Attempting to reconnect...
      </div>

      <div class="stats-grid" id="statsGrid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Processor</span>
            <div class="stat-icon">
              <i class="fa-solid fa-microchip"></i>
            </div>
          </div>
          <div class="stat-value" id="cpuValue">--</div>
          <div class="stat-details" id="cpuDetails">Initializing</div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill progress-fill-initial" id="cpuProgress"></div>
            </div>
            <div class="progress-labels">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Memory</span>
            <div class="stat-icon">
              <i class="fa-solid fa-memory"></i>
            </div>
          </div>
          <div class="stat-value" id="memValue">--</div>
          <div class="stat-details" id="memDetails">Initializing</div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill progress-fill-initial" id="memProgress"></div>
            </div>
            <div class="progress-labels">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Graphics</span>
            <div class="stat-icon">
              <i class="fa-solid fa-display"></i>
            </div>
          </div>
          <div class="stat-value" id="gpuValue">--</div>
          <div class="stat-details" id="gpuDetails">Initializing</div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill progress-fill-initial" id="gpuProgress"></div>
            </div>
            <div class="progress-labels">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <footer class="footer">
        <div class="status">
          <div class="status-dot"></div>
          <div class="status-text">
            Updated <span id="lastUpdate">--</span>
          </div>
        </div>
        <div class="version">v1.0.0</div>
      </footer>
    </div>
  `;
}
