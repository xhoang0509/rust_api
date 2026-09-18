import type { FC } from 'react';
import type { PostWithAuthor } from '../types';
import { useAuth } from '../context/AuthContext';

interface PostListProps {
  posts: PostWithAuthor[];
  totalPosts?: number;
  onEdit: (post: PostWithAuthor) => void;
  onDelete: (id: number) => Promise<void>;
  isLoading?: boolean;
}

export const PostList: FC<PostListProps> = ({
  posts,
  totalPosts,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (isLoading && posts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-2"></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
          📝
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No posts found</h3>
        <p className="text-gray-500 text-sm">No posts match your search or filters.</p>
      </div>
    );
  }

  const handleDelete = (post: PostWithAuthor) => {
    if (window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
      onDelete(post.id);
    }
  };

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

  const displayCount = totalPosts !== undefined ? totalPosts : posts.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-bold text-gray-800">
          Posts <span className="text-sm font-normal text-gray-500">({displayCount})</span>
        </h2>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => {
          const canModify = isAuthenticated && currentUser && post.author_id === currentUser.id;

          return (
            <div
              key={post.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-gray-300 transition duration-150 ease-in-out flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 break-words flex-1">
                    {post.title}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                    Author: {post.author_name}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mb-4 flex flex-wrap gap-x-4 gap-y-1">
                  <span>By: {post.author_email}</span>
                  <span>Created: {formatDate(post.created_at)}</span>
                  {post.updated_at && post.updated_at !== post.created_at && (
                    <span>Updated: {formatDate(post.updated_at)}</span>
                  )}
                </div>

                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed mb-6">
                  {post.content}
                </p>
              </div>

              {canModify && (
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => onEdit(post)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Edit Post
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
