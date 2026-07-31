import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

/**
 * Toast notification system.
 * Usage:
 *   const { addToast } = useToast();
 *   addToast('Venta registrada', 'success');
 *   addToast('Error de stock', 'error');
 */

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 8,
      maxWidth: 400,
    }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

const TOAST_STYLES = {
  success: {
    border: '1px solid var(--green)',
    bg: 'linear-gradient(135deg, rgba(62,207,142,0.15) 0%, rgba(26,31,38,0.95) 100%)',
    accent: 'var(--green)',
    icon: '✓',
  },
  error: {
    border: '1px solid var(--red)',
    bg: 'linear-gradient(135deg, rgba(229,89,95,0.15) 0%, rgba(26,31,38,0.95) 100%)',
    accent: 'var(--red)',
    icon: '✕',
  },
  warning: {
    border: '1px solid var(--amber)',
    bg: 'linear-gradient(135deg, rgba(242,169,59,0.15) 0%, rgba(26,31,38,0.95) 100%)',
    accent: 'var(--amber)',
    icon: '⚠',
  },
  info: {
    border: '1px solid var(--cyan)',
    bg: 'linear-gradient(135deg, rgba(69,217,199,0.15) 0%, rgba(26,31,38,0.95) 100%)',
    accent: 'var(--cyan)',
    icon: 'ℹ',
  },
};

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), toast.duration - 300);
    const removeTimer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      onClick={() => onRemove(toast.id)}
      style={{
        background: style.bg,
        border: style.border,
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        animation: exiting ? 'toast-exit 0.3s ease forwards' : 'toast-enter 0.3s ease forwards',
        minWidth: 260,
      }}
    >
      <span style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: `${style.accent}22`,
        border: `1px solid ${style.accent}`,
        display: 'grid',
        placeItems: 'center',
        fontSize: 12,
        fontWeight: 700,
        color: style.accent,
        flexShrink: 0,
      }}>
        {style.icon}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
        {toast.message}
      </span>
    </div>
  );
}

/* Inject keyframes for toast animations */
if (typeof document !== 'undefined') {
  const styleId = 'toast-animations';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      @keyframes toast-enter {
        from { opacity: 0; transform: translateX(60px) scale(0.9); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes toast-exit {
        from { opacity: 1; transform: translateX(0) scale(1); }
        to { opacity: 0; transform: translateX(60px) scale(0.9); }
      }
    `;
    document.head.appendChild(styleEl);
  }
}
