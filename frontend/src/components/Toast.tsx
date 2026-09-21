import React from 'react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastCardProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

export const ToastCard: React.FC<ToastCardProps> = ({ toast, onClose }) => {
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-200 ease-out ${
        toast.type === 'error'
          ? 'bg-white border-red-200 text-red-900 shadow-red-500/10'
          : toast.type === 'success'
            ? 'bg-white border-emerald-200 text-emerald-900 shadow-emerald-500/10'
            : 'bg-white border-blue-200 text-blue-900 shadow-blue-500/10'
      }`}
    >
      {/* Icon */}
      {toast.type === 'error' && (
        <svg
          className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}

      {toast.type === 'success' && (
        <svg
          className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
        </svg>
      )}

      {toast.type === 'info' && (
        <svg
          className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )}

      {/* Message */}
      <div className="flex-1 text-sm font-medium leading-snug break-words">{toast.message}</div>

      {/* Close button */}
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="shrink-0 -mr-1 -mt-1 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
        aria-label="Close"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const Toast = ToastCard;

interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};
