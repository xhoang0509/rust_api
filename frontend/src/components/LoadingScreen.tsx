import type { FC } from 'react';

export const LoadingScreen: FC = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
          <span className="absolute text-2xl" aria-hidden="true">
            🦀
          </span>
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">
            Rust Axum + SQLite + React
          </h2>
          <p className="text-sm text-gray-500">Checking authentication session...</p>
        </div>
      </div>
    </div>
  );
};
