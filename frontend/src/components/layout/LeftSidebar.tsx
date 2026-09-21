import React from 'react';
import { Card, Avatar, Tag } from 'antd';
import {
  HomeFilled,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { CurrentUser } from '../../types';

interface LeftSidebarProps {
  currentUser: CurrentUser | null;
  activeTab: 'feed' | 'members' | 'my-posts';
  onTabChange: (tab: 'feed' | 'members' | 'my-posts') => void;
  totalPosts: number;
  totalAuthors: number;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  totalPosts,
  totalAuthors,
}) => {
  return (
    <aside className="w-64 xl:w-72 shrink-0 hidden lg:block sticky top-18 self-start space-y-4">
      {/* Current User Quick Card */}
      {currentUser && (
        <Card
          size="small"
          className="rounded-2xl border-0 shadow-xs bg-white hover:shadow-sm transition-shadow"
          bodyStyle={{ padding: '16px' }}
        >
          <div className="flex items-center gap-3">
            <Avatar
              size={48}
              className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xs shrink-0"
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-gray-900 truncate leading-tight">
                {currentUser.name}
              </h3>
              <p className="text-xs text-gray-500 truncate mt-0.5">{currentUser.email}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Tag color="cyan" className="text-[10px] font-medium border-0 m-0 px-1.5 py-0.5">
                  ID: #{currentUser.id}
                </Tag>
                <Tag color="green" className="text-[10px] font-medium border-0 m-0 px-1.5 py-0.5">
                  Đã đăng nhập
                </Tag>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Links */}
      <Card
        size="small"
        className="rounded-2xl border-0 shadow-xs bg-white"
        bodyStyle={{ padding: '8px' }}
      >
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onTabChange('feed')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-lg ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'}`}>
                <HomeFilled />
              </span>
              <span>Bảng tin chung</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {totalPosts}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('my-posts')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'my-posts'
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-lg ${activeTab === 'my-posts' ? 'text-blue-600' : 'text-gray-500'}`}>
                <UserOutlined />
              </span>
              <span>Bài viết của tôi</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('members')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-lg ${activeTab === 'members' ? 'text-blue-600' : 'text-gray-500'}`}>
                <TeamOutlined />
              </span>
              <span>Thành viên cộng đồng</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {totalAuthors}
            </span>
          </button>
        </div>
      </Card>

      {/* Community Stats Card */}
      <Card
        size="small"
        className="rounded-2xl border-0 shadow-xs bg-white"
        bodyStyle={{ padding: '16px' }}
      >
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Thông số cộng đồng
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500 mb-0.5 flex items-center justify-center gap-1">
              <FileTextOutlined className="text-blue-500" /> Bài viết
            </p>
            <p className="text-lg font-bold text-gray-900">{totalPosts}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-xs text-gray-500 mb-0.5 flex items-center justify-center gap-1">
              <TeamOutlined className="text-indigo-500" /> Tác giả
            </p>
            <p className="text-lg font-bold text-gray-900">{totalAuthors}</p>
          </div>
        </div>
      </Card>

      {/* Privacy Notice Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-xs text-blue-900 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-blue-800">
          <SafetyCertificateOutlined className="text-blue-600 text-sm" />
          <span>Không gian mạng riêng tư</span>
        </div>
        <p className="text-blue-700/90 leading-relaxed text-[11px]">
          Mọi thảo luận, bài viết, cảm xúc và bình luận chỉ hiển thị nội bộ cho các thành viên đã xác thực.
        </p>
      </div>

      {/* Footer information */}
      <div className="px-2 text-[11px] text-gray-400 space-y-1">
        <p className="flex items-center gap-1">
          <GlobalOutlined /> Rust Axum + SQLite + Ant Design
        </p>
        <p>© 2026 SocialNet Private Community</p>
      </div>
    </aside>
  );
};
