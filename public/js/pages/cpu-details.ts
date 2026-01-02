import {
  renderDetailCard,
  renderDropdown,
  renderInfoRow,
} from "../components.ts";
import { connectWebSocket } from "../websocket.ts";

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

let lastCpuData: SystemData | null = null;

export function renderCpuDetailsPage(): string {
  return /* HTML */ `
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

      <div class="error-banner" id="errorBanner">
        Connection lost. Attempting to reconnect...
      </div>

      <div class="details-grid" id="cpuDetailsGrid">
        ${
    renderDetailCard(
      "CPU Usage",
      "fa-solid fa-microchip",
      "--",
      "Current Utilization",
      "Waiting for data...",
    )
  }
        ${
    renderDetailCard(
      "Load Average",
      "fa-solid fa-chart-line",
      "--",
      "System Load",
      "Calculating...",
    )
  }
        ${
    renderDetailCard(
      "Core Count",
      "fa-solid fa-list",
      "--",
      "CPU cores present",
      "Loading...",
    )
  }
      </div>

      ${
    renderDropdown(
      "cpu-advanced",
      "Advanced CPU Information",
      `
        <div class="mt-1">
          ${renderInfoRow("Architecture", "--")}
          ${renderInfoRow("Cores", "--")}
          ${renderInfoRow("Frequency", "--")}
          ${renderInfoRow("Cache Size", "--")}
          ${renderInfoRow("Vendor", "--")}
          ${renderInfoRow("Model", "--")}
        </div>
      `,
    )
  }

      ${
    renderDropdown(
      "cpu-processes",
      "Top Processes by CPU Usage",
      /* HTML */ `
        <div class="mt-1" id="cpu-processes-list">
          <p class="text-secondary">Loading process information...</p>
        </div>
      `,
    )
  }
    </div>
  `;
}

export function updateCpuDetails(data: SystemData): void {
  if (!data) return;

  const cpuUsage = data.cpu_usage_percent;
  const cpuInfo = data.cpu_info || {};

  const cards = document.querySelectorAll("#cpuDetailsGrid .detail-card");
  const CPU_USAGE_CARD = 0;
  const LOAD_AVERAGE_CARD = 1;
  const CORE_COUNT_CARD = 2;

  if (cards.length >= 3) {
    if (cpuUsage !== null && cpuUsage !== undefined) {
      const cpuUsageValue = cards[CPU_USAGE_CARD].querySelector(
        ".detail-value",
      );
      if (cpuUsageValue) {
        cpuUsageValue.textContent = cpuUsage.toFixed(1) + "%";
      }
      const cpuUsageExtra = cards[CPU_USAGE_CARD].querySelector(
        ".detail-extra",
      );
      if (cpuUsageExtra) {
        cpuUsageExtra.textContent = `Current CPU utilization: ${
          cpuUsage.toFixed(1)
        }%`;
      }
    }

    const loadAverageValue = cards[LOAD_AVERAGE_CARD].querySelector(
      ".detail-value",
    );
    if (loadAverageValue && cpuUsage !== null && cpuUsage !== undefined) {
      const load = (cpuUsage / 100).toFixed(2);
      loadAverageValue.textContent = load;
      const loadAverageExtra = cards[LOAD_AVERAGE_CARD].querySelector(
        ".detail-extra",
      );
      if (loadAverageExtra) {
        loadAverageExtra.textContent = `System load average (1 min)`;
      }
    }

    const coreCountValue = cards[CORE_COUNT_CARD].querySelector(
      ".detail-value",
    );
    if (coreCountValue && cpuInfo.cores) {
      coreCountValue.textContent = cpuInfo.cores.toString();
      const coreCountExtra = cards[CORE_COUNT_CARD].querySelector(
        ".detail-extra",
      );
      if (coreCountExtra) {
        coreCountExtra.textContent = `CPU cores available`;
      }
    }
  }

  const advancedDropdown = document.querySelector(
    '[data-dropdown-content="cpu-advanced"]',
  );
  if (advancedDropdown) {
    const rows = advancedDropdown.querySelectorAll(".info-row");

    const ARCHITECTURE_ROW = 0;
    const CORES_ROW = 1;
    const FREQUENCY_ROW = 2;
    const CACHE_SIZE_ROW = 3;
    const VENDOR_ROW = 4;
    const MODEL_ROW = 5;

    if (rows.length >= 6) {
      const architectureValue = rows[ARCHITECTURE_ROW].querySelector(
        ".info-value",
      );
      if (architectureValue) {
        architectureValue.textContent = cpuInfo.arch || "Unknown";
      }

      const coresValue = rows[CORES_ROW].querySelector(".info-value");
      if (coresValue) {
        coresValue.textContent = (cpuInfo.cores || "Unknown").toString();
      }

      const frequencyValue = rows[FREQUENCY_ROW].querySelector(".info-value");
      if (frequencyValue) {
        const freq = cpuInfo.freq
          ? `${(cpuInfo.freq / 1000).toFixed(2)} GHz`
          : "Unknown";
        frequencyValue.textContent = freq;
      }

      const cacheSizeValue = rows[CACHE_SIZE_ROW].querySelector(".info-value");
      if (cacheSizeValue) {
        const cache = cpuInfo.cache ? `${cpuInfo.cache} MB` : "Unknown";
        cacheSizeValue.textContent = cache;
      }

      const vendorValue = rows[VENDOR_ROW].querySelector(".info-value");
      if (vendorValue) {
        vendorValue.textContent = cpuInfo.vendor || "Unknown";
      }

      const modelValue = rows[MODEL_ROW].querySelector(".info-value");
      if (modelValue) {
        modelValue.textContent = cpuInfo.model || "Unknown";
      }
    }
  }

  const processesList = document.getElementById("cpu-processes-list");
  if (
    processesList && data.processes && Array.isArray(data.processes) &&
    data.processes.length > 0
  ) {
    processesList.innerHTML = /* HTML */ `
      <div class="processes-grid">
        ${
      data.processes.map((proc, idx) => /* HTML */ `
          <div class="process-item">
            <div class="process-item-content">
              <div class="process-item-name">${idx + 1}. ${proc.name}</div>
              <div class="process-item-details">
                CPU: ${proc.cpu.toFixed(1)}% | Memory: ${proc.mem.toFixed(1)}%
              </div>
            </div>
            <div class="process-bar-container">
              <div class="process-bar-fill" style="width: ${proc.cpu}%;"></div>
            </div>
          </div>
        `).join("")
    }
      </div>
    `;
  } else if (processesList) {
    processesList.innerHTML =
      '<p class="text-secondary">No process information available</p>';
  }

  lastCpuData = data;
}

export function initCpuDetails(): void {
  setTimeout(() => {
    connectWebSocket((data) => {
      updateCpuDetails(data);
    });
  }, 100);
}

export function getLastCpuData(): SystemData | null {
  return lastCpuData;
}
