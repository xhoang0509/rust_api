import React from 'react';
import { Card, Avatar, Button, Divider } from 'antd';
import {
  FormOutlined,
  SmileOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { CurrentUser } from '../../types';

interface CreatePostCardProps {
  currentUser: CurrentUser | null;
  onOpenModal: () => void;
}

export const CreatePostCard: React.FC<CreatePostCardProps> = ({
  currentUser,
  onOpenModal,
}) => {
  return (
    <Card
      className="rounded-2xl border-0 shadow-xs bg-white mb-4 transition-all hover:shadow-sm"
      bodyStyle={{ padding: '16px' }}
    >
      <div className="flex items-center gap-3">
        <Avatar
          size={42}
          className="bg-blue-600 text-white font-bold shrink-0"
        >
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
        </Avatar>

        <button
          type="button"
          onClick={onOpenModal}
          className="flex-1 text-left px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition-colors cursor-pointer"
        >
          {currentUser?.name
            ? `${currentUser.name} ơi, bạn đang nghĩ gì thế?`
            : 'Bạn đang nghĩ gì thế?'}
        </button>
      </div>

      <Divider className="my-3 border-gray-100" />

      <div className="grid grid-cols-3 gap-2">
        <Button
          type="text"
          icon={<FormOutlined className="text-blue-600 text-base" />}
          onClick={onOpenModal}
          className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 font-medium rounded-xl h-10 flex items-center justify-center gap-2"
        >
          <span className="text-xs sm:text-sm">Viết bài mới</span>
        </Button>

        <Button
          type="text"
          icon={<PictureOutlined className="text-green-600 text-base" />}
          onClick={onOpenModal}
          className="text-gray-600 hover:text-green-600 hover:bg-green-50 font-medium rounded-xl h-10 flex items-center justify-center gap-2"
        >
          <span className="text-xs sm:text-sm">Chia sẻ ý tưởng</span>
        </Button>

        <Button
          type="text"
          icon={<SmileOutlined className="text-amber-500 text-base" />}
          onClick={onOpenModal}
          className="text-gray-600 hover:text-amber-600 hover:bg-amber-50 font-medium rounded-xl h-10 flex items-center justify-center gap-2"
        >
          <span className="text-xs sm:text-sm">Cảm xúc</span>
        </Button>
      </div>
    </Card>
  );
};
