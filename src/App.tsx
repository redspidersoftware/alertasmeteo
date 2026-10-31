import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageProvider';
import { NuevaPage } from './components/NuevaPage';
import { DonationSection } from './components/DonationSection';
import { MotionConfig } from 'framer-motion';

const EulaPage = lazy(() =>
  import('./components/EulaPage').then((m) => ({ default: m.EulaPage }))
);
const UnsubscribePage = lazy(() =>
  import('./components/UnsubscribePage').then((m) => ({ default: m.UnsubscribePage }))
);
const AdminPage = lazy(() =>
  import('./components/AdminPage').then((m) => ({ default: m.AdminPage }))
);

const RouteFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-surface">
    <span className="material-symbols-outlined text-brand-ink animate-spin text-4xl">progress_activity</span>
  </div>
);

function App() {
  if (window.location.pathname === '/eula') {
    return (
      <LanguageProvider>
        <Suspense fallback={<RouteFallback />}>
          <EulaPage />
        </Suspense>
      </LanguageProvider>
    );
  }

  if (window.location.pathname === '/unsubscribe') {
    return (
      <LanguageProvider>
        <Suspense fallback={<RouteFallback />}>
          <UnsubscribePage />
        </Suspense>
      </LanguageProvider>
    );
  }

  if (window.location.pathname === '/admin') {
    return (
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<RouteFallback />}>
          <AdminPage />
        </Suspense>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <AuthProvider>
          <NuevaPage />
          <DonationSection isFixed={true} />
        </AuthProvider>
      </LanguageProvider>
    </MotionConfig>
  );
}
export default App;
