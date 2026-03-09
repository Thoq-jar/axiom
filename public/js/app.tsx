import { useEffect } from "preact/hooks";
import { render } from "preact";
import { RouterOutlet, RouterProvider } from "./router.tsx";
import { Dock } from "./dock.tsx";
import { MonitorPage } from "./monitor.tsx";
import { CpuDetailsPage } from "./pages/cpu-details.tsx";
import { MemoryDetailsPage } from "./pages/memory-details.tsx";
import { SettingsModal } from "./settings.tsx";
import { initTheme } from "./theme.ts";
import { AppStorePage } from "./pages/app-store.tsx";
import { Icon, ToastProvider, useToast } from "./components.tsx";

function AboutPage() {
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
        </div>
      </div>
    </div>
  );
}

function GlobalWebSocketListener() {
  const { addToast } = useToast();

  useEffect(() => {
    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${globalThis.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "installation_finished") {
          addToast("Installed finished!", "success");
        }
      } catch (error) {
        console.error("WS error", error);
      }
    };

    return () => ws.close();
  }, [addToast]);

  return null;
}

function App() {
  return (
    <ToastProvider>
      <GlobalWebSocketListener />
      <Dock />
      <div id="app">
        <RouterOutlet />
      </div>
      <SettingsModal />
    </ToastProvider>
  );
}

function init(): void {
  initTheme();

  const initialPage = globalThis.location.hash.slice(1) || "monitor";
  globalThis.location.hash = initialPage;

  const routes = {
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
