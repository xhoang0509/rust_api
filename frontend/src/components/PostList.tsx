import type { FC } from 'react';
import type { PostWithAuthor } from '../types';
import { PostCard } from './PostCard';

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

  const displayCount = totalPosts !== undefined ? totalPosts : posts.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-bold text-gray-800">
          Posts <span className="text-sm font-normal text-gray-500">({displayCount})</span>
        </h2>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};
