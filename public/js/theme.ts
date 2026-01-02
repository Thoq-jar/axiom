interface ColorTheme {
  accent: string;
  accentDim: string;
  accentShadow: string;
}

const colorThemes: Record<string, ColorTheme> = {
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

let currentTheme: string = localStorage.getItem("theme") || "violet";

export function applyTheme(themeName: string): void {
  const theme = colorThemes[themeName];
  if (!theme) return;

  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent-dim", theme.accentDim);
  document.documentElement.style.setProperty(
    "--accent-shadow",
    theme.accentShadow,
  );

  if (themeName === "femboy") {
    document.body.style.backgroundImage =
      "url('https://wallpaperaccess.com/full/1890776.jpg')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.opacity = "1";

    let overlay = document.querySelector(".theme-bg-overlay") as HTMLElement;
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "theme-bg-overlay";
      document.body.insertBefore(overlay, document.body.firstChild);
    }
    overlay.style.setProperty("opacity", "0.98", "important");
    overlay.style.setProperty(
      "background",
      "rgba(10, 10, 11, 0.98)",
      "important",
    );
    overlay.style.setProperty(
      "background-color",
      "rgba(10, 10, 11, 0.98)",
      "important",
    );
  } else {
    document.body.style.backgroundImage = "";
    const overlay = document.querySelector(".theme-bg-overlay") as HTMLElement;
    if (overlay) {
      overlay.style.setProperty("opacity", "1", "important");
      overlay.style.setProperty("background", "var(--bg-primary)", "important");
      overlay.style.setProperty(
        "background-color",
        "var(--bg-primary)",
        "important",
      );
    }
  }

  currentTheme = themeName;
  localStorage.setItem("theme", themeName);
}

// im sorry, however we live in a cruel world
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
