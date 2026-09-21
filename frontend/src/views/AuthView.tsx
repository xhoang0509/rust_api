import React, { useState } from 'react';
import { Card, Form, Input, Button, Tabs } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();

  const handleFinish = async (values: { name?: string; email: string; password: string }) => {
    const trimmedEmail = values.email.trim();
    const trimmedPassword = values.password;
    const trimmedName = values.name?.trim() || '';

    setIsLoading(true);
    try {
      if (activeTab === 'login') {
        await login({ email: trimmedEmail, password: trimmedPassword });
        showToast('Đăng nhập thành công', 'success');
      } else {
        await register({ name: trimmedName, email: trimmedEmail, password: trimmedPassword });
        showToast('Đăng ký tài khoản thành công', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xác thực thất bại';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md text-3xl mb-3">
            <span>🦀</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            SocialNet <span className="text-blue-600">Private</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Mạng xã hội nội bộ • Riêng tư • Tương tác cao
          </p>
        </div>

        {/* Auth Card Container */}
        <Card
          className="rounded-3xl border-0 shadow-sm bg-white overflow-hidden"
          bodyStyle={{ padding: '24px 28px' }}
        >
          {/* Tabs for Login vs Register */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as 'login' | 'register');
              form.resetFields();
            }}
            centered
            className="mb-4"
            items={[
              {
                key: 'login',
                label: <span className="font-semibold text-sm px-4">Đăng nhập</span>,
              },
              {
                key: 'register',
                label: <span className="font-semibold text-sm px-4">Đăng ký thành viên</span>,
              },
            ]}
          />

          <div className="mb-4 text-center">
            <h2 className="text-base font-bold text-gray-800">
              {activeTab === 'login' ? 'Chào mừng bạn quay lại' : 'Tạo tài khoản thành viên'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeTab === 'login'
                ? 'Đăng nhập để xem bảng tin, thả cảm xúc và thảo luận'
                : 'Tham gia mạng xã hội riêng tư cùng các đồng nghiệp'}
            </p>
          </div>

          <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
            {activeTab === 'register' && (
              <Form.Item
                name="name"
                rules={[
                  { required: true, message: 'Vui lòng nhập họ và tên' },
                  { min: 2, message: 'Tên tối thiểu 2 ký tự' },
                ]}
                className="mb-3"
              >
                <Input
                  prefix={<UserOutlined className="text-gray-400" />}
                  placeholder="Họ và tên của bạn"
                  size="large"
                  disabled={isLoading}
                  className="rounded-xl text-sm"
                />
              </Form.Item>
            )}

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không đúng định dạng' },
              ]}
              className="mb-3"
            >
              <Input
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder="Địa chỉ Email"
                size="large"
                disabled={isLoading}
                className="rounded-xl text-sm"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
              ]}
              className="mb-5"
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Mật khẩu"
                size="large"
                disabled={isLoading}
                className="rounded-xl text-sm"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              size="large"
              className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl h-11 shadow-xs text-sm"
            >
              {activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>
          </Form>

          {/* Privacy badge */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <SafetyCertificateOutlined className="text-green-500" />
            <span>Mã hóa Argon2 & JWT Bảo mật</span>
          </div>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
          <GlobalOutlined /> Rust Axum SQLite + React 19 Ant Design
        </p>
      </div>
    </div>
  );
};
