export const ToggleRow = ({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: () => void;
}) => {
  return (
    <div class="flex items-center justify-between gap-4">
      <div class="flex-1">
        <div class="text-[0.9rem] text-(--text-primary) mb-0.5 font-medium">
          {label}
        </div>
        <div class="text-xs text-(--text-muted)">{desc}</div>
      </div>
      <button
        type="button"
        class={`w-11 h-6 rounded-xl relative shrink-0 transition-all duration-200 p-0 cursor-pointer border ${
          value
            ? "bg-(--accent) border-(--accent)"
            : "bg-(--bg-secondary) border-(--border-accent)"
        }`}
        onClick={onChange}
      >
        <div
          class={`toggle-thumb absolute top-0.75 left-0.75 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.3)] ${
            value ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
};
