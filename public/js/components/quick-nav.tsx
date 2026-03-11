import { useRouter } from "../router.tsx";
import { Icon } from "./ui/icon.tsx";

export const QuickNav = () => {
  const { navigate } = useRouter();

  const navigationCards = [
    {
      targetPage: "monitor",
      icon: "line-chart",
      label: "Monitor",
      description: "Real-time system overview",
    },
    {
      targetPage: "app-store",
      icon: "package",
      label: "Apps",
      description: "Manage Docker containers",
    },
    {
      targetPage: "about",
      icon: "info",
      label: "About",
      description: "Version & license info",
    },
  ];

  return (
    <div
      class="opacity-0"
      style={{ animation: "fadeSlideIn 0.5s ease 0.45s forwards" }}
    >
      <div class="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.12em] text-(--text-muted) mb-3">
        <Icon name="layout-grid" size={14} />
        Quick access
      </div>
      <div class="flex flex-col gap-1.5">
        {navigationCards.map((card) => (
          <div
            key={card.targetPage}
            class="rounded-[10px] py-3 px-4 flex items-center gap-3 cursor-pointer border border-(--ui-border) backdrop-blur-sm  will-change-transform group"
            style={{ background: "var(--ui-bg)" }}
            onClick={() => navigate(card.targetPage)}
          >
            <div class="w-8 h-8 bg-(--accent-dim) rounded-lg flex items-center justify-center text-(--accent) shrink-0">
              <Icon name={card.icon} size={18} />
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-[0.85rem] font-semibold text-(--text-primary)">
                {card.label}
              </span>
              <span class="text-[0.72rem] text-(--text-muted)">
                {card.description}
              </span>
            </div>
            <Icon
              name="chevron-right"
              size={14}
              class="text-(--text-muted)"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
