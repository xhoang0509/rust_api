import React, { useState } from 'react';
import { Avatar, Tag, Popconfirm, Button, Input, Tooltip } from 'antd';
import type { Comment } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface CommentItemProps {
  comment: Comment;
  postAuthorId: number;
  onUpdate: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
}

function parseUtcDate(dateString: string): Date {
  const normalizedDateStr =
    dateString.includes('Z') || dateString.includes('T')
      ? dateString
      : dateString.replace(' ', 'T') + 'Z';
  return new Date(normalizedDateStr);
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = parseUtcDate(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'vừa xong';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày`;

    return date.toLocaleDateString('vi-VN', {
      month: 'numeric',
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
      setError('Bình luận không được để trống');
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
      setError(err instanceof Error ? err.message : 'Cập nhật bình luận thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
    setError(null);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } catch {
      setIsDeleting(false);
    }
  };

  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

  return (
    <div className={`flex gap-2.5 group text-sm ${isDeleting ? 'opacity-50' : ''}`}>
      {/* Avatar */}
      <Avatar size={32} className="bg-gray-200 text-gray-700 font-bold shrink-0 mt-0.5">
        {comment.author_name ? comment.author_name.charAt(0).toUpperCase() : '?'}
      </Avatar>

      {/* Main Comment Bubble */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <Input.TextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              disabled={isSaving}
              maxLength={5000}
              autoSize={{ minRows: 2, maxRows: 6 }}
              className="rounded-xl text-xs sm:text-sm p-2.5 bg-white border border-gray-300 focus:border-blue-500"
              placeholder="Chỉnh sửa bình luận..."
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button
                size="small"
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-lg text-xs"
              >
                Hủy
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={handleSave}
                loading={isSaving}
                disabled={isSaving || !editContent.trim()}
                className="bg-blue-600 rounded-lg text-xs"
              >
                Lưu
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="inline-block max-w-full bg-gray-100 px-3.5 py-2 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-gray-900 leading-tight">
                  {comment.author_name}
                </span>
                {comment.author_id === postAuthorId && (
                  <Tag
                    color="blue"
                    className="text-[10px] m-0 px-1 py-0 border-0 rounded font-medium"
                  >
                    Tác giả bài viết
                  </Tag>
                )}
              </div>
              <p className="text-gray-800 text-xs sm:text-sm whitespace-pre-wrap break-words mt-1 leading-relaxed">
                {comment.content}
              </p>
            </div>

            {/* Comment actions & metadata */}
            <div className="flex items-center gap-3 px-2 mt-1 text-[11px] text-gray-500">
              <Tooltip title={parseUtcDate(comment.created_at).toLocaleString('vi-VN')}>
                <span className="cursor-pointer hover:underline">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </Tooltip>
              {isEdited && <span className="text-gray-400 italic">đã chỉnh sửa</span>}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="hover:text-blue-600 font-semibold cursor-pointer"
                >
                  Chỉnh sửa
                </button>
              )}
              {canDelete && (
                <Popconfirm
                  title="Xóa bình luận"
                  description="Bạn có chắc chắn muốn xóa bình luận này?"
                  onConfirm={handleDeleteConfirm}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, size: 'small' }}
                  cancelButtonProps={{ size: 'small' }}
                >
                  <button
                    type="button"
                    disabled={isDeleting}
                    className="hover:text-red-600 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </Popconfirm>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
