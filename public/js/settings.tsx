import { useEffect, useState } from "preact/hooks";
import { sendWebSocketMessage } from "./websocket.ts";
import { applyTheme } from "./theme.ts";

const themes = [
  "violet",
  "blue",
  "cyan",
  "emerald",
  "rose",
  "femboy",
  "orange",
  "amber",
  "slate",
];

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem("theme") || "violet",
  );
  const [refreshInterval, setRefreshInterval] = useState(
    parseInt(localStorage.getItem("refreshInterval") || "2000", 10),
  );

  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const settingsBtn = target.closest("#settingsBtn");
      if (settingsBtn) {
        setIsOpen(true);
      }
    };

    document.body.addEventListener("click", handleClick);
    return () => {
      document.body.removeEventListener("click", handleClick);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  };

  const handleRefreshChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const interval = parseInt(target.value, 10);
    setRefreshInterval(interval);
    localStorage.setItem("refreshInterval", interval.toString());
    sendWebSocketMessage({
      type: "setRefreshInterval",
      interval: interval,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      class={`modal-backdrop${isOpen ? " active" : ""}`}
      id="modalBackdrop"
      onClick={handleBackdropClick}
    >
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Settings</div>
          <button
            type="button"
            class="close-btn"
            id="closeBtn"
            onClick={handleClose}
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="modal-section">
          <div class="section-title">Accent Color</div>
          <div class="color-grid">
            {themes.map((theme) => (
              <div
                key={theme}
                class={`color-option${theme === currentTheme ? " active" : ""}`}
                data-color={theme}
                title={theme.charAt(0).toUpperCase() + theme.slice(1)}
                onClick={() => handleThemeChange(theme)}
              >
              </div>
            ))}
          </div>
        </div>

        <div class="modal-section">
          <div class="section-title">Refresh Speed</div>
          <div class="refresh-control">
            <input
              type="range"
              id="refreshSlider"
              min="100"
              max="10000"
              step="100"
              value={refreshInterval}
              class="refresh-slider"
              onInput={handleRefreshChange}
            />
            <div class="refresh-display">
              <span id="refreshValue">
                {(refreshInterval / 1000).toFixed(1)}
              </span>
              <span class="refresh-unit">seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
