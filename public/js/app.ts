import { initDock, renderDock } from "./dock.ts";
import {
  getCurrentPage,
  initRouter,
  navigate,
  registerRoute,
} from "./router.ts";
import { renderMonitorPage, updateStatsFromData } from "./monitor.ts";
import { initSettings, renderSettingsModal } from "./settings.ts";
import { initTheme } from "./theme.ts";
import { connectWebSocket } from "./websocket.ts";
import { initCpuDetails, renderCpuDetailsPage } from "./pages/cpu-details.ts";
import {
  initMemoryDetails,
  renderMemoryDetailsPage,
} from "./pages/memory-details.ts";

function renderAboutPage(): string {
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
      </header>
      
      <div class="about-container">
        <h2 class="about-title">About</h2>
        <p class="about-text">
          AxiomOS is an open-source system monitoring server built with modern web technologies.
        </p>
        <p class="about-text">
          Monitor your system resources in real-time with WebSocket streaming.
        </p>
        <div class="about-footer">
          <p class="about-version">Version 1.0.1</p>
        </div>
      </div>
    </div>
  `;
}

function init(): void {
  document.body.insertAdjacentHTML("afterbegin", renderDock());
  document.body.insertAdjacentHTML("beforeend", '<div id="app"></div>');
  document.body.insertAdjacentHTML("beforeend", renderSettingsModal());

  initTheme();
  initDock(navigate);

  registerRoute("monitor", renderMonitorPage);
  registerRoute("cpu-details", renderCpuDetailsPage);
  registerRoute("memory-details", renderMemoryDetailsPage);
  registerRoute("about", renderAboutPage);

  initRouter();

  (globalThis as typeof globalThis & { onPageChange?: (page: string) => void })
    .onPageChange = (page: string) => {
      setTimeout(() => {
        initSettings();
        if (page === "monitor") {
          connectWebSocket(updateStatsFromData);
        } else if (page === "cpu-details") {
          initCpuDetails();
        } else if (page === "memory-details") {
          initMemoryDetails();
        }
      }, 100);
    };

  const initialPage = getCurrentPage();
  if (initialPage === "monitor") {
    setTimeout(() => {
      initSettings();
      connectWebSocket(updateStatsFromData);
    }, 100);
  } else if (initialPage === "cpu-details") {
    setTimeout(() => {
      initSettings();
      initCpuDetails();
    }, 100);
  } else if (initialPage === "memory-details") {
    setTimeout(() => {
      initSettings();
      initMemoryDetails();
    }, 100);
  } else {
    setTimeout(() => {
      initSettings();
    }, 100);
  }
}

document.addEventListener("DOMContentLoaded", init);
