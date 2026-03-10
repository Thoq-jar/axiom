import { useEffect, useState } from "preact/hooks";
import { sendWebSocketMessage } from "./websocket.ts";
import { applyTheme, themeList as themes } from "./theme.ts";
import { Button, Icon } from "./components.tsx";

const dockPositions = [
  { id: "top", label: "Top", icon: "panel-top" },
  { id: "bottom", label: "Bottom", icon: "panel-bottom" },
  { id: "left", label: "Left", icon: "panel-left" },
  { id: "right", label: "Right", icon: "panel-right" },
];

const categories = [
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "dock", label: "Dock", icon: "layout-dashboard" },
  { id: "interface", label: "Interface", icon: "zap" },
  { id: "style", label: "Style", icon: "sparkles" },
  { id: "data", label: "Data", icon: "activity" },
  { id: "search", label: "Search", icon: "search" },
];

export function applyDockPosition(position: string) {
  document.body.classList.remove(
    "dock-top",
    "dock-bottom",
    "dock-left",
    "dock-right",
  );
  document.body.classList.add(`dock-${position}`);
  const dock = document.getElementById("dock");
  if (dock) dock.setAttribute("data-position", position);
  localStorage.setItem("dockPosition", position);
}

export function initDockSettings() {
  const pos = localStorage.getItem("dockPosition") || "top";
  applyDockPosition(pos);
  const compact = localStorage.getItem("compactDock") === "true";
  if (compact) document.body.classList.add("dock-compact");
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-label">{label}</div>
        <div class="setting-desc">{desc}</div>
      </div>
      <button
        type="button"
        class={`toggle-btn${value ? " active" : ""}`}
        onClick={onChange}
      >
        <div class="toggle-thumb" />
      </button>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div class="slider-row">
      <div class="slider-row-header">
        <span class="setting-label">{label}</span>
        <span class="slider-value">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        class="refresh-slider"
        onInput={(e) =>
          onChange(parseFloat((e.target as HTMLInputElement).value))}
      />
    </div>
  );
}

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("appearance");

  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem("theme") || "violet",
  );
  const [refreshInterval, setRefreshInterval] = useState(
    parseInt(localStorage.getItem("refreshInterval") || "2000", 10),
  );
  const [disableAnimations, setDisableAnimations] = useState(
    localStorage.getItem("disableAnimations") === "true",
  );
  const [dockPosition, setDockPosition] = useState(
    localStorage.getItem("dockPosition") || "top",
  );
  const [compactDock, setCompactDock] = useState(
    localStorage.getItem("compactDock") === "true",
  );
  const [uiOpacity, setUiOpacity] = useState(
    parseFloat(localStorage.getItem("uiOpacity") || "1"),
  );
  const [uiBlur, setUiBlur] = useState(
    parseInt(localStorage.getItem("uiBlur") || "0", 10),
  );
  const [searchEngine, setSearchEngine] = useState(
    localStorage.getItem("searchEngine") || "google",
  );
  const [customSearchUrl, setCustomSearchUrl] = useState(
    localStorage.getItem("customSearchUrl") || "",
  );

  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("#settingsBtn")) setIsOpen(true);
    };
    document.body.addEventListener("click", handleClick);
    return () => document.body.removeEventListener("click", handleClick);
  }, []);

  const handleClose = () => setIsOpen(false);
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) setIsOpen(false);
  };

  const setCSSVar = (name: string, value: string) =>
    document.documentElement.style.setProperty(name, value);

  const handleUiOpacity = (v: number) => {
    setUiOpacity(v);
    localStorage.setItem("uiOpacity", v.toString());
    setCSSVar("--ui-bg", `rgba(22, 22, 24, ${v})`);
    setCSSVar("--ui-bg-hover", `rgba(26, 26, 29, ${v})`);
    setCSSVar("--ui-border", `rgba(34, 34, 37, ${v})`);
  };

  const handleUiBlur = (v: number) => {
    setUiBlur(v);
    localStorage.setItem("uiBlur", v.toString());
    setCSSVar("--ui-blur", `${v}px`);
  };

  const handleRefreshChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const interval = parseInt(target.value, 10);
    setRefreshInterval(interval);
    localStorage.setItem("refreshInterval", interval.toString());
    sendWebSocketMessage({ type: "setRefreshInterval", interval });
  };

  if (!isOpen) return null;

  return (
    <div
      class={`modal-backdrop${isOpen ? " active" : ""}`}
      id="modalBackdrop"
      onClick={handleBackdropClick}
    >
      <div class="settings-modal-full">
        <div class="settings-modal-header">
          <div class="settings-modal-title">
            <Icon name="settings" size={18} />
            Settings
          </div>
          <Button class="close-btn" id="closeBtn" onClick={handleClose}>
            <Icon name="x" size={16} />
          </Button>
        </div>

        <div class="settings-layout">
          <nav class="settings-sidebar">
            {categories.map(({ id, label, icon }) => (
              <button
                type="button"
                key={id}
                class={`settings-nav-item${
                  activeCategory === id ? " active" : ""
                }`}
                onClick={() => setActiveCategory(id)}
              >
                <Icon name={icon} size={15} />
                {label}
              </button>
            ))}
          </nav>

          <div class="settings-content">
            {activeCategory === "appearance" && (
              <div class="settings-pane">
                <div class="settings-pane-title">Accent Color</div>
                <div class="color-grid">
                  {themes.map(({ id, label }) => (
                    <div
                      key={id}
                      class={`color-option${
                        id === currentTheme ? " active" : ""
                      }`}
                      data-color={id}
                      title={label}
                      onClick={() => {
                        setCurrentTheme(id);
                        applyTheme(id);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeCategory === "dock" && (
              <div class="settings-pane">
                <div class="settings-pane-title">Position</div>
                <div class="dock-position-grid">
                  {dockPositions.map(({ id, label, icon }) => (
                    <button
                      type="button"
                      key={id}
                      class={`dock-pos-btn${
                        dockPosition === id ? " active" : ""
                      }`}
                      onClick={() => {
                        setDockPosition(id);
                        applyDockPosition(id);
                      }}
                    >
                      <Icon name={icon} size={18} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <div style="margin-top: 1.25rem;">
                  <ToggleRow
                    label="Compact Mode"
                    desc="Icons only, hide labels"
                    value={compactDock}
                    onChange={() => {
                      const next = !compactDock;
                      setCompactDock(next);
                      localStorage.setItem("compactDock", next.toString());
                      document.body.classList.toggle("dock-compact", next);
                    }}
                  />
                </div>
              </div>
            )}

            {activeCategory === "interface" && (
              <div class="settings-pane">
                <ToggleRow
                  label="Disable Animations"
                  desc="Turn off all transitions and effects"
                  value={disableAnimations}
                  onChange={() => {
                    const next = !disableAnimations;
                    setDisableAnimations(next);
                    localStorage.setItem("disableAnimations", next.toString());
                    document.body.classList.toggle("no-animations", next);
                  }}
                />
              </div>
            )}

            {activeCategory === "style" && (
              <div class="settings-pane">
                <SliderRow
                  label="Opacity"
                  value={uiOpacity}
                  min={0.1}
                  max={1}
                  step={0.05}
                  display={`${Math.round(uiOpacity * 100)}%`}
                  onChange={handleUiOpacity}
                />
                <SliderRow
                  label="Blur"
                  value={uiBlur}
                  min={0}
                  max={40}
                  step={1}
                  display={`${uiBlur}px`}
                  onChange={handleUiBlur}
                />
              </div>
            )}

            {activeCategory === "data" && (
              <div class="settings-pane">
                <div class="settings-pane-title">
                  Refresh Interval — {(refreshInterval / 1000).toFixed(1)}s
                </div>
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
                <div class="refresh-ticks">
                  <span>0.1s</span>
                  <span>5s</span>
                  <span>10s</span>
                </div>
              </div>
            )}

            {activeCategory === "search" && (
              <div class="settings-pane">
                <div class="settings-pane-title">Search Engine</div>
                <div class="search-engine-options">
                  {(["google", "startpage", "custom"] as const).map((e) => (
                    <label key={e} class="search-engine-option">
                      <input
                        type="radio"
                        name="searchEngine"
                        value={e}
                        checked={searchEngine === e}
                        onChange={() => {
                          setSearchEngine(e);
                          localStorage.setItem("searchEngine", e);
                        }}
                      />
                      <span>{e.charAt(0).toUpperCase() + e.slice(1)}</span>
                    </label>
                  ))}
                </div>
                {searchEngine === "custom" && (
                  <div style="margin-top: 1rem;">
                    <div class="settings-pane-title">Custom URL template</div>
                    <p class="setting-desc" style="margin-bottom: 0.5rem;">Use <code>%s</code> where the query should go.</p>
                    <input
                      class="search-engine-url-input"
                      type="text"
                      placeholder="https://example.com/search?q=%s"
                      value={customSearchUrl}
                      onInput={(e) => {
                        const v = (e.target as HTMLInputElement).value;
                        setCustomSearchUrl(v);
                        localStorage.setItem("customSearchUrl", v);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
