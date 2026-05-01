import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

const TYPE_ICON = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
const TYPE_ACCENT = {
  success: '#4caf8c',
  error:   '#ff5a5a',
  warning: '#e8a050',
  info:    '#5a4fcf',
};

function Toast({ id, message, type, action, onRemove }) {
  const accent = TYPE_ACCENT[type] || TYPE_ACCENT.success;

  useEffect(() => {
    const t = setTimeout(() => onRemove(id), 4000);
    return () => clearTimeout(t);
  }, [id, onRemove]);

  return (
    <div className="toast" style={{ '--toast-accent': accent }}>
      <div className="toast-accent-bar" />
      <div className="toast-body">
        <span className="toast-icon">{TYPE_ICON[type] || '✓'}</span>
        <span className="toast-message">{message}</span>
      </div>
      {action && (
        <button
          className="toast-action"
          onClick={() => { action.onClick(); onRemove(id); }}
        >{action.label}</button>
      )}
      <button className="toast-close" onClick={() => onRemove(id)}>×</button>
      <div className="toast-progress" />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = 'success', action = null) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type, action }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
