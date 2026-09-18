import { useState, useEffect } from 'react';
import type { FC, ChangeEvent } from 'react';
import type { Author } from '../types';

interface SearchBarProps {
  authors: Author[];
  search: string;
  authorId?: number;
  onSearchChange: (search: string) => void;
  onAuthorChange: (authorId?: number) => void;
  onClear: () => void;
}

export const SearchBar: FC<SearchBarProps> = ({
  authors,
  search,
  authorId,
  onSearchChange,
  onAuthorChange,
  onClear,
}) => {
  const [inputValue, setInputValue] = useState(search);

  // Sync internal state if prop changes externally
  useEffect(() => {
    setInputValue(search);
  }, [search]);

  // 300ms debounce for text input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue !== search) {
        onSearchChange(inputValue);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, search, onSearchChange]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleAuthorSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onAuthorChange(value ? Number(value) : undefined);
  };

  const hasActiveFilters = Boolean(inputValue.trim() || authorId !== undefined);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Search posts by title or content..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder-gray-400"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={authorId !== undefined ? authorId.toString() : ''}
            onChange={handleAuthorSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          >
            <option value="">All Authors</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              onClear();
            }}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};
