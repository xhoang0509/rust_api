import React, { useState } from 'react';
import { Avatar, Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  placeholder = 'Viết bình luận...',
  autoFocus = false,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
        Vui lòng đăng nhập để tham gia bình luận.
      </div>
    );
  }

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setContent('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gửi bình luận thất bại');
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
      <div className="flex gap-2.5 items-start">
        {/* User avatar */}
        <Avatar
          size={36}
          className="bg-blue-600 text-white font-bold shrink-0 mt-0.5 shadow-2xs"
        >
          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
        </Avatar>

        {/* Input area */}
        <div className="flex-1 relative">
          <Input.TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder={placeholder}
            autoFocus={autoFocus}
            maxLength={5000}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="rounded-2xl py-2 px-3.5 pr-12 bg-gray-100 hover:bg-gray-200/70 focus:bg-white text-xs sm:text-sm border-transparent focus:border-blue-500"
          />
          <div className="absolute right-2 bottom-1.5 flex items-center">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || !content.trim()}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            />
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 pl-11">{error}</p>}
    </div>
  );
};
