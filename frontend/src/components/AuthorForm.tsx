import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { Author, CreateAuthor, UpdateAuthor } from '../types';

interface AuthorFormProps {
  authorToEdit?: Author | null;
  onSubmit: (data: CreateAuthor | UpdateAuthor) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const AuthorForm: FC<AuthorFormProps> = ({
  authorToEdit,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (authorToEdit) {
      setName(authorToEdit.name);
      setEmail(authorToEdit.email);
    } else {
      setName('');
      setEmail('');
    }
    setValidationError(null);
  }, [authorToEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setValidationError('Author name is required.');
      return;
    }

    if (!trimmedEmail) {
      setValidationError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    try {
      await onSubmit({ name: trimmedName, email: trimmedEmail });
      if (!authorToEdit) {
        setName('');
        setEmail('');
      }
    } catch {
      // Error handled by parent or passed via error prop
    }
  };

  const isEditing = !!authorToEdit;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {isEditing ? 'Edit Author' : 'Add New Author'}
        </h2>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium cursor-pointer disabled:opacity-50"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {(validationError || error) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {validationError || error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="author-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="author-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            placeholder="Jane Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="author-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="author-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            placeholder="jane@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-xs transition duration-150 ease-in-out cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            {isEditing ? 'Update Author' : 'Create Author'}
          </button>
          {isEditing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
