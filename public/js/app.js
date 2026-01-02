import { renderDock, initDock } from './dock.js';
import { registerRoute, navigate, initRouter, getCurrentPage } from './router.js';
import { renderMonitorPage, updateStatsFromData } from './monitor.js';
import { renderSettingsModal, initSettings } from './settings.js';
import { initTheme } from './theme.js';
import { connectWebSocket } from './websocket.js';
import { renderCpuDetailsPage, initCpuDetails } from './pages/cpu-details.js';
import { renderMemoryDetailsPage, initMemoryDetails } from './pages/memory-details.js';

function renderAboutPage() {
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
          <p class="about-version">Version 1.0.0</p>
        </div>
      </div>
    </div>
  `;
}

function init() {
  document.body.insertAdjacentHTML('afterbegin', renderDock());
  document.body.insertAdjacentHTML('beforeend', '<div id="app"></div>');
  document.body.insertAdjacentHTML('beforeend', renderSettingsModal());

  initTheme();
  initDock(navigate);
  
  registerRoute('monitor', renderMonitorPage);
  registerRoute('cpu-details', renderCpuDetailsPage);
  registerRoute('memory-details', renderMemoryDetailsPage);
  registerRoute('about', renderAboutPage);
  
  initRouter();
  
  globalThis.onPageChange = (page) => {
    setTimeout(() => {
      initSettings();
      if (page === 'monitor') {
        connectWebSocket(updateStatsFromData);
      } else if (page === 'cpu-details') {
        initCpuDetails();
      } else if (page === 'memory-details') {
        initMemoryDetails();
      }
    }, 100);
  };
  
  const initialPage = getCurrentPage();
  if (initialPage === 'monitor') {
    setTimeout(() => {
      initSettings();
      connectWebSocket(updateStatsFromData);
    }, 100);
  } else if (initialPage === 'cpu-details') {
    setTimeout(() => {
      initSettings();
      initCpuDetails();
    }, 100);
  } else if (initialPage === 'memory-details') {
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

document.addEventListener('DOMContentLoaded', init);

