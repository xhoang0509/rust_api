import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    if (!trimmedPassword) {
      setError('Password is required.');
      return;
    }

    if (mode === 'register' && !trimmedName) {
      setError('Name is required.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login({ email: trimmedEmail, password: trimmedPassword });
      } else {
        await register({ name: trimmedName, email: trimmedEmail, password: trimmedPassword });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login'
              ? 'Sign in to create, edit, and manage your posts'
              : 'Join to start publishing and managing your posts'}
          </p>
        </div>

        {/* Mode switcher tabs */}
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
            Login
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-xs transition duration-150 ease-in-out cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-gray-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
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
                className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
