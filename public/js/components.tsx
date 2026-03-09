import { ComponentChildren, createContext, h } from "preact";
import { useContext, useState } from "preact/hooks";
import * as Lucide from "lucide";

interface IconProps {
  name: string;
  size?: number;
  class?: string;
}

function renderLucideNode(node: unknown): unknown {
  if (!node) return null;

  if (typeof node === "string") return node;

  if (Array.isArray(node)) {
    const [tag, attrs, children] = node;

    if (typeof tag !== "string") {
      return renderLucideNode(tag);
    }

    const renderedChildren = Array.isArray(children)
      ? children.map(renderLucideNode)
      : children;

    return h(tag, attrs, renderedChildren);
  }

  return node;
}

export function Icon({ name, size = 16, class: className }: IconProps) {
  const iconName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as keyof typeof Lucide;

  const lucideNode = Lucide[iconName];

  if (!lucideNode) {
    return h("span", { class: className || "icon-missing" }, "?");
  }

  const [tag, attrs, children] = lucideNode as [
    string,
    Record<string, unknown>,
    unknown[],
  ];

  const finalAttrs: Record<string, unknown> = { ...attrs, class: className };
  if (size) {
    finalAttrs.width = size;
    finalAttrs.height = size;
  }

  const renderedChildren = Array.isArray(children)
    ? children.map(renderLucideNode)
    : children;

  return h(tag, finalAttrs, renderedChildren);
}

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
        <Icon
          name="chevron-down"
          class={`dropdown-icon ${isOpen ? "rotated" : ""}`}
        />
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

function getLucideIconName(faClass: string): string {
  if (iconMap[faClass]) {
    return iconMap[faClass];
  }

  const match = faClass.match(/fa-(?:solid|brands) fa-(\w+)/);
  if (match) {
    const name = match[1];
    return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  return "box";
}

export function DetailCard(
  { title, icon, value, subtitle, extra, onClick }: DetailCardProps,
) {
  const lucideIconName = getLucideIconName(icon);

  return (
    <div class="detail-card" onClick={onClick}>
      <div class="detail-header">
        <div class="detail-icon">
          <Icon name={lucideIconName} />
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

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ComponentChildren }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div class="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} class={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button
              type="button"
              class="toast-close"
              onClick={() =>
                removeToast(toast.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
