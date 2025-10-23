'use client';

import { createElement, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './Toast';

type ToastVariant = 'default' | 'destructive' | 'success' | 'info' | 'warning';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastRecord {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

const TOAST_PORTAL_ID = 'toast-portal-root';

let toasts: ToastRecord[] = [];
const listeners = new Set<(items: ToastRecord[]) => void>();

function notify() {
  const snapshot = [...toasts];
  listeners.forEach(listener => listener(snapshot));
}

function getPortalElement(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  let element = document.getElementById(TOAST_PORTAL_ID);
  if (!element) {
    element = document.createElement('div');
    element.id = TOAST_PORTAL_ID;
    document.body.appendChild(element);
  }

  return element;
}

function mapVariantToType(variant?: ToastVariant): ToastType {
  switch (variant) {
    case 'destructive':
      return 'error';
    case 'info':
      return 'info';
    case 'warning':
      return 'warning';
    case 'success':
      return 'success';
    default:
      return 'success';
  }
}

function formatMessage(options: ToastOptions): string {
  const parts = [options.title, options.description].filter(Boolean);
  if (parts.length === 0) {
    return 'Notification';
  }
  return parts.join(' — ');
}

function addToast(options: ToastOptions) {
  const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const record: ToastRecord = {
    id,
    message: formatMessage(options),
    type: mapVariantToType(options.variant),
    duration: options.duration ?? 4000
  };
  toasts = [...toasts, record];
  notify();
  return id;
}

function removeToast(id?: string) {
  if (typeof id === 'string') {
    toasts = toasts.filter(toast => toast.id !== id);
  } else {
    toasts = [];
  }
  notify();
}

export function useToast() {
  const [items, setItems] = useState<ToastRecord[]>(() => toasts);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const listener = (next: ToastRecord[]) => setItems(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof document !== 'undefined') {
        const element = document.getElementById(TOAST_PORTAL_ID);
        if (element) {
          element.remove();
        }
      }
    };
  }, []);

  const toast = useCallback((options: ToastOptions) => addToast(options), []);
  const dismiss = useCallback((id?: string) => removeToast(id), []);

  const ToastViewport = useCallback(() => {
    if (!isMounted) {
      return null;
    }
    const portalElement = getPortalElement();
    if (!portalElement) {
      return null;
    }

    return createPortal(
      createElement(
        'div',
        { className: 'fixed top-4 right-4 z-50 w-full max-w-md space-y-3' },
        items.map(item =>
          createElement(Toast, {
            key: item.id,
            message: item.message,
            type: item.type,
            duration: item.duration,
            onClose: () => dismiss(item.id)
          })
        )
      ),
      portalElement
    );
  }, [dismiss, isMounted, items]);

  return {
    toast,
    dismiss,
    ToastViewport
  };
}

export type UseToastReturn = ReturnType<typeof useToast>;
