import { useEffect, useRef } from "preact/hooks";
import { render } from "preact";
import { RouterOutlet, RouterProvider } from "./router.tsx";
import { Dock } from "./components/dock.tsx";
import { MonitorPage } from "./monitor.tsx";
import { CpuDetailsPage } from "./pages/cpu-details.tsx";
import { MemoryDetailsPage } from "./pages/memory-details.tsx";
import { initDockSettings, SettingsModal } from "./settings.tsx";
import { initTheme } from "./theme.ts";
import { initGlobalDataStore } from "./store.ts";
import { AppStorePage } from "./pages/app-store.tsx";
import { OverviewPage } from "./pages/overview.tsx";
import { useToast } from "./hooks/use-toast.ts";
import { ToastProvider } from "./components/ui/toast.tsx";
import { Footer } from "./components/footer.tsx";
import { AboutPage } from "./pages/about-page.tsx";
import { TerminalPage } from "./pages/terminal-page.tsx";
import { FileBrowserPage } from "./pages/file-browser-page.tsx";
import { StoragePage } from "./pages/storage-page.tsx";

function App() {
  const WebSocketListener = () => {
    const { addToast } = useToast();
    const addToastRef = useRef(addToast);
    addToastRef.current = addToast;

    useEffect(() => {
      const protocol = globalThis.location.protocol === "https:"
        ? "wss:"
        : "ws:";
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
  };

  return (
    <ToastProvider>
      <WebSocketListener />
      <Dock />
      <div id="app">
        <RouterOutlet />
      </div>
      <Footer />
      <SettingsModal />
    </ToastProvider>
  );
}

function initUIStyle() {
  const opacity_ = parseFloat(localStorage.getItem("uiOpacity") || "1");
  const document_ = document.documentElement;
  document_.style.setProperty("--ui-bg", `rgba(22, 22, 24, ${opacity_})`);
  document_.style.setProperty("--ui-bg-hover", `rgba(26, 26, 29, ${opacity_})`);
  document_.style.setProperty("--ui-border", `rgba(34, 34, 37, ${opacity_})`);
  document_.style.setProperty(
    "--bg-overlay",
    `rgba(255, 255, 255, ${(opacity_ * 0.03).toFixed(3)})`,
  );
  document_.style.setProperty(
    "--bg-overlay-md",
    `rgba(255, 255, 255, ${(opacity_ * 0.04).toFixed(3)})`,
  );
  document_.style.setProperty(
    "--bg-overlay-lg",
    `rgba(255, 255, 255, ${(opacity_ * 0.05).toFixed(3)})`,
  );
  document_.style.setProperty(
    "--ui-border-subtle",
    `rgba(255, 255, 255, ${(opacity_ * 0.06).toFixed(3)})`,
  );
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
    "terminal": () => <TerminalPage />,
    "files": () => <FileBrowserPage />,
    "storage": () => <StoragePage />,
  };

  render(
    <RouterProvider initialPage={initialPage} initialRoutes={routes}>
      <App />
    </RouterProvider>,
    document.body,
  );
}

document.addEventListener("DOMContentLoaded", init);
