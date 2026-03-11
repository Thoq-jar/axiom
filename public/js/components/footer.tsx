import { useEffect, useState } from "preact/hooks";
import { isConnected } from "../websocket.ts";
import { Button } from "./ui/button.tsx";
import { Icon } from "./ui/icon.tsx";

export const Footer = () => {
  const [version, setVersion] = useState("—");
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("—");

  useEffect(() => {
    fetch("/api/version").then((r) => r.text()).then(setVersion).catch(
      () => {},
    );
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
    <footer class="fixed bottom-0 left-0 right-0 py-2 px-8 bg-[rgba(10,10,11,0.88)] backdrop-blur-md border-t border-(--border-subtle) flex items-center justify-between z-1500 text-[0.72rem]">
      <div class="flex items-center gap-3">
        <div
          class={`status-dot w-2 h-2 rounded-full relative ${
            connected ? "bg-(--success)" : "status-dot-off"
          }`}
        />
        <div class="text-xs text-(--text-secondary)">
          {connected
            ? (
              <>
                Updated <span class="text-(--text-muted)">{lastUpdate}</span>
              </>
            )
            : "Disconnected"}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-[0.65rem] text-(--text-muted) tracking-wide">
          Axiom {version}
        </div>
        <Button
          class="w-7 h-7 p-0 bg-transparent border-transparent flex items-center justify-center cursor-pointer transition-all duration-200 text-(--text-secondary) rounded-lg border hover:bg-(--bg-card-hover) hover:border-(--border-accent) hover:text-(--accent)"
          id="settingsBtn"
        >
          <Icon name="settings" size={16} />
        </Button>
      </div>
    </footer>
  );
};
