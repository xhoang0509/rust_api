import React from 'react';
import { Card, Skeleton, Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { PostWithAuthor } from '../types';
import { PostCard } from './PostCard';

interface PostListProps {
  posts: PostWithAuthor[];
  totalPosts?: number;
  onEdit: (post: PostWithAuthor) => void;
  onDelete: (id: number) => Promise<void>;
  isLoading?: boolean;
  onOpenCreatePost?: () => void;
}

export const PostList: React.FC<PostListProps> = ({
  posts,
  onEdit,
  onDelete,
  isLoading = false,
  onOpenCreatePost,
}) => {
  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <Card key={n} className="rounded-2xl border-0 shadow-xs bg-white p-4">
            <Skeleton avatar active paragraph={{ rows: 3 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="rounded-2xl border-0 shadow-xs bg-white text-center py-12">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-800">
                Không tìm thấy bài viết nào
              </p>
              <p className="text-xs text-gray-500">
                Hãy thử tìm kiếm với từ khóa khác hoặc tạo bài viết mới đầu tiên!
              </p>
            </div>
          }
        >
          {onOpenCreatePost && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onOpenCreatePost}
              className="bg-blue-600 rounded-xl font-medium mt-2"
            >
              Tạo bài viết ngay
            </Button>
          )}
        </Empty>
      </Card>
    );
  }

  const handleDelete = (post: PostWithAuthor) => {
    onDelete(post.id);
  };

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onEdit={onEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};
