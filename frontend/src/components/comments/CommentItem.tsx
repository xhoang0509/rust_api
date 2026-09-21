import React, { useState } from 'react';
import type { Comment } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface CommentItemProps {
  comment: Comment;
  postAuthorId: number;
  onUpdate: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
}

function parseUtcDate(dateString: string): Date {
  const normalizedDateStr = dateString.includes('Z') || dateString.includes('T')
    ? dateString
    : dateString.replace(' ', 'T') + 'Z';
  return new Date(normalizedDateStr);
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = parseUtcDate(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postAuthorId,
  onUpdate,
  onDelete,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCommentAuthor = isAuthenticated && currentUser?.id === comment.author_id;
  const isPostAuthor = isAuthenticated && currentUser?.id === postAuthorId;
  const canEdit = isCommentAuthor;
  const canDelete = isCommentAuthor || isPostAuthor;

  const handleSave = async () => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      setError('Comment cannot be empty');
      return;
    }

    if (trimmed === comment.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(comment.id, trimmed);
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
    setError(null);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } catch {
      setIsDeleting(false);
    }
  };

  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

  return (
    <div className={`flex gap-3 group text-sm ${isDeleting ? 'opacity-50' : ''}`}>
      {/* Avatar */}
      <div className="shrink-0">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shadow-2xs">
          {comment.author_name ? comment.author_name.charAt(0).toUpperCase() : '?'}
        </div>
      </div>

      {/* Main Comment Bubble */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              disabled={isSaving}
              maxLength={5000}
              rows={2}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden resize-none transition-shadow"
              placeholder="Edit your comment..."
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !editContent.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="inline-block max-w-full bg-gray-100 hover:bg-gray-100/90 transition-colors px-3.5 py-2 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-gray-900 leading-tight">
                  {comment.author_name}
                </span>
                {comment.author_id === postAuthorId && (
                  <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium">
                    Author
                  </span>
                )}
              </div>
              <p className="text-gray-800 text-xs sm:text-sm whitespace-pre-wrap break-words mt-0.5 leading-relaxed">
                {comment.content}
              </p>
            </div>

            {/* Comment actions & metadata */}
            <div className="flex items-center gap-3 px-2 mt-1 text-[11px] text-gray-500">
              <span title={parseUtcDate(comment.created_at).toLocaleString()}>
                {formatRelativeTime(comment.created_at)}
              </span>
              {isEdited && <span className="text-gray-400 italic">edited</span>}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="hover:text-blue-600 font-medium cursor-pointer"
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="hover:text-red-600 font-medium cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
