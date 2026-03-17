import { Icon } from "./icon.tsx";

interface DetailCardProps {
  title: string;
  icon: string;
  value: string;
  subtitle?: string;
  extra?: string;
  onClick?: () => void;
}

const iconMap: Record<string, string> = {
  "fa-solid fa-play-circle": "play-circle",
  "fa-solid fa-shield-halved": "shield",
  "fa-brands fa-app-store": "package",
  "fa-solid fa-cube": "box",
  "fa-solid fa-microchip": "cpu",
  "fa-solid fa-memory": "memory-stick",
  "fa-solid fa-display": "monitor",
  "fa-solid fa-chart-line": "line-chart",
  "fa-solid fa-info-circle": "info",
  "fa-solid fa-gear": "settings",
  "fa-solid fa-chevron-down": "chevron-down",
  "fa-solid fa-xmark": "x",
  "fa-solid fa-list": "list",
  "fa-solid fa-server": "server",
  "fa-solid fa-chart-pie": "pie-chart",
  "fa-solid fa-check-circle": "check-circle",
  "fa-solid fa-percent": "percent",
};

const getLucideIconName = (faClass: string): string => {
  if (iconMap[faClass]) {
    return iconMap[faClass];
  }

  const match = faClass.match(/fa-(?:solid|brands) fa-(\w+)/);
  if (match) {
    const name = match[1];
    return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  return "box";
};

export const DetailCard = (
  { title, icon, value, subtitle, extra, onClick }: DetailCardProps,
) => {
  const lucideIconName = getLucideIconName(icon);

  return (
    <div
      class="rounded-xl p-6 mb-4 opacity-0 translate-y-5 backdrop-blur-sm will-change-transform"
      style={{
        background: "var(--ui-bg)",
        animation: "fadeSlideIn 0.5s ease forwards",
      }}
      onClick={onClick}
    >
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 flex items-center justify-center rounded-[10px] text-xl bg-(--accent-dim) text-(--accent)">
          <Icon name={lucideIconName} />
        </div>
        <div class="flex-1">
          <h3 class="text-[1.1rem] font-semibold text-(--text-primary) mb-1">
            {title}
          </h3>
          {subtitle && (
            <p class="text-xs text-(--text-muted) uppercase tracking-widest">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div class="text-[2rem] font-bold text-(--accent) tabular-nums mb-2">
        {value}
      </div>
      {extra && (
        <div class="text-[0.85rem] text-(--text-secondary) leading-relaxed">
          {extra}
        </div>
      )}
    </div>
  );
};
