import React, { useState, useEffect } from 'react';
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

export const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onDelete }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const { showToast } = useToast();

  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    (post.user_reaction as ReactionType) || null
  );
  const [reactionsCount, setReactionsCount] = useState<number>(
    post.reactions_count ?? 0
  );
  const [commentsCount, setCommentsCount] = useState<number>(
    post.comments_count ?? 0
  );
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleReact = async (type: ReactionType) => {
    if (!isAuthenticated) {
      showToast('Please log in to react to posts', 'info');
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
      const msg = err instanceof Error ? err.message : 'Failed to set reaction';
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
      const msg = err instanceof Error ? err.message : 'Failed to remove reaction';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 hover:border-gray-300 transition duration-150 ease-in-out flex flex-col justify-between">
      <div>
        {/* Post Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="text-xl font-semibold text-gray-900 break-words flex-1 leading-snug">
            {post.title}
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
            Author: {post.author_name}
          </span>
        </div>

        {/* Metadata */}
        <div className="text-xs text-gray-500 mb-3 flex flex-wrap gap-x-4 gap-y-1">
          <span>By: {post.author_email}</span>
          <span>Created: {formatDate(post.created_at)}</span>
          {post.updated_at && post.updated_at !== post.created_at && (
            <span>Updated: {formatDate(post.updated_at)}</span>
          )}
        </div>

        {/* Post Content */}
        <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed mb-4">
          {post.content}
        </p>
      </div>

      {/* Engagement Summary (reactions badges & counts) */}
      <EngagementSummary
        totalReactions={reactionsCount}
        breakdown={breakdown}
        totalComments={commentsCount}
        onToggleComments={() => setIsCommentsOpen((prev) => !prev)}
        isCommentsOpen={isCommentsOpen}
      />

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <ReactionButton
            userReaction={userReaction}
            onReact={handleReact}
            onRemoveReaction={handleRemoveReaction}
          />
          <button
            type="button"
            onClick={() => setIsCommentsOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isCommentsOpen
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            <span className="text-base leading-none select-none">💬</span>
            <span>Comment</span>
          </button>
        </div>

        {/* Post author controls */}
        {canModify && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(post)}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition-colors"
            >
              Edit Post
            </button>
            <button
              type="button"
              onClick={() => onDelete(post)}
              className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer transition-colors"
            >
              Delete Post
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Comments Section */}
      <CommentSection
        postId={post.id}
        postAuthorId={post.author_id}
        isOpen={isCommentsOpen}
        onCommentCountChange={(newCount) => setCommentsCount(newCount)}
      />
    </div>
  );
};
