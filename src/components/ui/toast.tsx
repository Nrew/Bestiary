/**
 * Toast notification system backed by @radix-ui/react-toast.
 *
 * Accessibility:
 * - A single `ToastPrimitive.Provider` manages an accessible viewport.
 * - Error toasts are `type="foreground"` (announced immediately / role=alertdialog),
 *   informational toasts are `type="background"` (announced politely / role=status).
 * - Viewport is focusable via F8 by default (Radix) and supports pause-on-hover and
 *   swipe-to-dismiss. Each toast has an explicit Close button with an aria-label.
 *
 * External API preserved: components continue to use
 *   const toast = useToast();
 *   toast.success(message, title?);
 *   toast.error(message, title?);
 *   toast.warning(message, title?);
 *   toast.info(message, title?);
 *
 * Plus the module-level `toast` helper and `setGlobalToastHandler`.
 */

import * as ToastPrimitive from '@radix-ui/react-toast';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEMANTIC_COLORS, type SemanticColorType } from '@/lib/theme';
import { getLogger } from '@/lib/logger';

const log = getLogger('Toast');


export type ToastType = SemanticColorType;

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}


const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}


function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 10);
}


const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const success = useCallback(
    (message: string, title?: string) => addToast({ type: 'success', message, title }),
    [addToast]
  );
  const error = useCallback(
    (message: string, title?: string) => addToast({ type: 'error', message, title }),
    [addToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: 'warning', message, title }),
    [addToast]
  );
  const info = useCallback(
    (message: string, title?: string) => addToast({ type: 'info', message, title }),
    [addToast]
  );

  const contextValue: ToastContextValue = React.useMemo(
    () => ({ toasts, addToast, removeToast, success, error, warning, info }),
    [toasts, addToast, removeToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
        <ToastPrimitive.Viewport
          className={cn(
            'fixed bottom-0 right-0 z-100 flex flex-col gap-2 p-4',
            'w-97.5 max-w-screen outline-none',
            'focus:outline-2 focus:outline-ring focus:outline-offset-2'
          )}
          label="Notifications ({hotkey})"
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};


interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const Icon = ICONS[toast.type];
  const colorClasses = SEMANTIC_COLORS[toast.type];
  // Preserve previous defaults: duration=0 means persistent, otherwise 5s default.
  const resolvedDuration =
    toast.duration === 0 ? Infinity : toast.duration ?? 5000;

  return (
    <ToastPrimitive.Root
      // Error toasts get `foreground` so assistive tech announces immediately
      // (role=alertdialog / aria-live=assertive); others are `background` (polite).
      type={toast.type === 'error' ? 'foreground' : 'background'}
      duration={resolvedDuration === Infinity ? undefined : resolvedDuration}
      onOpenChange={(open) => {
        if (!open) onRemove(toast.id);
      }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-80',
        'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
        'data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full',
        'motion-reduce:animate-none motion-reduce:transition-none',
        colorClasses.full
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', colorClasses.text)} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        {toast.title && (
          <ToastPrimitive.Title className="font-semibold mb-1">
            {toast.title}
          </ToastPrimitive.Title>
        )}
        <ToastPrimitive.Description className="text-sm">
          {toast.message}
        </ToastPrimitive.Description>

        {toast.action && (
          <ToastPrimitive.Action
            asChild
            altText={toast.action.label}
          >
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onRemove(toast.id);
              }}
              className="text-sm font-medium underline mt-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {toast.action.label}
            </button>
          </ToastPrimitive.Action>
        )}
      </div>

      <ToastPrimitive.Close
        aria-label="Dismiss notification"
        className="shrink-0 hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded motion-reduce:transition-none"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
};


export const ToastViewport = ToastPrimitive.Viewport;
export const ToastRoot = ToastPrimitive.Root;
export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastAction = ToastPrimitive.Action;
export const ToastClose = ToastPrimitive.Close;


let globalToastHandler: ToastContextValue | null = null;

export function setGlobalToastHandler(handler: ToastContextValue) {
  globalToastHandler = handler;
}

export const toast = {
  success: (message: string, title?: string) => {
    if (globalToastHandler) {
      return globalToastHandler.success(message, title);
    }
    log.warn('Toast handler not initialized');
    return '';
  },
  error: (message: string, title?: string) => {
    if (globalToastHandler) {
      return globalToastHandler.error(message, title);
    }
    log.error(message);
    return '';
  },
  warning: (message: string, title?: string) => {
    if (globalToastHandler) {
      return globalToastHandler.warning(message, title);
    }
    log.warn(message);
    return '';
  },
  info: (message: string, title?: string) => {
    if (globalToastHandler) {
      return globalToastHandler.info(message, title);
    }
    log.info(message);
    return '';
  },
  custom: (toastData: Omit<Toast, 'id'>) => {
    if (globalToastHandler) {
      return globalToastHandler.addToast(toastData);
    }
    log.info(toastData.message);
    return '';
  },
};
