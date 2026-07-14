import { createContext, useCallback, useContext, useState } from "react";

export interface ToastData {
  testId?: string;
}

interface ToastItem {
  id: number;
  title?: string;
  description?: string;
  type?: string;
  timeout?: number;
  data?: ToastData;
}

interface ToastManager {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, "id">) => void;
  remove: (id: number) => void;
}

const ToastContext = createContext<ToastManager>({ toasts: [], add: () => {}, remove: () => {} });

let nextId = 0;

export function ToastHost({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...toast, id }]);
    const timeout = toast.timeout ?? 5000;
    if (timeout > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeout);
    }
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, add, remove }}>
      {children}
      <div className="hw-toast-viewport">
        {toasts.map((toast) => (
          <div key={toast.id} className={`hw-toast hw-toast--${toast.type ?? "info"}`} data-testid={toast.data?.testId}>
            <div className="hw-toast__body">
              {toast.title && <p className="hw-toast__title">{toast.title}</p>}
              {toast.description && <p className="hw-toast__description">{toast.description}</p>}
            </div>
            <button className="hw-toast__close" onClick={() => remove(toast.id)} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastManager {
  return useContext(ToastContext);
}
