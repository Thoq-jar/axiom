import { useEffect, useRef, useState } from "preact/hooks";
import { render } from "preact";
import { RouterOutlet, RouterProvider } from "./router.tsx";
import { Dock } from "./dock.tsx";
import { MonitorPage } from "./monitor.tsx";
import { CpuDetailsPage } from "./pages/cpu-details.tsx";
import { MemoryDetailsPage } from "./pages/memory-details.tsx";
import { initDockSettings, SettingsModal } from "./settings.tsx";
import { initTheme } from "./theme.ts";
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
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-mark">
            <Icon name="box" size={24} />
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
          AxiomOS is an open-source system monitoring server built with modern
          web technologies.
        </p>
        <p class="about-text">
          Monitor your system resources in real-time with WebSocket streaming.
        </p>
        <div class="about-footer">
          <p class="about-version">Version 1.0.1</p>
          <button class="license-btn" onClick={handleViewLicense} disabled={loadingLicense}>
            <Icon name="scroll" size={14} />
            {loadingLicense ? "Loading..." : "View License"}
          </button>
        </div>
      </div>

      {showLicense && (
        <Modal title="License" icon="scroll" onClose={() => setShowLicense(false)} class="license-modal">
          <pre class="license-text">{license}</pre>
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
    <footer class="global-footer">
      <div class="status">
        <div class={`status-dot${connected ? "" : " status-dot-off"}`} />
        <div class="status-text">
          {connected ? <>Updated <span>{lastUpdate}</span></> : "Disconnected"}
        </div>
      </div>
      <div class="footer-right">
        <div class="version">Axiom {version}</div>
        <Button class="settings-btn settings-btn-footer" id="settingsBtn">
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
