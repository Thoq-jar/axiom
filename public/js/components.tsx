import { ComponentChildren, createContext, h } from "preact";
import { useContext, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
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
    return h("span", { class: className || "" }, "?");
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
    <div
      class={`rounded-xl mb-4 opacity-0 translate-y-5 border [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform] ${
        isOpen
          ? "border-[var(--accent)]"
          : "border-[var(--ui-border)] hover:border-[var(--border-accent)]"
      }`}
      style={{ background: "var(--ui-bg)", animation: "fadeSlideIn 0.5s ease forwards" }}
      data-dropdown={id}
    >
      <Button
        class="w-full py-5 px-6 bg-transparent border-none flex items-center justify-between cursor-pointer text-[var(--text-primary)] font-[inherit] text-base font-semibold transition-all duration-200 hover:bg-[var(--ui-bg-hover)]"
        onClick={handleToggle}
      >
        <span>{title}</span>
        <Icon
          name="chevron-down"
          class={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>
      <div
        class={`px-6 pb-6 ${isOpen ? "block" : "hidden"}`}
        style={{ animation: isOpen ? "dropdownSlide 0.3s ease" : undefined }}
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
    <div
      class="rounded-xl p-6 mb-4 opacity-0 translate-y-5 border border-[var(--ui-border)] [backdrop-filter:blur(var(--ui-blur))] [-webkit-backdrop-filter:blur(var(--ui-blur))] [will-change:transform]"
      style={{ background: "var(--ui-bg)", animation: "fadeSlideIn 0.5s ease forwards" }}
      onClick={onClick}
    >
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 flex items-center justify-center rounded-[10px] text-xl bg-[var(--accent-dim)] text-[var(--accent)]">
          <Icon name={lucideIconName} />
        </div>
        <div class="flex-1">
          <h3 class="text-[1.1rem] font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
          {subtitle && <p class="text-xs text-[var(--text-muted)] uppercase tracking-widest">{subtitle}</p>}
        </div>
      </div>
      <div class="text-[2rem] font-bold text-[var(--accent)] tabular-nums mb-2">{value}</div>
      {extra && <div class="text-[0.85rem] text-[var(--text-secondary)] leading-relaxed">{extra}</div>}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div class="flex justify-between items-center py-3 border-b border-[var(--border-subtle)] last:border-b-0">
      <span class="text-[0.9rem] text-[var(--text-secondary)]">{label}</span>
      <span class="text-[0.9rem] font-semibold text-[var(--text-primary)]">{value}</span>
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

const toastBorderColors: Record<string, string> = {
  success: "var(--success)",
  error: "var(--danger)",
  warning: "var(--warning)",
  info: "var(--accent)",
};

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
      <div class="fixed bottom-5 right-5 z-[10000] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            class="bg-[var(--bg-card)] border border-[var(--border-subtle)] py-3 px-4 rounded-lg text-[var(--text-primary)] flex items-center justify-between gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.3)] pointer-events-auto min-w-[200px] max-w-[350px]"
            style={{
              animation: "slideIn 0.3s ease-out",
              borderLeftWidth: "4px",
              borderLeftColor: toastBorderColors[toast.type],
            }}
          >
            <span>{toast.message}</span>
            <Button
              class="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer text-[1.2rem] p-0 leading-none hover:text-[var(--text-primary)]"
              onClick={() => removeToast(toast.id)}
            >
              &times;
            </Button>
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

interface ModalProps {
  title: string;
  icon?: string;
  onClose: () => void;
  children: ComponentChildren;
  class?: string;
}

export function Modal({ title, icon, onClose, children, class: className }: ModalProps) {
  return createPortal(
    <div
      class="modal-overlay fixed top-0 left-0 w-screen h-screen grid place-items-center z-[9999]"
      style={{ animation: "fadeIn 0.2s ease" }}
      onClick={onClose}
    >
      <div
        class={`bg-[var(--bg-card)] border border-[var(--border-accent)] rounded-2xl w-[90%] max-w-[400px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ${className || ""}`}
        style={{ animation: "modalSlideIn 0.3s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-3 text-[var(--accent)]">
            {icon && <Icon name={icon} size={18} />}
            <h3 class="text-[1.1rem] font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          <button
            class="bg-transparent border-none text-[var(--text-muted)] cursor-pointer p-1 flex items-center justify-center rounded-md transition-all duration-200 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            onClick={onClose}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface ButtonProps {
  children?: ComponentChildren;
  onClick?: (e: Event) => void;
  type?: "button" | "submit" | "reset";
  class?: string;
  disabled?: boolean;
  id?: string;
  title?: string;
}

export function Button({
  children,
  onClick,
  type = "button",
  class: className = "",
  disabled = false,
  id,
  title,
}: ButtonProps) {
  return (
    <button
      type={type}
      class={className}
      onClick={onClick}
      disabled={disabled}
      id={id}
      title={title}
    >
      {children}
    </button>
  );
}
