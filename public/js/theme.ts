interface ColorTheme {
  accent: string;
  accentDim: string;
  accentShadow: string;
}

export interface CustomTheme {
  id: string;
  label: string;
  accent: string;
  backgroundType: "none" | "color" | "image";
  backgroundValue: string;
  overlayOpacity: number;
}

export const themeList: { id: string; label: string }[] = [
  { id: "violet", label: "Violet" },
  { id: "blue", label: "Blue" },
  { id: "cyan", label: "Cyan" },
  { id: "emerald", label: "Emerald" },
  { id: "rose", label: "Rose" },
  { id: "femboy", label: "Femboy" },
  { id: "livid", label: "Livid" },
  { id: "orange", label: "Orange" },
  { id: "amber", label: "Amber" },
  { id: "slate", label: "Slate" },
];

const builtinColorThemes: Record<string, ColorTheme> = {
  violet: {
    accent: "#8b5cf6",
    accentDim: "rgba(139, 92, 246, 0.15)",
    accentShadow: "rgba(139, 92, 246, 0.3)",
  },
  blue: {
    accent: "#3b82f6",
    accentDim: "rgba(59, 130, 246, 0.15)",
    accentShadow: "rgba(59, 130, 246, 0.3)",
  },
  cyan: {
    accent: "#06b6d4",
    accentDim: "rgba(6, 182, 212, 0.15)",
    accentShadow: "rgba(6, 182, 212, 0.3)",
  },
  emerald: {
    accent: "#10b981",
    accentDim: "rgba(16, 185, 129, 0.15)",
    accentShadow: "rgba(16, 185, 129, 0.3)",
  },
  rose: {
    accent: "#f43f5e",
    accentDim: "rgba(244, 63, 94, 0.15)",
    accentShadow: "rgba(244, 63, 94, 0.3)",
  },
  femboy: {
    accent: "#ec4899",
    accentDim: "rgba(236, 72, 153, 0.15)",
    accentShadow: "rgba(236, 72, 153, 0.3)",
  },
  livid: {
    accent: "#6699CC",
    accentDim: "rgba(102, 153, 204, 0.3)",
    accentShadow: "rgba(102, 153, 204, 0.15)",
  },
  orange: {
    accent: "#f97316",
    accentDim: "rgba(249, 115, 22, 0.15)",
    accentShadow: "rgba(249, 115, 22, 0.3)",
  },
  amber: {
    accent: "#f59e0b",
    accentDim: "rgba(245, 158, 11, 0.15)",
    accentShadow: "rgba(245, 158, 11, 0.3)",
  },
  slate: {
    accent: "#64748b",
    accentDim: "rgba(100, 116, 139, 0.15)",
    accentShadow: "rgba(100, 116, 139, 0.3)",
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function buildColorThemeFromHex(hex: string): ColorTheme {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return { accent: hex, accentDim: `${hex}26`, accentShadow: `${hex}4d` };
  }
  return {
    accent: hex,
    accentDim: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
    accentShadow: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
  };
}

export function loadCustomThemes(): CustomTheme[] {
  try {
    const stored = localStorage.getItem("customThemes");
    if (!stored) return [];
    return JSON.parse(stored) as CustomTheme[];
  } catch {
    return [];
  }
}

export function saveCustomTheme(theme: CustomTheme): void {
  const existing = loadCustomThemes();
  const index = existing.findIndex((stored) => stored.id === theme.id);
  if (index >= 0) {
    existing[index] = theme;
  } else {
    existing.push(theme);
  }
  localStorage.setItem("customThemes", JSON.stringify(existing));
}

export function deleteCustomTheme(themeId: string): void {
  const existing = loadCustomThemes();
  const filtered = existing.filter((stored) => stored.id !== themeId);
  localStorage.setItem("customThemes", JSON.stringify(filtered));
}

function applyBackground(
  backgroundType: "none" | "color" | "image",
  backgroundValue: string,
  overlayOpacity: number,
): void {
  let overlay = document.querySelector(".theme-bg-overlay") as HTMLElement;
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-0 pointer-events-none";
    document.body.insertBefore(overlay, document.body.firstChild);
  }

  if (backgroundType === "none") {
    document.body.style.backgroundImage = "";
    document.body.style.backgroundColor = "";
    overlay.style.setProperty("opacity", "1", "important");
    overlay.style.setProperty("background", "var(--bg-primary)", "important");
    overlay.style.setProperty(
      "background-color",
      "var(--bg-primary)",
      "important",
    );
    return;
  }

  if (backgroundType === "color") {
    document.body.style.backgroundImage = "";
    document.body.style.backgroundColor = backgroundValue;
    overlay.style.setProperty(
      "opacity",
      overlayOpacity.toString(),
      "important",
    );
    overlay.style.setProperty(
      "background",
      `rgba(10, 10, 11, ${overlayOpacity})`,
      "important",
    );
    overlay.style.setProperty(
      "background-color",
      `rgba(10, 10, 11, ${overlayOpacity})`,
      "important",
    );
    return;
  }

  if (backgroundType === "image") {
    document.body.style.backgroundImage = `url('${backgroundValue}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundRepeat = "no-repeat";
    overlay.style.setProperty(
      "opacity",
      overlayOpacity.toString(),
      "important",
    );
    overlay.style.setProperty(
      "background",
      `rgba(10, 10, 11, ${overlayOpacity})`,
      "important",
    );
    overlay.style.setProperty(
      "background-color",
      `rgba(10, 10, 11, ${overlayOpacity})`,
      "important",
    );
    return;
  }
}

let currentTheme: string = localStorage.getItem("theme") || "violet";

export function applyTheme(themeName: string): void {
  const customThemes = loadCustomThemes();
  const customTheme = customThemes.find((stored) => stored.id === themeName);

  if (customTheme) {
    const colorTheme = buildColorThemeFromHex(customTheme.accent);
    const rgb = hexToRgb(customTheme.accent);
    document.documentElement.style.setProperty("--accent", colorTheme.accent);
    document.documentElement.style.setProperty(
      "--accent-dim",
      colorTheme.accentDim,
    );
    document.documentElement.style.setProperty(
      "--accent-shadow",
      colorTheme.accentShadow,
    );
    if (rgb) {
      document.documentElement.style.setProperty(
        "--accent-rgb",
        `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      );
    }
    applyBackground(
      customTheme.backgroundType,
      customTheme.backgroundValue,
      customTheme.overlayOpacity,
    );
    currentTheme = themeName;
    localStorage.setItem("theme", themeName);
    return;
  }

  if (themeName === "femboy") {
    const theme = builtinColorThemes[themeName];
    const rgb = hexToRgb(theme.accent);
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.documentElement.style.setProperty("--accent-dim", theme.accentDim);
    document.documentElement.style.setProperty(
      "--accent-shadow",
      theme.accentShadow,
    );
    if (rgb) {
      document.documentElement.style.setProperty(
        "--accent-rgb",
        `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      );
    }
    applyBackground("image", "/assets/special.jpg", 0.90);
    currentTheme = themeName;
    localStorage.setItem("theme", themeName);
    return;
  }

  const theme = builtinColorThemes[themeName];
  if (!theme) return;

  const rgb = hexToRgb(theme.accent);
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent-dim", theme.accentDim);
  document.documentElement.style.setProperty(
    "--accent-shadow",
    theme.accentShadow,
  );
  if (rgb) {
    document.documentElement.style.setProperty(
      "--accent-rgb",
      `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    );
  }
  applyBackground("none", "", 1);

  currentTheme = themeName;
  localStorage.setItem("theme", themeName);
}

// we live in a cruel world
export function initTheme(): void {
  let times = 0;
  applyTheme(currentTheme);

  setTimeout(() => {
    if (times >= 10) {
      return;
    }
    applyTheme(currentTheme);
    times++;
  }, 1);
}
