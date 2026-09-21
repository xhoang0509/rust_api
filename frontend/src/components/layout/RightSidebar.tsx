import React from 'react';
import { Card, Avatar, Button, Tooltip, Empty } from 'antd';
import {
  TeamOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  LockOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { Author } from '../../types';

interface RightSidebarProps {
  authors: Author[];
  selectedAuthorId?: number;
  onSelectAuthor: (authorId?: number) => void;
  onOpenCreateAuthor: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  authors,
  selectedAuthorId,
  onSelectAuthor,
  onOpenCreateAuthor,
}) => {
  return (
    <aside className="w-64 xl:w-72 shrink-0 hidden xl:block sticky top-18 self-start space-y-4">
      {/* Authors list card */}
      <Card
        size="small"
        className="rounded-2xl border-0 shadow-xs bg-white"
        bodyStyle={{ padding: '16px' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TeamOutlined className="text-blue-600 text-sm" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Tác giả nổi bật
            </h3>
          </div>
          <Tooltip title="Thêm tác giả mới">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<PlusOutlined />}
              onClick={onOpenCreateAuthor}
              className="text-gray-500 hover:text-blue-600"
            />
          </Tooltip>
        </div>

        {selectedAuthorId !== undefined && (
          <div className="mb-3 flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs">
            <span className="text-blue-700 font-medium truncate">
              Đang lọc theo tác giả
            </span>
            <button
              type="button"
              onClick={() => onSelectAuthor(undefined)}
              className="text-blue-600 hover:text-blue-800 font-bold ml-1 cursor-pointer text-xs"
            >
              Bỏ lọc
            </button>
          </div>
        )}

        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {authors.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span className="text-xs text-gray-400">Chưa có tác giả nào</span>}
            />
          ) : (
            authors.slice(0, 8).map((author) => {
              const isSelected = selectedAuthorId === author.id;
              return (
                <div
                  key={author.id}
                  onClick={() => onSelectAuthor(isSelected ? undefined : author.id)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-blue-50 ring-1 ring-blue-500 text-blue-900'
                      : 'hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      size={32}
                      className={`font-semibold shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}
                    >
                      {author.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {author.name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate leading-none mt-0.5">
                        {author.email}
                      </p>
                    </div>
                  </div>
                  {isSelected ? (
                    <FilterOutlined className="text-blue-600 text-xs" />
                  ) : (
                    <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Lọc
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Community Rules / Guidelines */}
      <Card
        size="small"
        className="rounded-2xl border-0 shadow-xs bg-white"
        bodyStyle={{ padding: '16px' }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <ThunderboltOutlined className="text-amber-500 text-sm" />
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Nội quy mạng nội bộ
          </h4>
        </div>
        <ul className="text-xs text-gray-600 space-y-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircleOutlined className="text-green-500 mt-0.5 text-xs shrink-0" />
            <span>Tôn trọng ý kiến đóng góp của các thành viên.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleOutlined className="text-green-500 mt-0.5 text-xs shrink-0" />
            <span>Không chia sẻ tài khoản hoặc thông tin ra bên ngoài.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircleOutlined className="text-green-500 mt-0.5 text-xs shrink-0" />
            <span>Chủ bài viết có quyền quản lý và duyệt bình luận.</span>
          </li>
        </ul>
      </Card>

      {/* Private Security Banner */}
      <Card
        size="small"
        className="rounded-2xl border-0 shadow-xs bg-gradient-to-br from-gray-900 to-slate-800 text-white"
        bodyStyle={{ padding: '16px' }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1.5">
          <LockOutlined /> Bảo mật danh tính
        </div>
        <p className="text-[11px] text-gray-300 leading-relaxed">
          Mật khẩu được mã hóa an toàn bằng Argon2. Phiên làm việc duy trì qua JWT token.
        </p>
      </Card>
    </aside>
  );
};
