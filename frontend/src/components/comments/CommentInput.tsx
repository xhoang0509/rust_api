import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  placeholder = 'Write a comment...',
  autoFocus = false,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
        Please log in to leave a comment.
      </div>
    );
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setContent('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-1">
      <form onSubmit={handleSubmit} className="flex gap-2.5 items-start">
        {/* User avatar */}
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shadow-2xs">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>

        {/* Input area */}
        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder={placeholder}
            autoFocus={autoFocus}
            maxLength={5000}
            rows={1}
            className="w-full text-xs sm:text-sm px-3.5 py-2 pr-16 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-2xl outline-hidden resize-none transition-all"
            style={{ minHeight: '38px', maxHeight: '120px' }}
          />
          <div className="absolute right-1.5 bottom-1.5 flex items-center">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '...' : 'Post'}
            </button>
          </div>
        </div>
      </form>
      {error && <p className="text-xs text-red-500 pl-11">{error}</p>}
    </div>
  );
};
