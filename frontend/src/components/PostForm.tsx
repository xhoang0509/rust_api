import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { Author, PostWithAuthor, CreatePost, UpdatePost } from '../types';

interface PostFormProps {
  postToEdit?: PostWithAuthor | null;
  authors: Author[];
  onSubmit: (data: CreatePost | UpdatePost) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const PostForm: FC<PostFormProps> = ({
  postToEdit,
  authors,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorId, setAuthorId] = useState<number | ''>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (postToEdit) {
      setTitle(postToEdit.title);
      setContent(postToEdit.content);
      setAuthorId(postToEdit.author_id);
    } else {
      setTitle('');
      setContent('');
      if (authors.length > 0) {
        setAuthorId(authors[0].id);
      } else {
        setAuthorId('');
      }
    }
    setValidationError(null);
  }, [postToEdit, authors]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setValidationError('Post title is required.');
      return;
    }

    if (!trimmedContent) {
      setValidationError('Post content is required.');
      return;
    }

    if (!postToEdit && authorId === '') {
      setValidationError('Please select an author.');
      return;
    }

    try {
      if (postToEdit) {
        await onSubmit({
          title: trimmedTitle,
          content: trimmedContent,
        });
      } else {
        await onSubmit({
          author_id: Number(authorId),
          title: trimmedTitle,
          content: trimmedContent,
        });
        setTitle('');
        setContent('');
      }
    } catch {
      // Error handled by parent or passed via error prop
    }
  };

  const isEditing = !!postToEdit;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {isEditing ? 'Edit Post' : 'Create New Post'}
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

      {authors.length === 0 && !isEditing ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg">
          You need to create at least one author before creating a post. Switch to the <strong>Authors</strong> tab to add one.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div>
              <label htmlFor="post-author" className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <select
                id="post-author"
                value={authorId}
                onChange={(e) => setAuthorId(Number(e.target.value))}
                disabled={isLoading || authors.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900 bg-white"
              >
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name} ({author.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="post-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              placeholder="Post title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="post-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
              placeholder="Write the post content here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900 resize-y"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || (!isEditing && authors.length === 0)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-xs transition duration-150 ease-in-out cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
              {isEditing ? 'Update Post' : 'Create Post'}
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
      )}
    </div>
  );
};
