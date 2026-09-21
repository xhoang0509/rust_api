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
    <ToastProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ToastProvider>
  );
}
