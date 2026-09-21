import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spin, Button, Alert } from 'antd';
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
        const msg = err instanceof Error ? err.message : 'Tải bình luận thất bại';
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
      showToast('Đã đăng bình luận', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gửi bình luận thất bại';
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
      showToast('Đã cập nhật bình luận', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cập nhật bình luận thất bại';
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
      showToast('Đã xóa bình luận', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa bình luận thất bại';
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
      className="pt-3 mt-3 border-t border-gray-100 space-y-3.5"
      aria-label={`Khu vực bình luận (${totalComments})`}
    >
      {/* Input box */}
      <CommentInput onSubmit={handleCreateComment} />

      {/* Loading state */}
      {isLoading && (
        <div className="py-6 text-center">
          <Spin size="small" />
          <span className="text-xs text-gray-500 ml-2">Đang tải bình luận...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <Alert
          message={error}
          type="error"
          showIcon
          action={
            <Button size="small" type="link" onClick={() => loadComments(1, false)}>
              Thử lại
            </Button>
          }
          className="rounded-xl text-xs"
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && comments.length === 0 && (
        <p className="text-center text-xs text-gray-400 py-3 italic">
          Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!
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
            <div className="pt-1 text-center">
              <Button
                type="link"
                size="small"
                onClick={handleLoadMore}
                loading={isLoadingMore}
                className="text-xs text-blue-600 font-semibold"
              >
                Xem thêm bình luận ({comments.length} trên {totalComments})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
