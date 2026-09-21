import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    const trimmedName = name.trim();

    if (mode === 'register' && !trimmedName) {
      showToast('Please enter your full name.', 'error');
      return;
    }

    if (!trimmedEmail) {
      showToast('Please enter your email address.', 'error');
      return;
    }

    if (!trimmedPassword) {
      showToast('Please enter your password.', 'error');
      return;
    }

    if (trimmedPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login({ email: trimmedEmail, password: trimmedPassword });
      } else {
        await register({ name: trimmedName, email: trimmedEmail, password: trimmedPassword });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-200 mb-3">
            <span className="text-3xl" aria-hidden="true">
              🦀
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Rust Axum + SQLite + React
          </h1>
          <p className="text-sm text-gray-500 mt-1">Full-stack CRUD Application</p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {/* Mode Switch Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Register
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {mode === 'login'
                ? 'Sign in to access your dashboard, manage authors, and publish posts.'
                : 'Register a new author account to start writing and managing content.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  disabled={isLoading}
                  autoComplete="name"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl shadow-xs text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                disabled={isLoading}
                autoComplete="email"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl shadow-xs text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl shadow-xs text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition duration-150 ease-in-out cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              )}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Alternate switch prompt */}
          <div className="mt-6 text-center pt-5 border-t border-gray-100">
            {mode === 'login' ? (
              <p className="text-xs text-gray-500">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  Register now
                </button>
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Simple Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Rust Axum SQLite Backend & React TypeScript Tailwind Frontend
        </p>
      </div>
    </div>
  );
};
