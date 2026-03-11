export const SliderRow = ({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) => {
  return (
    <div class="flex flex-col gap-2">
      <div class="flex justify-between items-center">
        <span class="text-[0.9rem] text-(--text-primary) font-medium">
          {label}
        </span>
        <span class="text-[0.8rem] text-(--accent) font-semibold">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        class="refresh-slider"
        onInput={(event) =>
          onChange(parseFloat((event.target as HTMLInputElement).value))}
      />
    </div>
  );
};
