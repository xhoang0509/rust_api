import React from 'react';
import {
  Layout,
  Input,
  Avatar,
  Dropdown,
  Badge,
  Button,
  Tooltip,
  Tag,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  HomeFilled,
  HomeOutlined,
  TeamOutlined,
  UserOutlined,
  PlusOutlined,
  LogoutOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LockFilled,
  SyncOutlined,
} from '@ant-design/icons';
import type { CurrentUser } from '../../types';

const { Header } = Layout;

interface AppHeaderProps {
  currentUser: CurrentUser | null;
  activeTab: 'feed' | 'members' | 'my-posts';
  onTabChange: (tab: 'feed' | 'members' | 'my-posts') => void;
  search: string;
  onSearchChange: (value: string) => void;
  apiStatus: 'checking' | 'online' | 'offline';
  onOpenCreatePost: () => void;
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  apiStatus,
  onOpenCreatePost,
  onLogout,
}) => {
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div className="px-1 py-1">
          <p className="font-semibold text-gray-900 text-sm">{currentUser?.name}</p>
          <p className="text-xs text-gray-500">{currentUser?.email}</p>
          <div className="mt-2">
            <Tag color="blue" icon={<LockFilled />}>
              Thành viên riêng tư
            </Tag>
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'my-posts',
      icon: <UserOutlined />,
      label: 'Bài viết của tôi',
      onClick: () => onTabChange('my-posts'),
    },
    {
      key: 'members',
      icon: <TeamOutlined />,
      label: 'Danh sách thành viên',
      onClick: () => onTabChange('members'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: onLogout,
    },
  ];

  return (
    <Header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between shadow-xs">
      {/* Left side: Brand Logo + Search input */}
      <div className="flex items-center gap-3 w-64 md:w-80">
        <div
          onClick={() => onTabChange('feed')}
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-xs group-hover:scale-105 transition-transform">
            <span>🦀</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-lg text-blue-600 tracking-tight leading-none block">
              SocialNet
            </span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide block uppercase">
              Private Feed
            </span>
          </div>
        </div>

        <div className="flex-1 max-w-[200px] sm:max-w-xs">
          <Input
            placeholder="Tìm kiếm bài viết..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            variant="filled"
            className="rounded-full bg-gray-100 hover:bg-gray-200 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Center: Facebook-style navigation tabs */}
      <div className="hidden md:flex items-center justify-center gap-1 sm:gap-2 h-full">
        <Tooltip title="Bảng tin" placement="bottom">
          <button
            type="button"
            onClick={() => onTabChange('feed')}
            className={`h-12 px-6 flex items-center justify-center rounded-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            {activeTab === 'feed' ? (
              <HomeFilled className="text-2xl" />
            ) : (
              <HomeOutlined className="text-2xl" />
            )}
          </button>
        </Tooltip>

        <Tooltip title="Bài viết của tôi" placement="bottom">
          <button
            type="button"
            onClick={() => onTabChange('my-posts')}
            className={`h-12 px-6 flex items-center justify-center rounded-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'my-posts'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <UserOutlined className="text-2xl" />
          </button>
        </Tooltip>

        <Tooltip title="Danh sách thành viên" placement="bottom">
          <button
            type="button"
            onClick={() => onTabChange('members')}
            className={`h-12 px-6 flex items-center justify-center rounded-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <TeamOutlined className="text-2xl" />
          </button>
        </Tooltip>
      </div>

      {/* Right side: Actions, Status & User profile */}
      <div className="flex items-center gap-3">
        {/* Create Post button */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onOpenCreatePost}
          className="bg-blue-600 hover:bg-blue-700 font-medium rounded-full shadow-xs hidden sm:inline-flex items-center"
        >
          Đăng bài
        </Button>

        {/* API Status Badge */}
        <Tooltip
          title={`API Máy chủ: ${
            apiStatus === 'online'
              ? 'Hoạt động bình thường'
              : apiStatus === 'offline'
              ? 'Mất kết nối máy chủ'
              : 'Đang kiểm tra'
          }`}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
            {apiStatus === 'online' ? (
              <CheckCircleFilled className="text-green-500 text-sm" />
            ) : apiStatus === 'offline' ? (
              <CloseCircleFilled className="text-red-500 text-sm" />
            ) : (
              <SyncOutlined spin className="text-yellow-500 text-sm" />
            )}
            <span className="hidden lg:inline text-[11px] uppercase tracking-wider font-semibold">
              {apiStatus}
            </span>
          </div>
        </Tooltip>

        {/* User Avatar & Dropdown */}
        {currentUser && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <div className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-colors">
              <Badge dot status="success" offset={[-2, 28]}>
                <Avatar
                  className="bg-blue-600 font-semibold text-white cursor-pointer select-none"
                  size={36}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
              <div className="hidden xl:block text-left pr-1">
                <p className="text-xs font-semibold text-gray-800 leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-gray-400 leading-none mt-0.5">Thành viên</p>
              </div>
            </div>
          </Dropdown>
        )}
      </div>
    </Header>
  );
};
