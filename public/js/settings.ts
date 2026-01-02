import { sendWebSocketMessage } from "./websocket.ts";

export function initSettings(): void {
  const modalBackdrop = document.getElementById("modalBackdrop");
  const settingsBtn = document.getElementById("settingsBtn");
  const closeBtn = document.getElementById("closeBtn");

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      if (modalBackdrop) modalBackdrop.classList.add("active");
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (modalBackdrop) modalBackdrop.classList.remove("active");
    });
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e: MouseEvent) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove("active");
      }
    });
  }

  const refreshSlider = document.getElementById("refreshSlider") as
    | HTMLInputElement
    | null;
  const refreshValue = document.getElementById("refreshValue");
  const savedInterval = localStorage.getItem("refreshInterval") || "2000";

  if (refreshSlider) {
    refreshSlider.value = savedInterval;
  }

  if (refreshValue) {
    refreshValue.textContent = (parseInt(savedInterval, 10) / 1000).toFixed(1);
  }

  if (refreshSlider) {
    refreshSlider.addEventListener("input", (e: Event) => {
      const target = e.target as HTMLInputElement;
      const interval = parseInt(target.value, 10);
      const seconds = (interval / 1000).toFixed(1);
      if (refreshValue) refreshValue.textContent = seconds;
      localStorage.setItem("refreshInterval", interval.toString());

      sendWebSocketMessage({
        type: "setRefreshInterval",
        interval: interval,
      });
    });
  }
}

export function renderSettingsModal(): string {
  return `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Settings</div>
          <button class="close-btn" id="closeBtn">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div class="modal-section">
          <div class="section-title">Accent Color</div>
          <div class="color-grid">
            <div class="color-option active" data-color="violet" title="Violet"></div>
            <div class="color-option" data-color="blue" title="Blue"></div>
            <div class="color-option" data-color="cyan" title="Cyan"></div>
            <div class="color-option" data-color="emerald" title="Emerald"></div>
            <div class="color-option" data-color="rose" title="Rose"></div>
            <div class="color-option" data-color="orange" title="Orange"></div>
            <div class="color-option" data-color="amber" title="Amber"></div>
            <div class="color-option" data-color="slate" title="Slate"></div>
          </div>
        </div>
        
        <div class="modal-section">
          <div class="section-title">Refresh Speed</div>
          <div class="refresh-control">
            <input type="range" id="refreshSlider" min="100" max="10000" step="100" value="2000" class="refresh-slider">
            <div class="refresh-display">
              <span id="refreshValue">2.0</span>
              <span class="refresh-unit">seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
