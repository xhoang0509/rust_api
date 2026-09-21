import React, { useState } from 'react';
import { Card, Avatar, Button, Input, Popconfirm, Tag, Tooltip, Empty, Skeleton } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  FileTextOutlined,
  CheckCircleFilled,
  TeamOutlined,
} from '@ant-design/icons';
import type { Author } from '../../types';

interface MembersViewProps {
  authors: Author[];
  isLoading: boolean;
  onEdit: (author: Author) => void;
  onDelete: (id: number) => Promise<void>;
  onOpenCreateModal: () => void;
  onFilterPostsByAuthor: (authorId: number) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  authors,
  isLoading,
  onEdit,
  onDelete,
  onOpenCreateModal,
  onFilterPostsByAuthor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAuthors = authors.filter((author) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return author.name.toLowerCase().includes(term) || author.email.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <Card
        className="rounded-2xl border-0 shadow-xs bg-white"
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
              <TeamOutlined />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Thành viên & Tác giả
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Tổng cộng có <strong>{authors.length}</strong> thành viên trong không gian riêng tư
              </p>
            </div>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-xs"
          >
            Thêm tác giả
          </Button>
        </div>

        {/* Search filter */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Input
            placeholder="Tìm kiếm thành viên theo tên hoặc email..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            variant="filled"
            className="rounded-xl max-w-md bg-gray-100 hover:bg-gray-200 focus:bg-white"
          />
        </div>
      </Card>

      {/* Members Grid */}
      {isLoading && authors.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-2xl border-0 shadow-xs bg-white p-4">
              <Skeleton avatar active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      ) : filteredAuthors.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-xs bg-white text-center py-12">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-gray-500 text-sm">
                Không tìm thấy thành viên nào phù hợp với "{searchTerm}"
              </span>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredAuthors.map((author) => (
            <Card
              key={author.id}
              className="rounded-2xl border-0 shadow-xs bg-white hover:shadow-sm transition-shadow flex flex-col justify-between"
              bodyStyle={{ padding: '20px' }}
            >
              <div>
                {/* Author Avatar & Name */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      size={48}
                      className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xs shrink-0"
                    >
                      {author.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                          {author.name}
                        </h3>
                        <CheckCircleFilled className="text-blue-500 text-xs" />
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        <MailOutlined className="text-[11px]" />
                        <span className="truncate">{author.email}</span>
                      </p>
                    </div>
                  </div>

                  <Tag color="cyan" className="rounded-lg m-0 text-xs font-semibold border-0">
                    ID #{author.id}
                  </Tag>
                </div>

                {/* Additional Info */}
                {author.created_at && (
                  <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
                    Tham gia: {new Date(author.created_at).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={() => onFilterPostsByAuthor(author.id)}
                  className="rounded-lg text-xs font-medium text-gray-700 hover:text-blue-600"
                >
                  Xem bài viết
                </Button>

                <div className="flex items-center gap-1">
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => onEdit(author)}
                      className="text-gray-600 hover:text-blue-600 rounded-lg"
                    />
                  </Tooltip>

                  <Popconfirm
                    title="Xóa tác giả"
                    description="Xóa tác giả sẽ xóa toàn bộ các bài viết liên quan. Bạn có chắc chắn?"
                    onConfirm={() => onDelete(author.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true, size: 'small' }}
                    cancelButtonProps={{ size: 'small' }}
                  >
                    <Tooltip title="Xóa tác giả">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        className="rounded-lg"
                      />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
