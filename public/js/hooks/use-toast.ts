import { useContext } from "preact/hooks";
import { createContext } from "preact";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
