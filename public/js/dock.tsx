import { useRouter } from "./router.tsx";
import { Icon } from "./components.tsx";

interface DockItemProps {
  page: string;
  iconName: string;
  label: string;
}

function DockItem({ page, iconName, label }: DockItemProps) {
  const { currentPage, navigate } = useRouter();
  const isActive = currentPage === page;

  return (
    <div
      class={`dock-item py-2 px-4 rounded-lg cursor-pointer transition-all duration-300 text-[0.85rem] flex items-center gap-2 border relative overflow-hidden ${
        isActive
          ? "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)] scale-110 shadow-[0_0_20px_var(--accent-dim),0_4px_12px_var(--accent-shadow)]"
          : "text-[var(--text-secondary)] border-transparent hover:bg-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_4px_12px_var(--accent-shadow)]"
      }`}
      style={isActive ? { animation: "dockItemPulse 2s ease-in-out infinite" } : undefined}
      data-page={page}
      onClick={() => navigate(page)}
    >
      <Icon name={iconName} size={16} class={`relative z-[1] transition-transform duration-300 ${isActive ? "" : ""}`} />
      <span class="dock-label relative z-[1]">{label}</span>
    </div>
  );
}

export function Dock() {
  return (
    <div
      class="dock fixed top-5 left-1/2 -translate-x-1/2 border border-[var(--ui-border)] rounded-2xl py-3 px-6 flex items-center gap-4 z-[10001] shadow-[0_8px_32px_rgba(0,0,0,0.4)] [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform]"
      style={{ background: "var(--ui-bg)" }}
      id="dock"
    >
      <DockItem page="overview" iconName="home" label="Home" />
      <DockItem page="monitor" iconName="line-chart" label="Monitor" />
      <DockItem page="cpu-details" iconName="cpu" label="CPU" />
      <DockItem page="memory-details" iconName="memory-stick" label="Memory" />
      <DockItem page="app-store" iconName="package" label="Apps" />
      <DockItem page="about" iconName="info" label="About" />
    </div>
  );
}
