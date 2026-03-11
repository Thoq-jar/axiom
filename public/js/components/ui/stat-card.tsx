import { useEffect, useState } from "preact/hooks";
import { Icon } from "./icon.tsx";

export const StatCard = ({
  title,
  iconName,
  value,
  details,
  progress,
}: {
  title: string;
  iconName: string;
  value: string;
  details: string;
  progress: number;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [prevValue, setPrevValue] = useState("");

  useEffect(() => {
    if (value !== prevValue && prevValue !== "") {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 300);
    }
    setPrevValue(value);
  }, [value, prevValue]);

  return (
    <div
      class="stat-card rounded-xl p-7 relative opacity-0 translate-y-5 border border-(--ui-border) backdrop-blur-sm will-change-transform"
      style={{
        background: "var(--ui-bg)",
        animation: "fadeSlideIn 0.5s ease forwards",
      }}
    >
      <div class="flex items-center justify-between mb-6">
        <span class="text-[0.7rem] font-medium text-(--text-muted) uppercase tracking-[0.12em]">
          {title}
        </span>
        <div class="w-8 h-8 flex items-center justify-center bg-(--accent-dim) rounded-lg text-(--accent) transition-all duration-300 text-[0.9rem]">
          <Icon name={iconName} />
        </div>
      </div>
      <div
        class={`text-[2.5rem] font-bold text-(--text-primary) mb-1 tracking-tight tabular-nums ${
          isUpdating ? "" : ""
        }`}
        style={isUpdating ? { animation: "valueUpdate 0.3s ease" } : undefined}
      >
        {value}
      </div>
      <div class="text-(--text-secondary) text-xs tracking-wide">
        {details}
      </div>
      <div class="mt-5">
        <div class="progress-fill-container w-full h-1 bg-(--bg-secondary) rounded-sm overflow-hidden relative">
          <div
            class={`progress-fill h-full bg-(--accent) rounded-sm relative transition-[width] duration-400 ${
              progress === 0 ? "w-0!" : ""
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div class="flex justify-between mt-2 text-[0.65rem] text-(--text-muted)">
          <span>0 %</span>
          <span>100 %</span>
        </div>
      </div>
    </div>
  );
};
