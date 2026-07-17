import { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

/* Lightweight, dependency-free toast system with a warm kirana look.
   Usage:  const toast = useToast();  toast.success("Sale logged!");
   Reusable across the whole app (dashboard, assistant, login). */

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx) || noopToast;

// Safe fallback so components using useToast outside the provider never crash.
const noopToast = { show: () => {}, success: () => {}, error: () => {}, info: () => {} };

const TONES = {
  success: { icon: CheckCircle2, ring: "ring-leaf/30", bar: "bg-leaf", iconcol: "text-leaf" },
  error: { icon: AlertTriangle, ring: "ring-terracotta/30", bar: "bg-terracotta", iconcol: "text-terracotta" },
  info: { icon: Info, ring: "ring-marigold/40", bar: "bg-marigold", iconcol: "text-marigold" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const seenRef = useRef(new Set());

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (message, { tone = "info", duration = 3500 } = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, tone }]);
      if (duration > 0) setTimeout(() => remove(id), duration);
      return id;
    },
    [remove],
  );

  useEffect(() => {
    const poll = async () => {
      try {
        const token = sessionStorage.getItem("dukaan_token") || localStorage.getItem("dukaan_token");
        if (!token) return;
        if (!window.location.pathname.startsWith("/app")) return;
        const res = await fetch("/api/credit/notifications/recent", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const notifications = data.notifications || [];
        for (const notification of notifications) {
          const dedupeKey = `${notification.id || notification.message || notification.title}`;
          if (seenRef.current.has(dedupeKey)) continue;
          seenRef.current.add(dedupeKey);
          const message = `${notification.title}: ${notification.amount ? `₹${notification.amount}` : ""}`.trim();
          show(message, { tone: "info", duration: 5000 });
        }
      } catch {
        // ignore notification polling errors
      }
    };

    const timer = window.setInterval(poll, 3000);
    return () => window.clearInterval(timer);
  }, [show]);

  const api = {
    show,
    success: (m, o) => show(m, { ...o, tone: "success" }),
    error: (m, o) => show(m, { ...o, tone: "error" }),
    info: (m, o) => show(m, { ...o, tone: "info" }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
          {toasts.map((t) => {
            const tone = TONES[t.tone] || TONES.info;
            const Icon = tone.icon;
            return (
              <div
                key={t.id}
                className={`toast-in pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl bg-white dark:bg-shopfront/95 py-3 pl-5 pr-3 shadow-[var(--shadow-card)] ring-1 ${tone.ring} backdrop-blur`}
                role="status"
              >
                <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
                <Icon className={`h-5 w-5 shrink-0 ${tone.iconcol}`} />
                <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
                <button
                  onClick={() => remove(t.id)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-paper hover:text-ink"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}
