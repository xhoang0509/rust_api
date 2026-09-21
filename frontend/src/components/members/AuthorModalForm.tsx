import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Alert } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import type { Author, CreateAuthor, UpdateAuthor } from '../../types';

interface AuthorModalFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAuthor | UpdateAuthor) => Promise<void>;
  authorToEdit?: Author | null;
  isLoading: boolean;
  error?: string | null;
}

export const AuthorModalForm: React.FC<AuthorModalFormProps> = ({
  open,
  onClose,
  onSubmit,
  authorToEdit,
  isLoading,
  error,
}) => {
  const [form] = Form.useForm();
  const isEditing = !!authorToEdit;

  useEffect(() => {
    if (open) {
      if (authorToEdit) {
        form.setFieldsValue({
          name: authorToEdit.name,
          email: authorToEdit.email,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, authorToEdit, form]);

  const handleFinish = async (values: { name: string; email: string }) => {
    await onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
    });
    onClose();
  };

  return (
    <Modal
      title={
        <div className="text-center pb-2 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isEditing ? 'Chỉnh sửa thông tin tác giả' : 'Thêm tác giả / thành viên mới'}
          </h2>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={460}
      className="rounded-2xl overflow-hidden"
    >
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          className="my-3 rounded-xl text-xs"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
        className="mt-4"
      >
        <Form.Item
          name="name"
          label={<span className="text-xs font-semibold text-gray-700">Họ và tên</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập họ tên tác giả' },
            { max: 100, message: 'Tên không quá 100 ký tự' },
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="Ví dụ: Nguyễn Văn A"
            size="large"
            className="rounded-xl"
          />
        </Form.Item>

        <Form.Item
          name="email"
          label={<span className="text-xs font-semibold text-gray-700">Địa chỉ Email</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Địa chỉ email không hợp lệ' },
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder="example@company.com"
            size="large"
            className="rounded-xl"
          />
        </Form.Item>

        <div className="flex gap-2 justify-end mt-6">
          <Button onClick={onClose} className="rounded-xl font-medium">
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl font-medium"
          >
            {isEditing ? 'Lưu cập nhật' : 'Thêm thành viên'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
