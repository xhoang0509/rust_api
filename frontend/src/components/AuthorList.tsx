import type { FC } from 'react';
import type { Author } from '../types';

interface AuthorListProps {
  authors: Author[];
  onEdit: (author: Author) => void;
  onDelete: (id: number) => Promise<void>;
  isLoading?: boolean;
}

export const AuthorList: FC<AuthorListProps> = ({
  authors,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  if (isLoading && authors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-2"></div>
        <p>Loading authors...</p>
      </div>
    );
  }

  if (authors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
          ✍️
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No authors found</h3>
        <p className="text-gray-500 text-sm">Get started by creating your first author above.</p>
      </div>
    );
  }

  const handleDelete = (author: Author) => {
    if (window.confirm(`Are you sure you want to delete "${author.name}"? This will also delete all their posts.`)) {
      onDelete(author.id);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800">
          Authors <span className="text-sm font-normal text-gray-500">({authors.length})</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {authors.map((author) => (
              <tr key={author.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-mono text-xs text-gray-500">{author.id}</td>
                <td className="py-3 px-4 font-medium text-gray-900">{author.name}</td>
                <td className="py-3 px-4 text-gray-600">{author.email}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(author.created_at)}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button
                    onClick={() => onEdit(author)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(author)}
                    className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded cursor-pointer transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
