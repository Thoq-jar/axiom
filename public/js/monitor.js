import { formatBytes } from './utils.js';

let lastData = {};

export function getLastData() {
  return lastData;
}

export function updateStatsFromData(data) {
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
    if (cpuProgress) cpuProgress.style.width = cpu + "%";
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
    if (memDetails) memDetails.textContent = 
      formatBytes(mem.used) + " / " + formatBytes(mem.total);
    const memProgress = document.getElementById("memProgress");
    if (memProgress) memProgress.style.width = usedPercent + "%";
  } else {
    const memValue = document.getElementById("memValue");
    if (memValue) memValue.textContent = "N/A";
    const memDetails = document.getElementById("memDetails");
    if (memDetails) memDetails.textContent = "Unable to read";
  }

  if (data.gpu !== null && data.gpu !== undefined) {
    const gpuEl = document.getElementById("gpuValue");
    if (gpuEl) {
      if (typeof data.gpu === "number") {
        const gpuVal = data.gpu.toFixed(1) + "%";
        gpuEl.textContent = gpuVal;
        gpuEl.classList.remove("gpu-model");
        const gpuDetails = document.getElementById("gpuDetails");
        if (gpuDetails) gpuDetails.textContent = "Current utilization";
      } else {
        gpuEl.textContent = data.gpu;
        gpuEl.classList.add("gpu-model");
        const gpuDetails = document.getElementById("gpuDetails");
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
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  lastData = data;
}

export function renderMonitorPage() {
  return `
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

