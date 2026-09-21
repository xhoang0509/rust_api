import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Avatar, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { Author, CreatePost, UpdatePost, PostWithAuthor, CurrentUser } from '../../types';

interface PostModalFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePost | UpdatePost) => Promise<void>;
  authors: Author[];
  currentUser: CurrentUser | null;
  postToEdit?: PostWithAuthor | null;
  isLoading: boolean;
  error?: string | null;
}

export const PostModalForm: React.FC<PostModalFormProps> = ({
  open,
  onClose,
  onSubmit,
  authors,
  currentUser,
  postToEdit,
  isLoading,
  error,
}) => {
  const [form] = Form.useForm();
  const isEditing = !!postToEdit;

  useEffect(() => {
    if (open) {
      if (postToEdit) {
        form.setFieldsValue({
          title: postToEdit.title,
          content: postToEdit.content,
          author_id: postToEdit.author_id,
        });
      } else {
        // Default to author matching current user or first author
        const matchedAuthor = authors.find(
          (a) => a.email.toLowerCase() === currentUser?.email?.toLowerCase()
        );
        form.setFieldsValue({
          title: '',
          content: '',
          author_id: matchedAuthor ? matchedAuthor.id : authors[0]?.id || undefined,
        });
      }
    } else {
      form.resetFields();
    }
  }, [open, postToEdit, authors, currentUser, form]);

  const handleFinish = async (values: { title: string; content: string; author_id: number }) => {
    await onSubmit({
      title: values.title.trim(),
      content: values.content.trim(),
      author_id: values.author_id,
    });
    onClose();
  };

  return (
    <Modal
      title={
        <div className="text-center pb-2 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isEditing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
          </h2>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={540}
      className="rounded-2xl overflow-hidden"
    >
      {/* Author info header */}
      <div className="flex items-center gap-3 my-4">
        <Avatar
          size={44}
          className="bg-blue-600 text-white font-bold shrink-0"
        >
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
        </Avatar>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">
            {currentUser?.name || 'Thành viên'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
              <LockOutlined className="text-[10px]" /> Riêng tư nội bộ
            </span>
          </div>
        </div>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          className="mb-4 rounded-xl text-xs"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
      >
        {/* Author selection if multiple authors available */}
        <Form.Item
          name="author_id"
          label={<span className="text-xs font-semibold text-gray-600">Đăng với tư cách tác giả:</span>}
          rules={[{ required: true, message: 'Vui lòng chọn tác giả' }]}
          className="mb-3"
        >
          <Select
            placeholder="Chọn tác giả bài viết"
            className="w-full rounded-xl"
            options={authors.map((a) => ({
              label: `${a.name} (${a.email})`,
              value: a.id,
            }))}
          />
        </Form.Item>

        {/* Post Title */}
        <Form.Item
          name="title"
          rules={[
            { required: true, message: 'Vui lòng nhập tiêu đề bài viết' },
            { max: 200, message: 'Tiêu đề không quá 200 ký tự' },
          ]}
          className="mb-3"
        >
          <Input
            placeholder="Tiêu đề bài viết..."
            size="large"
            className="rounded-xl font-semibold text-base"
          />
        </Form.Item>

        {/* Post Content */}
        <Form.Item
          name="content"
          rules={[
            { required: true, message: 'Vui lòng nhập nội dung bài viết' },
            { max: 10000, message: 'Nội dung không quá 10,000 ký tự' },
          ]}
          className="mb-4"
        >
          <Input.TextArea
            placeholder={`${currentUser?.name || 'Bạn'} đang nghĩ gì thế? Chia sẻ kiến thức, thảo luận hoặc cập nhật mới...`}
            rows={5}
            maxLength={10000}
            showCount
            className="rounded-xl text-sm"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          block
          size="large"
          className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl h-11 shadow-xs"
        >
          {isEditing ? 'Lưu thay đổi' : 'Đăng bài viết'}
        </Button>
      </Form>
    </Modal>
  );
};
