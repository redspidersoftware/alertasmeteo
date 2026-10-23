import { UnsubscribePage } from './components/UnsubscribePage';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageProvider';
import { EulaPage } from './components/EulaPage';
import { NuevaPage } from './components/NuevaPage';
import { DonationSection } from './components/DonationSection';
import { AdminPage } from './components/AdminPage';
import { MotionConfig } from 'framer-motion';

function App() {
  if (window.location.pathname === '/eula') {
    return (
      <LanguageProvider>
        <EulaPage />
      </LanguageProvider>
    );
  }

  if (window.location.pathname === '/unsubscribe') {
    return (
      <LanguageProvider>
        <UnsubscribePage />
      </LanguageProvider>
    );
  }

  if (window.location.pathname === '/admin') {
    return (
      <MotionConfig reducedMotion="user">
        <AdminPage />
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
