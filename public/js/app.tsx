import { useEffect, useRef, useState } from "preact/hooks";
import { render } from "preact";
import { RouterOutlet, RouterProvider } from "./router.tsx";
import { Dock } from "./dock.tsx";
import { MonitorPage } from "./monitor.tsx";
import { CpuDetailsPage } from "./pages/cpu-details.tsx";
import { MemoryDetailsPage } from "./pages/memory-details.tsx";
import { initDockSettings, SettingsModal } from "./settings.tsx";
import { initTheme } from "./theme.ts";
import { initGlobalDataStore } from "./store.ts";
import { AppStorePage } from "./pages/app-store.tsx";
import { OverviewPage } from "./pages/overview.tsx";
import { Button, Icon, Modal, ToastProvider, useToast } from "./components.tsx";
import { isConnected } from "./websocket.ts";

function AboutPage() {
  const [license, setLicense] = useState<string | null>(null);
  const [showLicense, setShowLicense] = useState(false);
  const [loadingLicense, setLoadingLicense] = useState(false);

  const handleViewLicense = async () => {
    if (license) {
      setShowLicense(true);
      return;
    }
    setLoadingLicense(true);
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/Thoq-jar/axiom/refs/heads/main/LICENSE",
      );
      const text = await res.text();
      setLicense(text);
      setShowLicense(true);
    } catch {
      setLicense("Failed to load license.");
      setShowLicense(true);
    } finally {
      setLoadingLicense(false);
    }
  };

  return (
    <div class="max-w-[1100px] mx-auto py-12 px-8 relative z-[1]">
      <header class="mb-16 opacity-0 flex items-center justify-between" style={{ animation: "fadeSlideIn 0.6s ease forwards" }}>
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 relative flex items-center justify-center text-[var(--accent)] bg-transparent rounded-lg text-2xl">
            <Icon name="box" size={24} />
          </div>
          <div class="flex flex-col">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-[var(--text-primary)] leading-none mb-1">AxiomOS</h1>
            <p class="text-[0.7rem] text-[var(--text-muted)] tracking-widest uppercase">Server [OSS]</p>
          </div>
        </div>
      </header>

      <div class="about-container max-w-[600px] mx-auto opacity-0" style={{ animation: "fadeSlideIn 0.6s ease 0.2s forwards" }}>
        <h2 class="about-title mb-4 text-2xl opacity-0" style={{ animation: "fadeSlideIn 0.5s ease 0.3s forwards" }}>About</h2>
        <p class="about-text text-[var(--text-secondary)] leading-relaxed mb-4 opacity-0" style={{ animation: "fadeSlideIn 0.5s ease 0.4s forwards" }}>
          AxiomOS is an open-source system monitoring server built with modern
          web technologies.
        </p>
        <p class="about-text text-[var(--text-secondary)] leading-relaxed mb-4 opacity-0" style={{ animation: "fadeSlideIn 0.5s ease 0.5s forwards" }}>
          Monitor your system resources in real-time with WebSocket streaming.
        </p>
        <div class="about-footer mt-8 pt-8 border-t border-[var(--border-subtle)] opacity-0" style={{ animation: "fadeSlideIn 0.5s ease 0.6s forwards" }}>
          <p class="text-[var(--text-muted)] text-[0.85rem]">Version 1.0.1</p>
          <button
            class="inline-flex items-center gap-1.5 mt-4 py-2 px-4 bg-[var(--accent-dim)] border border-[var(--accent)] rounded-lg text-[var(--accent)] text-[0.8rem] font-[inherit] cursor-pointer transition-all duration-200 hover:bg-[var(--accent)] hover:text-white"
            onClick={handleViewLicense}
            disabled={loadingLicense}
          >
            <Icon name="scroll" size={14} />
            {loadingLicense ? "Loading..." : "View License"}
          </button>
        </div>
      </div>

      {showLicense && (
        <Modal title="License" icon="scroll" onClose={() => setShowLicense(false)} class="!w-[90%] !max-w-[640px] !h-[70vh]">
          <pre class="p-6 overflow-y-auto text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words leading-[1.7] flex-1 min-h-0">{license}</pre>
        </Modal>
      )}
    </div>
  );
}

function GlobalWebSocketListener() {
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  useEffect(() => {
    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${globalThis.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "installation_finished") {
          addToastRef.current("Installation finished!", "success");
        }
      } catch (error) {
        console.error("WS error", error);
      }
    };

    return () => ws.close();
  }, []);

  return null;
}

function GlobalFooter() {
  const [version, setVersion] = useState("—");
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("—");

  useEffect(() => {
    fetch("/api/version").then((r) => r.text()).then(setVersion).catch(() => {});
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = isConnected();
      setConnected(now);
      if (now) {
        setLastUpdate(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer class="fixed bottom-0 left-0 right-0 py-2 px-8 bg-[rgba(10,10,11,0.88)] backdrop-blur-[12px] border-t border-[var(--border-subtle)] flex items-center justify-between z-[1500] text-[0.72rem]">
      <div class="flex items-center gap-3">
        <div class={`status-dot w-2 h-2 rounded-full relative ${connected ? "bg-[var(--success)]" : "status-dot-off"}`} />
        <div class="text-xs text-[var(--text-secondary)]">
          {connected ? <>Updated <span class="text-[var(--text-muted)]">{lastUpdate}</span></> : "Disconnected"}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-[0.65rem] text-[var(--text-muted)] tracking-wide">Axiom {version}</div>
        <Button
          class="w-7 h-7 p-0 bg-transparent border-transparent flex items-center justify-center cursor-pointer transition-all duration-200 text-[var(--text-secondary)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-accent)] hover:text-[var(--accent)]"
          id="settingsBtn"
        >
          <Icon name="settings" size={16} />
        </Button>
      </div>
    </footer>
  );
}

function App() {
  return (
    <ToastProvider>
      <GlobalWebSocketListener />
      <Dock />
      <div id="app">
        <RouterOutlet />
      </div>
      <GlobalFooter />
      <SettingsModal />
    </ToastProvider>
  );
}

function initUIStyle() {
  const opacity = localStorage.getItem("uiOpacity") || "1";
  const blur = localStorage.getItem("uiBlur") || "0";
  const r = document.documentElement;
  r.style.setProperty("--ui-bg", `rgba(22, 22, 24, ${opacity})`);
  r.style.setProperty("--ui-bg-hover", `rgba(26, 26, 29, ${opacity})`);
  r.style.setProperty("--ui-border", `rgba(34, 34, 37, ${opacity})`);
  r.style.setProperty("--ui-blur", `${blur}px`);
}

function init(): void {
  initTheme();
  initDockSettings();
  initGlobalDataStore();
  initUIStyle();
  if (localStorage.getItem("disableAnimations") === "true") {
    document.body.classList.add("no-animations");
  }

  const initialPage = globalThis.location.hash.slice(1) || "overview";
  globalThis.location.hash = initialPage;

  const routes = {
    "overview": () => <OverviewPage />,
    "monitor": () => <MonitorPage />,
    "cpu-details": () => <CpuDetailsPage />,
    "memory-details": () => <MemoryDetailsPage />,
    "app-store": () => <AppStorePage />,
    "about": () => <AboutPage />,
  };

  render(
    <RouterProvider initialPage={initialPage} initialRoutes={routes}>
      <App />
    </RouterProvider>,
    document.body,
  );
}

document.addEventListener("DOMContentLoaded", init);
