'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  id?: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast = ({ id, message, type = 'info', onClose }: ToastProps) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: AlertCircle,
  };

  const bgColors = {
    success: 'bg-green-500/20 border-green-500/50',
    error: 'bg-red-500/20 border-red-500/50',
    info: 'bg-blue-500/20 border-blue-500/50',
  };

  const textColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg shadow-black/20 min-w-[300px] max-w-md animate-in slide-in-from-top-2 fade-in duration-200',
        bgColors[type]
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', textColors[type])} />
      <span className="text-sm text-gray-200 flex-1">{message}</span>
      <button
        onClick={onClose}
        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Toast Container 和 Hook
type ToastType = Omit<ToastProps, 'onClose'>;

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const addToast = React.useCallback(({ message, type = 'info' }: Omit<ToastType, 'id'>) => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, message, type, onClose: () => {} }]);
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useMemo(
    () => ({
      success: (message: string) => addToast({ message, type: 'success' }),
      error: (message: string) => addToast({ message, type: 'error' }),
      info: (message: string) => addToast({ message, type: 'info' }),
    }),
    [addToast]
  );

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id!} {...t} onClose={() => removeToast(t.id!)} />
      ))}
    </div>
  );

  return { toast, ToastContainer };
}

export default Toast;
