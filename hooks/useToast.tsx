import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Toast {
  id: string;
  type: 'mission' | 'augmentation' | 'achievement' | 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  icon?: ReactNode;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration (default 5 seconds)
    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast } = context;

  // Convenience methods for different toast types
  const toast = {
    mission: (title: string, message: string, options?: Partial<Toast>) =>
      addToast({ type: 'mission', title, message, ...options }),
    
    augmentation: (title: string, message: string, options?: Partial<Toast>) =>
      addToast({ type: 'augmentation', title, message, ...options }),
    
    achievement: (title: string, message: string, options?: Partial<Toast>) =>
      addToast({ type: 'achievement', title, message, ...options }),
    
    success: (title: string, message: string, options?: Partial<Toast>) =>
      addToast({ type: 'success', title, message, ...options }),
    
    error: (title: string, message: string, options?: Partial<Toast>) =>
      addToast({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message: string, options?: Partial<Toast>) =>
      addToast({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message: string, options?: Partial<Toast>) =>
      addToast({ type: 'info', title, message, ...options }),
    
    custom: (toast: Omit<Toast, 'id'>) => addToast(toast)
  };

  return toast;
}

export { ToastContext }; 