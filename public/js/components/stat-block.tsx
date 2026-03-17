import { useRouter } from "../router.tsx";
import { Icon } from "./ui/icon.tsx";

const getBarColor = (percentage: number | null): string => {
  if (percentage == null) return "var(--accent)";
  if (percentage > 80) return "var(--danger)";
  if (percentage > 60) return "var(--warning)";
  return "var(--accent)";
};

export const StatBlock = ({ icon, label, percentage, detail, targetPage }: {
  icon: string;
  label: string;
  percentage: number | null;
  detail?: string | null;
  targetPage: string;
}) => {
  const { navigate } = useRouter();
  const percentageString = percentage != null
    ? `${percentage.toFixed(1)}%`
    : "—";
  const barColor = getBarColor(percentage);
  return (
    <div
      class="rounded-[10px] py-3 px-4 cursor-pointer backdrop-blur-sm will-change-transform"
      style={{ background: "var(--ui-bg)" }}
      onClick={() => navigate(targetPage)}
    >
      <div class="flex items-center gap-2 mb-2">
        <div class="w-6.5 h-6.5 bg-(--accent-dim) rounded-md flex items-center justify-center text-(--accent) shrink-0">
          <Icon name={icon} size={16} />
        </div>
        <span class="text-[0.8rem] text-(--text-secondary) flex-1">
          {label}
        </span>
        <span
          class="text-[0.9rem] font-bold tabular-nums"
          style={{ color: barColor }}
        >
          {percentageString}
        </span>
      </div>
      {detail && (
        <div class="text-[0.72rem] text-(--text-muted) mb-1.5 pl-8">
          {detail}
        </div>
      )}
      <div class="h-0.75 bg-(--bg-secondary) rounded-sm overflow-hidden">
        <div
          class="h-full rounded-sm min-w-0.5 transition-[width] duration-400"
          style={{ width: `${percentage ?? 0}%`, background: barColor }}
        />
      </div>
    </div>
  );
};
