import { UnsubscribePage } from './components/UnsubscribePage';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageProvider';
import { EulaPage } from './components/EulaPage';
import { NuevaPage } from './components/NuevaPage';





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

  return (
    <LanguageProvider>
      <AuthProvider>
        <NuevaPage />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

