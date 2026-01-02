import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

interface DropdownProps {
  id: string;
  title: string;
  children: ComponentChildren;
  isOpen?: boolean;
}

export function Dropdown(
  { id, title, children, isOpen: initialOpen = false }: DropdownProps,
) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const handleToggle = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div class={`dropdown${isOpen ? " open" : ""}`} data-dropdown={id}>
      <button
        type="button"
        class="dropdown-header"
        data-dropdown-toggle={id}
        onClick={handleToggle}
      >
        <span>{title}</span>
        <i
          class="fa-solid fa-chevron-down dropdown-icon"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
        </i>
      </button>
      <div
        class={`dropdown-content${isOpen ? "" : " hidden"}`}
        data-dropdown-content={id}
      >
        {children}
      </div>
    </div>
  );
}

interface DetailCardProps {
  title: string;
  icon: string;
  value: string;
  subtitle?: string;
  extra?: string;
}

export function DetailCard(
  { title, icon, value, subtitle, extra }: DetailCardProps,
) {
  return (
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-icon">
          <i class={icon}></i>
        </div>
        <div class="detail-title-group">
          <h3 class="detail-title">{title}</h3>
          {subtitle && <p class="detail-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div class="detail-value">{value}</div>
      {extra && <div class="detail-extra">{extra}</div>}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div class="info-row">
      <span class="info-label">{label}</span>
      <span class="info-value">{value}</span>
    </div>
  );
}
