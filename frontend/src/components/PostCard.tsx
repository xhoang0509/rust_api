import React, { useState, useEffect } from 'react';
import { Card, Avatar, Dropdown, Popconfirm, Button, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  MessageOutlined,
  LockOutlined,
  CheckCircleFilled,
  CopyOutlined,
} from '@ant-design/icons';
import type { PostWithAuthor, ReactionType, ReactionBreakdown } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { setPostReaction, deletePostReaction, getPostReactions } from '../api/reactions';
import { ReactionButton } from './reactions/ReactionButton';
import { EngagementSummary } from './reactions/EngagementSummary';
import { CommentSection } from './comments/CommentSection';

interface PostCardProps {
  post: PostWithAuthor;
  onEdit: (post: PostWithAuthor) => void;
  onDelete: (post: PostWithAuthor) => void;
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
    const diffInHours = Math.floor(diffInSeconds / 60);
    if (diffInHours < 24) return `${diffInHours} giờ`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày`;

    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onDelete }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const { showToast } = useToast();

  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    (post.user_reaction as ReactionType) || null,
  );
  const [reactionsCount, setReactionsCount] = useState<number>(post.reactions_count ?? 0);
  const [commentsCount, setCommentsCount] = useState<number>(post.comments_count ?? 0);
  const [breakdown, setBreakdown] = useState<ReactionBreakdown | undefined>(undefined);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setUserReaction((post.user_reaction as ReactionType) || null);
    setReactionsCount(post.reactions_count ?? 0);
    setCommentsCount(post.comments_count ?? 0);
  }, [post.id, post.reactions_count, post.user_reaction, post.comments_count]);

  // Load reaction breakdown for post if it has reactions
  useEffect(() => {
    if (post.reactions_count && post.reactions_count > 0) {
      getPostReactions(post.id)
        .then((res) => {
          setBreakdown(res.breakdown);
          setReactionsCount(res.total);
          if (res.user_reaction) {
            setUserReaction(res.user_reaction as ReactionType);
          }
        })
        .catch(() => {
          // Ignore background fetch error
        });
    }
  }, [post.id, post.reactions_count]);

  const canModify = isAuthenticated && currentUser && post.author_id === currentUser.id;

  const handleReact = async (type: ReactionType) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thả cảm xúc', 'info');
      return;
    }

    const prevReaction = userReaction;
    const prevCount = reactionsCount;
    const prevBreakdown = breakdown;

    // Optimistic update
    setUserReaction(type);
    if (!prevReaction) {
      setReactionsCount((c) => c + 1);
    }

    try {
      const summary = await setPostReaction(post.id, type);
      setUserReaction((summary.user_reaction as ReactionType) || null);
      setReactionsCount(summary.total);
      setBreakdown(summary.breakdown);
    } catch (err: unknown) {
      setUserReaction(prevReaction);
      setReactionsCount(prevCount);
      setBreakdown(prevBreakdown);
      const msg = err instanceof Error ? err.message : 'Thả cảm xúc thất bại';
      showToast(msg, 'error');
    }
  };

  const handleRemoveReaction = async () => {
    if (!isAuthenticated) return;

    const prevReaction = userReaction;
    const prevCount = reactionsCount;
    const prevBreakdown = breakdown;

    // Optimistic update
    setUserReaction(null);
    setReactionsCount((c) => Math.max(0, c - 1));

    try {
      const summary = await deletePostReaction(post.id);
      setUserReaction((summary.user_reaction as ReactionType) || null);
      setReactionsCount(summary.total);
      setBreakdown(summary.breakdown);
    } catch (err: unknown) {
      setUserReaction(prevReaction);
      setReactionsCount(prevCount);
      setBreakdown(prevBreakdown);
      const msg = err instanceof Error ? err.message : 'Gỡ cảm xúc thất bại';
      showToast(msg, 'error');
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Đã sao chép liên kết bài viết!', 'success');
    } else {
      showToast('Không thể sao chép liên kết trên trình duyệt này', 'info');
    }
  };

  const dropdownMenuItems: MenuProps['items'] = [
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Sao chép liên kết bài viết',
      onClick: handleCopyLink,
    },
    ...(canModify
      ? [
          { type: 'divider' as const },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Chỉnh sửa bài viết',
            onClick: () => onEdit(post),
          },
          {
            key: 'delete',
            danger: true,
            icon: <DeleteOutlined />,
            label: (
              <Popconfirm
                title="Xóa bài viết"
                description="Bạn có chắc chắn muốn xóa bài viết này không?"
                onConfirm={() => onDelete(post)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <span>Xóa bài viết</span>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      className="rounded-2xl border-0 shadow-xs bg-white mb-4 hover:shadow-sm transition-all"
      bodyStyle={{ padding: '16px 20px' }}
    >
      {/* Post Header: Author info & options */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            size={42}
            className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shrink-0 shadow-2xs"
          >
            {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'U'}
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-gray-900 text-sm hover:underline cursor-pointer leading-tight">
                {post.author_name}
              </span>
              <Tooltip title="Thành viên đã xác thực">
                <CheckCircleFilled className="text-blue-500 text-xs" />
              </Tooltip>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
              <Tooltip title={parseUtcDate(post.created_at).toLocaleString('vi-VN')}>
                <span className="cursor-pointer hover:underline">
                  {formatRelativeTime(post.created_at)}
                </span>
              </Tooltip>
              <span>•</span>
              <Tooltip title="Chỉ thành viên nội bộ mới xem được">
                <span className="flex items-center gap-0.5 text-gray-400">
                  <LockOutlined className="text-[11px]" /> Riêng tư
                </span>
              </Tooltip>
              {post.updated_at && post.updated_at !== post.created_at && (
                <>
                  <span>•</span>
                  <span className="italic">đã sửa</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* More Options Dropdown */}
        <Dropdown menu={{ items: dropdownMenuItems }} trigger={['click']} placement="bottomRight">
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<EllipsisOutlined className="text-lg text-gray-500" />}
            className="hover:bg-gray-100"
          />
        </Dropdown>
      </div>

      {/* Post Title */}
      <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug break-words">
        {post.title}
      </h3>

      {/* Post Content */}
      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words mb-3 font-normal">
        {post.content}
      </p>

      {/* Engagement Summary (reactions badges & counts) */}
      <EngagementSummary
        totalReactions={reactionsCount}
        breakdown={breakdown}
        totalComments={commentsCount}
        onToggleComments={() => setIsCommentsOpen((prev) => !prev)}
        isCommentsOpen={isCommentsOpen}
      />

      {/* Action Bar (Like, Comment, Share) */}
      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-100">
        {/* Like / Reaction trigger */}
        <div className="flex justify-center">
          <ReactionButton
            userReaction={userReaction}
            onReact={handleReact}
            onRemoveReaction={handleRemoveReaction}
          />
        </div>

        {/* Comment toggle button */}
        <button
          type="button"
          onClick={() => setIsCommentsOpen((prev) => !prev)}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
            isCommentsOpen
              ? 'text-blue-600 bg-blue-50/70 font-semibold'
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
          }`}
        >
          <MessageOutlined className="text-base" />
          <span>Bình luận</span>
        </button>

        {/* Share button */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ShareAltOutlined className="text-base" />
          <span>Chia sẻ</span>
        </button>
      </div>

      {/* Collapsible Comments Section */}
      <CommentSection
        postId={post.id}
        postAuthorId={post.author_id}
        isOpen={isCommentsOpen}
        onCommentCountChange={(newCount) => setCommentsCount(newCount)}
      />
    </Card>
  );
};
