import { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { Icon } from "./icon.tsx";

interface ModalProps {
  title: string;
  icon?: string;
  onClose: () => void;
  children: ComponentChildren;
  class?: string;
}

export function Modal(
  { title, icon, onClose, children, class: className }: ModalProps,
) {
  return createPortal(
    <div
      class="modal-overlay fixed top-0 left-0 w-screen h-screen grid place-items-center z-9999"
      style={{ animation: "fadeIn 0.2s ease" }}
      onClick={onClose}
    >
      <div
        class={`bg-(--bg-card) rounded-2xl w-[90%] max-w-100 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ${
          className || ""
        }`}
        style={{ animation: "modalSlideIn 0.3s ease" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div class="flex items-center justify-between p-6">
          <div class="flex items-center gap-3 text-(--accent)">
            {icon && <Icon name={icon} size={18} />}
            <h3 class="text-[1.1rem] font-semibold text-(--text-primary)">
              {title}
            </h3>
          </div>
          <button
            type="button"
            class="bg-transparent border-none text-(--text-muted) cursor-pointer p-1 flex items-center justify-center rounded-md transition-all duration-200 hover:bg-(--bg-secondary) hover:text-(--text-primary)"
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
