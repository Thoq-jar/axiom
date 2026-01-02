import {
  renderDetailCard,
  renderDropdown,
  renderInfoRow,
} from "../components.ts";
import { formatBytes } from "../utils.ts";
import { connectWebSocket } from "../websocket.ts";

interface SystemData {
  memory?: {
    used: number;
    total: number;
    free: number;
  };
}

let lastMemoryData: SystemData | null = null;
const memoryHistory: number[] = [];

export function renderMemoryDetailsPage(): string {
  return /* HTML */ `
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

      <div class="error-banner" id="errorBanner">
        Connection lost. Attempting to reconnect...
      </div>

      <div class="details-grid" id="memoryDetailsGrid">
        ${
    renderDetailCard(
      "Total Memory",
      "fa-solid fa-server",
      "--",
      "System RAM",
      "Loading...",
    )
  }
        ${
    renderDetailCard(
      "Used Memory",
      "fa-solid fa-chart-pie",
      "--",
      "Currently Used",
      "Calculating...",
    )
  }
        ${
    renderDetailCard(
      "Free Memory",
      "fa-solid fa-check-circle",
      "--",
      "Available",
      "Loading...",
    )
  }
        ${
    renderDetailCard(
      "Usage Percentage",
      "fa-solid fa-percent",
      "--",
      "Memory Utilization",
      "Waiting...",
    )
  }
      </div>

      ${
    renderDropdown(
      "memory-breakdown",
      "Memory Breakdown",
      /* HTML */ `
        <div class="mt-1">
          ${renderInfoRow("Total Memory", "--")}
          ${renderInfoRow("Used Memory", "--")}
          ${renderInfoRow("Free Memory", "--")}
          ${renderInfoRow("Usage Percentage", "--")}
          ${renderInfoRow("Cached", "--")}
          ${renderInfoRow("Available for Apps", "--")}
        </div>
      `,
    )
  }

      ${
    renderDropdown(
      "memory-history",
      "Memory Usage History",
      /* HTML */ `
        <div class="mt-1" id="memory-history-chart">
          <div class="flex-col">
            <div class="chart-label">Recent memory usage (last 10 updates)</div>
            <div class="chart-container" id="memory-chart-bars"></div>
            <div class="chart-legend">
              <span>Oldest</span>
              <span>Latest</span>
            </div>
          </div>
        </div>
      `,
    )
  }
    </div>
  `;
}

export function updateMemoryDetails(data: SystemData): void {
  if (!data || !data.memory) return;

  const mem = data.memory;
  const usedPercent = ((mem.used / mem.total) * 100).toFixed(1);

  const cards = document.querySelectorAll("#memoryDetailsGrid .detail-card");
  const TOTAL_MEMORY_CARD = 0;
  const USED_MEMORY_CARD = 1;
  const FREE_MEMORY_CARD = 2;
  const USAGE_PERCENTAGE_CARD = 3;

  if (cards.length >= 4) {
    const totalValue = cards[TOTAL_MEMORY_CARD].querySelector(".detail-value");
    const usedValue = cards[USED_MEMORY_CARD].querySelector(".detail-value");
    const freeValue = cards[FREE_MEMORY_CARD].querySelector(".detail-value");
    const percentValue = cards[USAGE_PERCENTAGE_CARD].querySelector(
      ".detail-value",
    );

    if (totalValue) totalValue.textContent = formatBytes(mem.total);
    if (usedValue) usedValue.textContent = formatBytes(mem.used);
    if (freeValue) freeValue.textContent = formatBytes(mem.free);
    if (percentValue) percentValue.textContent = usedPercent + "%";
  }

  const breakdown = document.querySelector(
    '[data-dropdown-content="memory-breakdown"]',
  );
  if (breakdown) {
    const rows = breakdown.querySelectorAll(".info-row");
    const TOTAL_MEMORY_ROW = 0;
    const USED_MEMORY_ROW = 1;
    const FREE_MEMORY_ROW = 2;
    const USAGE_PERCENTAGE_ROW = 3;
    const CACHED_ROW = 4;
    const AVAILABLE_FOR_APPS_ROW = 5;

    if (rows.length >= 6) {
      const totalMemoryValue = rows[TOTAL_MEMORY_ROW].querySelector(
        ".info-value",
      );
      if (totalMemoryValue) {
        totalMemoryValue.textContent = formatBytes(mem.total);
      }

      const usedMemoryValue = rows[USED_MEMORY_ROW].querySelector(
        ".info-value",
      );
      if (usedMemoryValue) {
        usedMemoryValue.textContent = formatBytes(mem.used);
      }

      const freeMemoryValue = rows[FREE_MEMORY_ROW].querySelector(
        ".info-value",
      );
      if (freeMemoryValue) {
        freeMemoryValue.textContent = formatBytes(mem.free);
      }

      const usagePercentageValue = rows[USAGE_PERCENTAGE_ROW].querySelector(
        ".info-value",
      );
      if (usagePercentageValue) {
        usagePercentageValue.textContent = usedPercent + "%";
      }

      const cachedValue = rows[CACHED_ROW].querySelector(".info-value");
      if (cachedValue) {
        const cached = mem.total - mem.used - mem.free;
        cachedValue.textContent = cached > 0 ? formatBytes(cached) : "N/A";
      }

      const availableForAppsValue = rows[AVAILABLE_FOR_APPS_ROW].querySelector(
        ".info-value",
      );
      if (availableForAppsValue) {
        availableForAppsValue.textContent = formatBytes(mem.free);
      }
    }
  }

  memoryHistory.push(parseFloat(usedPercent));
  if (memoryHistory.length > 10) {
    memoryHistory.shift();
  }

  const chartBars = document.getElementById("memory-chart-bars");
  if (chartBars && memoryHistory.length > 0) {
    const maxValue = Math.max(...memoryHistory, 100);
    chartBars.innerHTML = memoryHistory.map((value, _idx) => {
      const height = (value / maxValue) * 100;
      const color = value > 80
        ? "var(--danger)"
        : value > 60
        ? "var(--warning)"
        : "var(--accent)";
      return /* HTML */ `
        <div class="chart-bar-wrapper">
          <div class="chart-bar-container">
            <div class="chart-bar-fill" style="background: ${color}; height: ${height}%;"></div>
          </div>
          <div class="chart-bar-label">${value.toFixed(0)}%</div>
        </div>
      `;
    }).join("");
  }

  if (cards.length >= 4) {
    const totalExtra = cards[TOTAL_MEMORY_CARD].querySelector(".detail-extra");
    if (totalExtra) {
      totalExtra.textContent = `Total system memory available`;
    }
    const usedExtra = cards[USED_MEMORY_CARD].querySelector(".detail-extra");
    if (usedExtra) {
      usedExtra.textContent = `${usedPercent}% of total memory in use`;
    }
    const freeExtra = cards[FREE_MEMORY_CARD].querySelector(".detail-extra");
    if (freeExtra) {
      freeExtra.textContent = `Available for new processes`;
    }
    const percentExtra = cards[USAGE_PERCENTAGE_CARD].querySelector(
      ".detail-extra",
    );
    if (percentExtra) {
      percentExtra.textContent = `${formatBytes(mem.used)} used of ${
        formatBytes(mem.total)
      } total`;
    }
  }

  lastMemoryData = data;
}

export function initMemoryDetails(): void {
  setTimeout(() => {
    connectWebSocket((data) => {
      updateMemoryDetails(data);
    });
  }, 100);
}

export function getLastMemoryData(): SystemData | null {
  return lastMemoryData;
}
