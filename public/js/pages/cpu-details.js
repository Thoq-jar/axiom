import { renderDropdown, renderDetailCard, renderInfoRow, initDropdowns } from '../components.js';
import { connectWebSocket } from '../websocket.js';

let lastCpuData = null;

export function renderCpuDetailsPage() {
  return `
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
        ${renderDetailCard(
          'CPU Usage',
          'fa-solid fa-microchip',
          '--',
          'Current Utilization',
          'Waiting for data...'
        )}
        ${renderDetailCard(
          'Load Average',
          'fa-solid fa-chart-line',
          '--',
          'System Load',
          'Calculating...'
        )}
        ${renderDetailCard(
          'Process Count',
          'fa-solid fa-list',
          '--',
          'Running Processes',
          'Loading...'
        )}
      </div>

      ${renderDropdown('cpu-advanced', 'Advanced CPU Information', `
        <div class="mt-1">
          ${renderInfoRow('Architecture', '--')}
          ${renderInfoRow('Cores', '--')}
          ${renderInfoRow('Threads', '--')}
          ${renderInfoRow('Frequency', '--')}
          ${renderInfoRow('Cache Size', '--')}
          ${renderInfoRow('Vendor', '--')}
          ${renderInfoRow('Model', '--')}
        </div>
      `)}

      ${renderDropdown('cpu-processes', 'Top Processes by CPU Usage', `
        <div class="mt-1" id="cpu-processes-list">
          <p class="text-secondary">Loading process information...</p>
        </div>
      `)}
    </div>
  `;
}

export function updateCpuDetails(data) {
  if (!data) return;

  const cpuUsage = data.cpu_usage_percent;
  const cpuInfo = data.cpu_info || {};
  
  const cards = document.querySelectorAll('#cpuDetailsGrid .detail-card');
  if (cards.length >= 3) {
    if (cpuUsage !== null && cpuUsage !== undefined) {
      const cpuValueEl = cards[0].querySelector('.detail-value');
      if (cpuValueEl) {
        cpuValueEl.textContent = cpuUsage.toFixed(1) + '%';
      }
      const cpuExtraEl = cards[0].querySelector('.detail-extra');
      if (cpuExtraEl) {
        cpuExtraEl.textContent = `Current CPU utilization: ${cpuUsage.toFixed(1)}%`;
      }
    }
    
    const loadAvgEl = cards[1].querySelector('.detail-value');
    if (loadAvgEl && cpuUsage !== null && cpuUsage !== undefined) {
      const load = (cpuUsage / 100).toFixed(2);
      loadAvgEl.textContent = load;
      const loadExtraEl = cards[1].querySelector('.detail-extra');
      if (loadExtraEl) {
        loadExtraEl.textContent = `System load average (1 min)`;
      }
    }
    
    const processEl = cards[2].querySelector('.detail-value');
    if (processEl && cpuInfo.cores) {
      processEl.textContent = cpuInfo.cores.toString();
      const processExtraEl = cards[2].querySelector('.detail-extra');
      if (processExtraEl) {
        processExtraEl.textContent = `CPU cores available`;
      }
    }
  }

  const advancedDropdown = document.querySelector('[data-dropdown-content="cpu-advanced"]');
  if (advancedDropdown) {
    const rows = advancedDropdown.querySelectorAll('.info-row');
    if (rows.length >= 7) {
      if (rows[0].querySelector('.info-value')) {
        rows[0].querySelector('.info-value').textContent = cpuInfo.arch || 'Unknown';
      }
      if (rows[1].querySelector('.info-value')) {
        rows[1].querySelector('.info-value').textContent = (cpuInfo.cores || 'Unknown').toString();
      }
      if (rows[2].querySelector('.info-value')) {
        rows[2].querySelector('.info-value').textContent = (cpuInfo.cores ? cpuInfo.cores * 2 : 'Unknown').toString();
      }
      if (rows[3].querySelector('.info-value')) {
        const freq = cpuInfo.freq ? `${cpuInfo.freq.toFixed(2)} GHz` : 'Unknown';
        rows[3].querySelector('.info-value').textContent = freq;
      }
      if (rows[4].querySelector('.info-value')) {
        const cache = cpuInfo.cache ? `${cpuInfo.cache} MB` : 'Unknown';
        rows[4].querySelector('.info-value').textContent = cache;
      }
      if (rows[5].querySelector('.info-value')) {
        rows[5].querySelector('.info-value').textContent = cpuInfo.vendor || 'Unknown';
      }
      if (rows[6].querySelector('.info-value')) {
        rows[6].querySelector('.info-value').textContent = cpuInfo.model || 'Unknown';
      }
    }
  }

  const processesList = document.getElementById('cpu-processes-list');
  if (processesList && data.processes && Array.isArray(data.processes) && data.processes.length > 0) {
    processesList.innerHTML = `
      <div class="processes-grid">
        ${data.processes.map((proc, idx) => `
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
        `).join('')}
      </div>
    `;
  } else if (processesList) {
    processesList.innerHTML = '<p class="text-secondary">No process information available</p>';
  }

  lastCpuData = data;
}

export function initCpuDetails() {
  setTimeout(() => {
    initDropdowns();
    connectWebSocket((data) => {
      updateCpuDetails(data);
    });
  }, 100);
}

export function getLastCpuData() {
  return lastCpuData;
}

