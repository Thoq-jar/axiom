import { useEffect, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";
import { Icon } from "./icon.tsx";

export interface ContextMenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const adjustedX = Math.min(x, globalThis.innerWidth - 200);
  const adjustedY = Math.min(
    y,
    globalThis.innerHeight - items.length * 36 - 24,
  );

  return createPortal(
    <div
      ref={menuRef}
      class="fixed z-99999 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{
        left: adjustedX,
        top: adjustedY,
        background: "rgba(22,22,24,0.96)",
        backdropFilter: "blur(16px)",
        minWidth: "180px",
        animation: "fadeIn 0.12s ease",
      }}
    >
      <div class="p-1.5 flex flex-col gap-0.5">
        {items.map((item, index) => {
          if ("separator" in item) {
            return (
              <div
                key={index}
                class="h-px my-1"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            );
          }
          return (
            <button
              key={index}
              type="button"
              class={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.83rem] border-none cursor-pointer transition-all text-left w-full ${
                item.disabled
                  ? "opacity-40 cursor-not-allowed bg-transparent text-(--text-muted)"
                  : item.danger
                  ? "bg-transparent text-danger hover:bg-[rgba(239,68,68,0.12)]"
                  : "bg-transparent text-(--text-secondary) hover:text-(--text-primary) hover:bg-[rgba(255,255,255,0.06)]"
              }`}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onClose();
                }
              }}
            >
              <Icon name={item.icon} size={14} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
