import { useEffect, useState } from "react";
import { toastManager } from "../utils/toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    });

    return () => unsubscribe();
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let border = "border-[rgba(196,163,90,0.35)]";
        let iconColor = "text-[#c4a35a]";
        let icon = "ℹ";

        if (toast.type === "success") {
          border = "border-[rgba(129,182,76,0.45)]";
          iconColor = "text-[#81b64c]";
          icon = "✓";
        } else if (toast.type === "error") {
          border = "border-[rgba(229,57,53,0.45)]";
          iconColor = "text-[#e53935]";
          icon = "✕";
        } else if (toast.type === "game") {
          border = "border-[rgba(232,168,56,0.5)]";
          iconColor = "text-[#e8a838]";
          icon = "♞";
        }

        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[rgba(26,14,7,0.95)] border ${border} backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.7)] text-[#f0e6d3] text-xs font-medium animate-[slideDown_0.2s_ease-out_both] cursor-pointer hover:brightness-110 transition-all`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`text-sm font-bold ${iconColor}`}>{icon}</span>
              <span>{toast.message}</span>
            </div>
            <span className="text-[10px] text-[#8a7055] hover:text-[#f0e6d3]">✕</span>
          </div>
        );
      })}
    </div>
  );
}
