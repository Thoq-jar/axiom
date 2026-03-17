interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div class="flex justify-between items-center py-3">
      <span class="text-[0.9rem] text-(--text-secondary)">{label}</span>
      <span class="text-[0.9rem] font-semibold text-(--text-primary)">
        {value}
      </span>
    </div>
  );
}
