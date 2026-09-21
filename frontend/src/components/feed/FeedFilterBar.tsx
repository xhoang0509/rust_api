import React from 'react';
import { Card, Input, Select, Button, Tag } from 'antd';
import { SearchOutlined, CloseCircleOutlined, UserOutlined } from '@ant-design/icons';
import type { Author } from '../../types';

interface FeedFilterBarProps {
  authors: Author[];
  search: string;
  authorId?: number;
  onSearchChange: (search: string) => void;
  onAuthorChange: (authorId?: number) => void;
  onClear: () => void;
}

export const FeedFilterBar: React.FC<FeedFilterBarProps> = ({
  authors,
  search,
  authorId,
  onSearchChange,
  onAuthorChange,
  onClear,
}) => {
  const hasActiveFilters = !!search || authorId !== undefined;
  const selectedAuthor = authors.find((a) => a.id === authorId);

  return (
    <Card
      className="rounded-2xl border-0 shadow-xs bg-white mb-4"
      bodyStyle={{ padding: '12px 16px' }}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="flex-1">
          <Input
            placeholder="Tìm bài viết theo tiêu đề hoặc nội dung..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            variant="filled"
            className="rounded-xl bg-gray-100 hover:bg-gray-200 focus:bg-white"
          />
        </div>

        {/* Author select dropdown */}
        <div className="w-full sm:w-56">
          <Select
            placeholder="Lọc theo tác giả"
            value={authorId}
            onChange={(val) => onAuthorChange(val)}
            allowClear
            variant="filled"
            className="w-full rounded-xl"
            options={authors.map((a) => ({
              label: (
                <div className="flex items-center gap-1.5 truncate">
                  <UserOutlined className="text-xs text-gray-400" />
                  <span className="truncate">{a.name}</span>
                </div>
              ),
              value: a.id,
            }))}
          />
        </div>

        {/* Clear filters button if active */}
        {hasActiveFilters && (
          <Button
            type="text"
            icon={<CloseCircleOutlined />}
            onClick={onClear}
            className="text-gray-500 hover:text-red-600 self-center"
          >
            Đặt lại
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
          <span>Đang lọc:</span>
          {search && (
            <Tag
              closable
              onClose={() => onSearchChange('')}
              color="blue"
              className="rounded-lg m-0"
            >
              Từ khóa: "{search}"
            </Tag>
          )}
          {selectedAuthor && (
            <Tag
              closable
              onClose={() => onAuthorChange(undefined)}
              color="purple"
              className="rounded-lg m-0"
            >
              Tác giả: {selectedAuthor.name}
            </Tag>
          )}
        </div>
      )}
    </Card>
  );
};
