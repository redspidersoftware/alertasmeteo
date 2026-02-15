import { Header } from './components/Header';
import { AlertList } from './components/AlertList';
import { MapView } from './components/MapView';
import { useEffect, useState } from 'react';
import { getAlerts } from './services/aemet';
import type { WeatherAlert } from './types';
import { useLanguage } from './context/LanguageContext';
import { LanguageProvider } from './context/LanguageProvider';
import { AlertFilter } from './components/AlertFilter';
import { AuthProvider } from './context/AuthContext';
import { UserListModal } from './components/UserListModal';
import { verifyUser } from './services/userService';

const AppContent = () => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    getAlerts().then(setAlerts);
    const interval = setInterval(() => {
      getAlerts().then(setAlerts);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Verification Logic (Simulation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyEmail = params.get('verify');
    if (verifyEmail) {
      console.log("Verifying user:", verifyEmail);
      verifyUser(verifyEmail).then(verified => {
        if (verified) {
          alert(`Cuenta verificada para ${verifyEmail}. Ya puedes iniciar sesión.`);
          // Clean URL
          window.history.replaceState({}, document.title, "/");
        }
      });
    }
  }, []);

  // 1. Language Filter + Severity Filter (Only Yellow, Orange, Red)
  const languageFiltered = alerts.filter(alert => {
    const alertLang = alert.language ? alert.language.toLowerCase() : 'es';
    const isRightLanguage = alertLang.startsWith(language);
    const isImportantSeverity = ['yellow', 'orange', 'red'].includes(alert.severity);
    return isRightLanguage && isImportantSeverity;
  });

  // 2. Event Type Filter (applied on top of language filter)
  const finalFilteredAlerts = selectedEventType
    ? languageFiltered.filter(alert => alert.event === selectedEventType)
    : languageFiltered;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto">
        <div className="py-8 px-4">

          {/* Map + Sidebar Layout */}
          <div className="flex flex-col lg:flex-row gap-6 mb-10">
            {/* Map Section (Fixed height for consisteny) */}
            <div className="flex-1 min-w-0">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">{t('map.title')}</h2>
                {selectedEventType && (
                  <span className="text-sm bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30 animate-in fade-in">
                    Filtrado por: {selectedEventType}
                  </span>
                )}
              </div>
              <MapView alerts={finalFilteredAlerts} />
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 flex-shrink-0">
              {/* Spacer to align with map title if needed, or just start content */}
              <div className="h-[43px] hidden lg:block"></div>
              <AlertFilter
                alerts={languageFiltered} // Pass all language-valid alerts to populate sidebar counts correctly
                selectedType={selectedEventType}
                onSelectType={setSelectedEventType}
              />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2">{t('list.title')}</h2>
            <p className="text-slate-400 mb-4">
              {t('list.subtitle')}
            </p>
            <AlertList filteredAlerts={finalFilteredAlerts} />
          </div>
        </div>
      </main>

      <footer className="py-10 text-center border-t border-white/5 mt-auto bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-slate-400 mb-4">{t('footer.donate_desc')}</p>
          <a
            href="https://www.paypal.com/donate?hosted_button_id=YOUR_ID"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold transition-all shadow-lg hover:shadow-[#0070ba]/20 mb-6 group"
          >
            <span className="text-lg">PayPal</span>
            <span>{t('footer.donate')}</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>

          <div className="flex flex-col items-center gap-2 text-slate-500 text-sm">
            <p>© {new Date().getFullYear()} - Visualizador de Alertas AEMET</p>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-xs opacity-50 hover:opacity-100 hover:text-blue-400 transition-all underline decoration-dotted"
            >
              Admin DB
            </button>
          </div>
        </div>
      </footer>

      <UserListModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
