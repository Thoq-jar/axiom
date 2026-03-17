import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Toast, ToastContext } from "../../hooks/use-toast.ts";
import { Button } from "./button.tsx";

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
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div class="fixed bottom-5 right-5 z-10000 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            class="bg-(--bg-card) py-3 px-4 rounded-lg text-(--text-primary) flex items-center justify-between gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.3)] pointer-events-auto min-w-50 max-w-87.5"
            style={{
              animation: "slideIn 0.3s ease-out",
              borderLeftWidth: "4px",
              borderLeftColor: toastBorderColors[toast.type],
            }}
          >
            <span>{toast.message}</span>
            <Button
              class="bg-transparent border-none text-(--text-secondary) cursor-pointer text-[1.2rem] p-0 leading-none hover:text-(--text-primary)"
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
