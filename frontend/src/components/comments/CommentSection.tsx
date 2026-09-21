import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Comment } from '../../types';
import { getComments, createComment, updateComment, deleteComment } from '../../api/comments';
import { CommentInput } from './CommentInput';
import { CommentItem } from './CommentItem';
import { useToast } from '../../context/ToastContext';

interface CommentSectionProps {
  postId: number;
  postAuthorId: number;
  isOpen: boolean;
  onCommentCountChange: (newCount: number) => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  postAuthorId,
  isOpen,
  onCommentCountChange,
}) => {
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Keep a stable ref for onCommentCountChange
  const onCommentCountChangeRef = useRef(onCommentCountChange);
  onCommentCountChangeRef.current = onCommentCountChange;

  const loadComments = useCallback(
    async (targetPage = 1, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await getComments(postId, { page: targetPage, limit: 20 });
        if (append) {
          setComments((prev) => [...prev, ...response.items]);
        } else {
          setComments(response.items);
        }
        setTotalComments(response.total);
        onCommentCountChangeRef.current(response.total);
        setPage(response.page);
        setTotalPages(response.total_pages);
        setHasLoaded(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load comments';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadComments(1, false);
    }
  }, [isOpen, hasLoaded, loadComments]);

  if (!isOpen) return null;

  const handleCreateComment = async (content: string) => {
    try {
      const newComment = await createComment(postId, content);
      setComments((prev) => [...prev, newComment]);
      setTotalComments((prev) => {
        const next = prev + 1;
        onCommentCountChangeRef.current(next);
        return next;
      });
      showToast('Comment posted', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleUpdateComment = async (commentId: number, content: string) => {
    try {
      const updated = await updateComment(commentId, content);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      );
      showToast('Comment updated', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update comment';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotalComments((prev) => {
        const next = Math.max(0, prev - 1);
        onCommentCountChangeRef.current(next);
        return next;
      });
      showToast('Comment deleted', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete comment';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore) {
      loadComments(page + 1, true);
    }
  };

  return (
    <div
      className="pt-3 mt-3 border-t border-gray-100 space-y-4"
      aria-label={`Comments section (${totalComments})`}
    >
      {/* Input box */}
      <CommentInput onSubmit={handleCreateComment} />

      {/* Loading state */}
      {isLoading && (
        <div className="py-4 text-center text-xs text-gray-500">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2 align-middle"></div>
          Loading comments...
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadComments(1, false)}
            className="font-medium underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && comments.length === 0 && (
        <p className="text-center text-xs text-gray-400 py-3 italic">
          No comments yet. Be the first to share your thoughts!
        </p>
      )}

      {/* Comments List */}
      {!isLoading && comments.length > 0 && (
        <div className="space-y-3 pt-1">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postAuthorId={postAuthorId}
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
            />
          ))}

          {/* Load more button */}
          {page < totalPages && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore
                  ? 'Loading...'
                  : `View more comments (${comments.length} of ${totalComments})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
