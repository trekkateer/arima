import { useEffect, useState } from 'react';
import './Toast.css';

// Module-level store so `toast()` can be called from anywhere (event handlers,
// game logic, etc.) without needing React context plumbing at each call site.
let idCounter = 0;
let toasts = [];
const listeners = new Set();

const TYPE_COLORS = { info: '#4A90E2', success: '#4CAF50', warning: '#FFC107', error: '#F44336' };

function notify() {
  listeners.forEach(fn => fn(toasts));
}

// Queues a toast; returns its id so callers can dismiss it early if needed.
// type: 'info' | 'success' | 'warning' | 'error'
export function toast(message, { type = 'info', duration = 3000 } = {}) {
  const id = ++idCounter;
  toasts = [...toasts, { id, message, type, duration }];
  notify();
  
  // Auto-dismiss after duration (if > 0)
  if (duration > 0) setTimeout(() => dismissToast(id), duration);
  return id;
}

export function dismissToast(id) {
  toasts = toasts.filter(t => t.id !== id);
  notify();
}

// Renders queued toasts in the bottom-right corner. Mount once near the app root.
export default function Toast() {
  const [items, setItems] = useState(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => listeners.delete(setItems);
  }, []);

  return (
    <div className="toast-container">
      {items.map(t => (
        <div key={t.id} className="toast"
          style={{ color: TYPE_COLORS[t.type] }}
        >
          {t.message}
          <div className="toast-close" onClick={() => dismissToast(t.id)}>×</div>
          {t.duration > 0 && (
            <div className="toast-timer"
              style={{ background: TYPE_COLORS[t.type], animationDuration: `${t.duration}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
