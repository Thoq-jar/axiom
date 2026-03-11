import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { sendWebSocketMessage } from "./websocket.ts";
import {
  applyTheme,
  type CustomTheme,
  deleteCustomTheme,
  loadCustomThemes,
  saveCustomTheme,
  themeList as themes,
} from "./theme.ts";
import { Button } from "./components/ui/button.tsx";
import { Icon } from "./components/ui/icon.tsx";

const dockPositions = [
  { id: "top", label: "Top", icon: "panel-top" },
  { id: "bottom", label: "Bottom", icon: "panel-bottom" },
  { id: "left", label: "Left", icon: "panel-left" },
  { id: "right", label: "Right", icon: "panel-right" },
];

const categories = [
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "theme-maker", label: "Theme Maker", icon: "wand-sparkles" },
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

  const uiOpacity = parseFloat(localStorage.getItem("uiOpacity") || "1");
  const root = document.documentElement.style;
  root.setProperty("--ui-bg", `rgba(22, 22, 24, ${uiOpacity})`);
  root.setProperty("--ui-bg-hover", `rgba(26, 26, 29, ${uiOpacity})`);
  root.setProperty("--ui-border", `rgba(34, 34, 37, ${uiOpacity})`);
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
    <div class="flex items-center justify-between gap-4">
      <div class="flex-1">
        <div class="text-[0.9rem] text-(--text-primary) mb-0.5 font-medium">
          {label}
        </div>
        <div class="text-xs text-(--text-muted)">{desc}</div>
      </div>
      <button
        type="button"
        class={`w-11 h-6 rounded-xl relative shrink-0 transition-all duration-200 p-0 cursor-pointer border ${
          value
            ? "bg-(--accent) border-(--accent)"
            : "bg-(--bg-secondary) border-(--border-accent)"
        }`}
        onClick={onChange}
      >
        <div
          class={`toggle-thumb absolute top-0.75 left-0.75 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.3)] ${
            value ? "translate-x-5" : ""
          }`}
        />
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
    <div class="flex flex-col gap-2">
      <div class="flex justify-between items-center">
        <span class="text-[0.9rem] text-(--text-primary) font-medium">
          {label}
        </span>
        <span class="text-[0.8rem] text-(--accent) font-semibold">
          {display}
        </span>
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

function generateThemeId(): string {
  return `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function ThemeMakerPane({
  onThemeApplied,
}: {
  onThemeApplied: (themeId: string) => void;
}) {
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(
    loadCustomThemes,
  );
  const [themeName, setThemeName] = useState("");
  const [accentColor, setAccentColor] = useState("#8b5cf6");
  const [backgroundType, setBackgroundType] = useState<
    "none" | "color" | "image"
  >("none");
  const [backgroundValue, setBackgroundValue] = useState("");
  const [imageSourceMode, setImageSourceMode] = useState<"url" | "upload">(
    "url",
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.9);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setThemeName("");
    setAccentColor("#8b5cf6");
    setBackgroundType("none");
    setBackgroundValue("");
    setImageSourceMode("url");
    setUploadedFileName(null);
    setOverlayOpacity(0.9);
    setEditingThemeId(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!themeName.trim()) return;
    const themeId = editingThemeId ?? generateThemeId();
    const newTheme: CustomTheme = {
      id: themeId,
      label: themeName.trim(),
      accent: accentColor,
      backgroundType,
      backgroundValue,
      overlayOpacity,
    };
    saveCustomTheme(newTheme);
    setCustomThemes(loadCustomThemes());
    applyTheme(themeId);
    onThemeApplied(themeId);
    resetForm();
  }, [
    themeName,
    accentColor,
    backgroundType,
    backgroundValue,
    overlayOpacity,
    editingThemeId,
    onThemeApplied,
    resetForm,
  ]);

  const handleEdit = useCallback((theme: CustomTheme) => {
    setThemeName(theme.label);
    setAccentColor(theme.accent);
    setBackgroundType(theme.backgroundType);
    setBackgroundValue(theme.backgroundValue);
    setOverlayOpacity(theme.overlayOpacity);
    setEditingThemeId(theme.id);
    if (theme.backgroundType === "image") {
      const isDataUrl = theme.backgroundValue.startsWith("data:");
      setImageSourceMode(isDataUrl ? "upload" : "url");
      setUploadedFileName(isDataUrl ? "uploaded image" : null);
    } else {
      setImageSourceMode("url");
      setUploadedFileName(null);
    }
  }, []);

  const handleDelete = useCallback((themeId: string) => {
    deleteCustomTheme(themeId);
    setCustomThemes(loadCustomThemes());
    if (editingThemeId === themeId) resetForm();
  }, [editingThemeId, resetForm]);

  const handleFileUpload = useCallback((e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      setBackgroundValue(dataUrl);
      setUploadedFileName(file.name);
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    <div class="flex flex-col gap-4">
      <div class="text-[0.7rem] font-semibold uppercase tracking-widest text-(--text-muted) mb-1">
        {editingThemeId ? "Edit Custom Theme" : "Create Custom Theme"}
      </div>

      <div class="flex flex-col gap-4 bg-(--ui-bg) border border-(--ui-border) rounded-[10px] p-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[0.7rem] font-semibold uppercase tracking-wide text-(--text-muted)">
            Name
          </label>
          <input
            class="bg-(--bg-card) border border-(--border-subtle) rounded-md text-(--text-primary) font-mono text-[0.8rem] py-1.5 px-2.5 outline-none flex-1 transition-[border-color] duration-150 focus:border-(--accent)"
            type="text"
            placeholder="My Theme"
            value={themeName}
            onInput={(e) => setThemeName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[0.7rem] font-semibold uppercase tracking-wide text-(--text-muted)">
            Accent Color
          </label>
          <div class="flex items-center gap-2">
            <input
              class="w-9 h-9 border border-(--border-subtle) rounded-md cursor-pointer p-0.5 bg-(--bg-card) shrink-0"
              type="color"
              value={accentColor}
              onInput={(e) =>
                setAccentColor((e.target as HTMLInputElement).value)}
            />
            <input
              class="bg-(--bg-card) border border-(--border-subtle) rounded-md text-(--text-primary) font-mono text-[0.8rem] py-1.5 px-2.5 outline-none flex-1 transition-[border-color] duration-150 focus:border-(--accent)"
              type="text"
              placeholder="#8b5cf6"
              value={accentColor}
              onInput={(e) =>
                setAccentColor((e.target as HTMLInputElement).value)}
            />
            <div
              class="w-9 h-9 rounded-md border border-(--border-subtle) shrink-0"
              style={{ background: accentColor }}
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[0.7rem] font-semibold uppercase tracking-wide text-(--text-muted)">
            Background
          </label>
          <div class="flex gap-1.5">
            {(["none", "color", "image"] as const).map((type) => (
              <button
                key={type}
                type="button"
                class={`flex-1 py-1.5 px-2.5 text-xs font-mono border rounded-md cursor-pointer transition-all duration-150 ${
                  backgroundType === type
                    ? "bg-(--accent-dim) border-(--accent) text-(--accent)"
                    : "bg-(--bg-card) border-(--border-subtle) text-(--text-secondary) hover:border-(--border-accent) hover:text-(--text-primary)"
                }`}
                onClick={() => setBackgroundType(type)}
              >
                {type === "none"
                  ? "None"
                  : type === "color"
                  ? "Color"
                  : "Image URL"}
              </button>
            ))}
          </div>

          {backgroundType === "color" && (
            <div class="flex items-center gap-2 mt-2">
              <input
                class="w-9 h-9 border border-(--border-subtle) rounded-md cursor-pointer p-0.5 bg-(--bg-card) shrink-0"
                type="color"
                value={backgroundValue || "#000000"}
                onInput={(e) =>
                  setBackgroundValue((e.target as HTMLInputElement).value)}
              />
              <input
                class="bg-(--bg-card) border border-(--border-subtle) rounded-md text-(--text-primary) font-mono text-[0.8rem] py-1.5 px-2.5 outline-none flex-1 transition-[border-color] duration-150 focus:border-(--accent)"
                type="text"
                placeholder="#000000"
                value={backgroundValue}
                onInput={(e) =>
                  setBackgroundValue((e.target as HTMLInputElement).value)}
              />
            </div>
          )}

          {backgroundType === "image" && (
            <div class="mt-2 flex flex-col gap-2">
              <div class="flex gap-1">
                <button
                  type="button"
                  class={`flex-1 py-1 px-2.5 text-[0.72rem] font-mono border rounded cursor-pointer transition-all duration-150 ${
                    imageSourceMode === "url"
                      ? "bg-(--accent-dim) border-(--accent) text-(--accent)"
                      : "bg-(--bg-card) border-(--border-subtle) text-(--text-secondary) hover:border-(--border-accent) hover:text-(--text-primary)"
                  }`}
                  onClick={() => {
                    setImageSourceMode("url");
                    setBackgroundValue("");
                    setUploadedFileName(null);
                  }}
                >
                  URL
                </button>
                <button
                  type="button"
                  class={`flex-1 py-1 px-2.5 text-[0.72rem] font-mono border rounded cursor-pointer transition-all duration-150 ${
                    imageSourceMode === "upload"
                      ? "bg-(--accent-dim) border-(--accent) text-(--accent)"
                      : "bg-(--bg-card) border-(--border-subtle) text-(--text-secondary) hover:border-(--border-accent) hover:text-(--text-primary)"
                  }`}
                  onClick={() => {
                    setImageSourceMode("upload");
                    setBackgroundValue("");
                    setUploadedFileName(null);
                  }}
                >
                  Upload
                </button>
              </div>

              {imageSourceMode === "url" && (
                <input
                  class="bg-(--bg-card) border border-(--border-subtle) rounded-md text-(--text-primary) font-mono text-[0.8rem] py-1.5 px-2.5 outline-none flex-1 transition-[border-color] duration-150 focus:border-(--accent)"
                  type="text"
                  placeholder="https://example.com/wallpaper.jpg"
                  value={backgroundValue}
                  onInput={(e) =>
                    setBackgroundValue((e.target as HTMLInputElement).value)}
                />
              )}

              {imageSourceMode === "upload" && (
                <div
                  class="border border-dashed border-(--border-accent) rounded-lg py-3 px-4 cursor-pointer transition-all duration-150 bg-(--bg-card) hover:border-(--accent) hover:bg-(--accent-dim)"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                  {uploadedFileName
                    ? (
                      <div class="flex items-center gap-2 text-(--accent) text-[0.78rem] min-w-0">
                        <Icon name="image" size={14} />
                        <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {uploadedFileName}
                        </span>
                        <button
                          type="button"
                          class="flex items-center justify-center w-4.5 h-4.5 rounded bg-transparent border-none text-(--text-muted) cursor-pointer shrink-0 transition-colors duration-150 hover:text-(--danger)"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBackgroundValue("");
                            setUploadedFileName(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    )
                    : (
                      <div class="flex items-center justify-center gap-2 text-(--text-secondary) text-[0.78rem]">
                        <Icon name="upload" size={16} />
                        <span>Click to upload image</span>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        {backgroundType !== "none" && (
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center">
              <label class="text-[0.7rem] font-semibold uppercase tracking-wide text-(--text-muted)">
                Overlay Opacity
              </label>
              <span class="text-[0.8rem] text-(--accent) font-semibold">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              class="refresh-slider"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onInput={(e) =>
                setOverlayOpacity(
                  parseFloat((e.target as HTMLInputElement).value),
                )}
            />
          </div>
        )}

        <div class="flex gap-2 justify-end mt-1">
          {editingThemeId && (
            <button
              type="button"
              class="font-mono text-[0.78rem] py-1.5 px-4 rounded-md cursor-pointer transition-all duration-150 border bg-(--bg-card) text-(--text-secondary) border-(--border-subtle) hover:border-(--border-accent) hover:text-(--text-primary)"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            class="font-mono text-[0.78rem] py-1.5 px-4 rounded-md cursor-pointer transition-all duration-150 border bg-(--accent) text-white border-(--accent) hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={!themeName.trim()}
          >
            {editingThemeId ? "Update Theme" : "Save Theme"}
          </button>
        </div>
      </div>

      {customThemes.length > 0 && (
        <div>
          <div class="text-[0.7rem] font-semibold uppercase tracking-widest text-(--text-muted) mb-1 mt-2">
            Saved Themes
          </div>
          <div class="flex flex-col gap-1.5">
            {customThemes.map((savedTheme) => (
              <div
                key={savedTheme.id}
                class="flex items-center justify-between bg-(--ui-bg) border border-(--ui-border) rounded-lg py-2 px-3 transition-[border-color] duration-150 hover:border-(--border-accent)"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="w-4.5 h-4.5 rounded shrink-0 border border-white/10"
                    style={{ background: savedTheme.accent }}
                  />
                  <span class="text-[0.8rem] text-(--text-primary) whitespace-nowrap overflow-hidden text-ellipsis">
                    {savedTheme.label}
                  </span>
                  {savedTheme.backgroundType !== "none" && (
                    <span class="text-[0.65rem] py-0.5 px-1.5 bg-(--accent-dim) text-(--accent) rounded whitespace-nowrap shrink-0">
                      {savedTheme.backgroundType === "image" ? "img" : "color"}
                      {" "}
                      bg
                    </span>
                  )}
                </div>
                <div class="flex gap-1 shrink-0">
                  <button
                    type="button"
                    class="flex items-center justify-center w-6.5 h-6.5 rounded bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) cursor-pointer transition-all duration-150 hover:border-(--border-accent) hover:text-(--text-primary)"
                    title="Apply"
                    onClick={() => {
                      applyTheme(savedTheme.id);
                      onThemeApplied(savedTheme.id);
                    }}
                  >
                    <Icon name="check" size={13} />
                  </button>
                  <button
                    type="button"
                    class="flex items-center justify-center w-6.5 h-6.5 rounded bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) cursor-pointer transition-all duration-150 hover:border-(--border-accent) hover:text-(--text-primary)"
                    title="Edit"
                    onClick={() => handleEdit(savedTheme)}
                  >
                    <Icon name="pencil" size={13} />
                  </button>
                  <button
                    type="button"
                    class="flex items-center justify-center w-6.5 h-6.5unded bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) cursor-pointer transition-all duration-150 hover:border-(--danger) hover:text-(--danger) hover:bg-[rgba(239,68,68,0.08)]"
                    title="Delete"
                    onClick={() => handleDelete(savedTheme.id)}
                  >
                    <Icon name="trash-2" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      class={`fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-9999 grid place-items-center ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      } transition-opacity duration-200`}
      id="modalBackdrop"
      onClick={handleBackdropClick}
    >
      <div
        class="bg-(--bg-card) border border-(--border-accent) rounded-2xl w-[92vw] max-w-170 h-[80vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        style={{ animation: "modalSlideIn 0.25s ease" }}
      >
        <div class="flex items-center justify-between py-5 px-6 border-b border-(--border-subtle) shrink-0">
          <div class="text-[1.05rem] font-semibold text-(--text-primary) flex items-center gap-2.5">
            <Icon name="settings" size={18} class="text-(--accent)" />
            Settings
          </div>
          <Button
            class="w-8 h-8 bg-transparent border-none rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 text-(--text-muted) hover:bg-(--bg-secondary) hover:text-(--text-primary)"
            id="closeBtn"
            onClick={handleClose}
          >
            <Icon name="x" size={16} />
          </Button>
        </div>

        <div class="flex flex-1 overflow-hidden">
          <nav class="settings-content w-40 shrink-0 border-r border-(--border-subtle) py-3 px-2 flex flex-col gap-0.5 bg-(--bg-secondary) overflow-y-auto">
            {categories.map(({ id, label, icon }) => (
              <button
                type="button"
                key={id}
                class={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg border-none bg-transparent font-[inherit] text-[0.85rem] cursor-pointer transition-all duration-150 text-left w-full ${
                  activeCategory === id
                    ? "bg-(--accent-dim) text-(--accent)"
                    : "text-(--text-secondary) hover:bg-(--bg-card-hover) hover:text-(--text-primary)"
                }`}
                onClick={() => setActiveCategory(id)}
              >
                <Icon name={icon} size={15} />
                {label}
              </button>
            ))}
          </nav>

          <div class="settings-content flex-1 overflow-y-auto p-6">
            {activeCategory === "appearance" && (
              <div class="flex flex-col gap-4">
                <div class="text-[0.7rem] font-semibold uppercase tracking-widest text-(--text-muted) mb-1">
                  Accent Color
                </div>
                <div class="grid grid-cols-5 gap-3">
                  {themes.map(({ id, label }) => (
                    <div
                      key={id}
                      class={`color-option aspect-square rounded-[10px] border-2 cursor-pointer transition-all duration-200 relative flex items-center justify-center ${
                        id === currentTheme
                          ? "active border-(--accent) shadow-[0_0_0_3px_var(--accent-dim)]"
                          : "border-(--border-subtle) hover:border-(--border-accent) hover:scale-105"
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

            {activeCategory === "theme-maker" && (
              <ThemeMakerPane
                onThemeApplied={(themeId) => setCurrentTheme(themeId)}
              />
            )}

            {activeCategory === "dock" && (
              <div class="flex flex-col gap-4">
                <div class="text-[0.7rem] font-semibold uppercase tracking-widest text-(--text-muted) mb-1">
                  Position
                </div>
                <div class="grid grid-cols-4 gap-2">
                  {dockPositions.map(({ id, label, icon }) => (
                    <button
                      type="button"
                      key={id}
                      class={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] border font-[inherit] text-xs cursor-pointer transition-all duration-200 ${
                        dockPosition === id
                          ? "border-(--accent) bg-(--accent-dim) text-(--accent)"
                          : "bg-(--bg-secondary) border-(--border-subtle) text-(--text-secondary) hover:border-(--border-accent) hover:text-(--text-primary) hover:bg-(--bg-card-hover)"
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

                <div class="mt-5">
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
              <div class="flex flex-col gap-4">
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
              <div class="flex flex-col gap-4">
                <SliderRow
                  label="Opacity"
                  value={uiOpacity}
                  min={0.1}
                  max={1}
                  step={0.05}
                  display={`${Math.round(uiOpacity * 100)}%`}
                  onChange={handleUiOpacity}
                />
              </div>
            )}

            {activeCategory === "data" && (
              <div class="flex flex-col gap-4">
                <div class="text-[0.7rem] font-semibold uppercase tracking-widest text-(--text-muted) mb-1">
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
                <div class="flex justify-between mt-1.5 text-[0.65rem] text-(--text-muted)">
                  <span>0.1s</span>
                  <span>5s</span>
                  <span>10s</span>
                </div>
              </div>
            )}

            {activeCategory === "search" && (
              <div class="flex flex-col gap-4">
                <div class="text-[0.7rem] font-semibold uppercase tracking-widest text-(--text-muted) mb-1">
                  Search Engine
                </div>
                <div class="flex flex-col gap-2 mb-2">
                  {(["google", "startpage", "custom"] as const).map((e) => (
                    <label
                      key={e}
                      class="flex items-center gap-2.5 text-[0.9rem] text-(--text-secondary) cursor-pointer py-1.5 hover:text-(--text-primary)"
                    >
                      <input
                        type="radio"
                        name="searchEngine"
                        value={e}
                        checked={searchEngine === e}
                        class="w-3.5 h-3.5"
                        style={{ accentColor: "var(--accent)" }}
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
                  <div class="mt-4">
                    <div class="text-[0.7rem] font-semibold uppercase tracking-widest text-(--text-muted) mb-1">
                      Custom URL template
                    </div>
                    <p class="text-xs text-(--text-muted) mb-2">
                      Use <code>%s</code> where the query should go.
                    </p>
                    <input
                      class="w-full bg-(--bg-secondary) border border-(--border-accent) rounded-lg py-2.5 px-3.5 text-(--text-primary) font-[inherit] text-[0.85rem] outline-none transition-[border-color] duration-200 focus:border-(--accent) placeholder:text-(--text-muted)"
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
