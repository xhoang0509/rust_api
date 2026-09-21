import { ConfigProvider, App as AntdApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';

function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return <DashboardView />;
}

export function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1877F2',
          borderRadius: 10,
          colorBgLayout: '#F0F2F5',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        },
        components: {
          Card: {
            borderRadiusLG: 16,
          },
          Button: {
            controlHeight: 36,
            borderRadius: 10,
          },
          Input: {
            borderRadius: 10,
            controlHeight: 40,
          },
          Modal: {
            borderRadiusLG: 16,
          },
        },
      }}
    >
      <AntdApp>
        <ToastProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ToastProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
