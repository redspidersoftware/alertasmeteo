import { Header } from './components/Header';
import { AlertList } from './components/AlertList';
import { MapView } from './components/MapView';
import { motion } from 'framer-motion';
import { CloudRainWind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAlerts } from './services/aemet';
import type { WeatherAlert } from './types';
import { useLanguage } from './context/LanguageContext';
import { LanguageProvider } from './context/LanguageProvider';
import { AlertFilter } from './components/AlertFilter';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserListModal } from './components/UserListModal';
import { verifyUser } from './services/userService';

const AppContent = () => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const { t, language } = useLanguage();
  const { user } = useAuth();

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

  // 1. Language Filter + User Preferences (Severity + Event Types)
  const languageFiltered = alerts.filter(alert => {
    // A. Language Filter
    const alertLang = alert.language ? alert.language.toLowerCase() : 'es';
    const isRightLanguage = alertLang.startsWith(language);
    if (!isRightLanguage) return false;

    // B. User Preferences or Defaults
    const allowedSeverities = user?.preferredSeverities || ['yellow', 'orange', 'red'];
    const allowedTypes = user?.preferredEventTypes || [];

    const isAllowedSeverity = allowedSeverities.includes(alert.severity);

    // Improved matching: partial
    const isAllowedType = allowedTypes.length === 0 || allowedTypes.some(type =>
      alert.event.toLowerCase().includes(type.toLowerCase()) ||
      type.toLowerCase().includes(alert.event.toLowerCase())
    );

    return isAllowedSeverity && isAllowedType;
  });

  // 2. Event Type Filter (applied on top of language filter)
  const finalFilteredAlerts = selectedEventType
    ? languageFiltered.filter(alert => alert.event === selectedEventType)
    : languageFiltered;

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-500/30">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Map + Sidebar Layout */}
          <div className="flex flex-col lg:flex-row gap-8 mb-16">
            {/* Map Section */}
            <div className="flex-1 min-w-0">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                    {t('map.title')}
                  </h2>
                </div>
                {selectedEventType && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs font-black uppercase tracking-widest bg-blue-600/20 text-blue-300 px-4 py-2 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/10"
                  >
                    {t('event.filtered_by')}: {selectedEventType}
                  </motion.span>
                )}
              </div>
              <div className="glass-dark rounded-[2.5rem] overflow-hidden p-1 shadow-2xl ring-1 ring-white/5 bg-slate-900/40">
                <MapView alerts={finalFilteredAlerts} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-96 flex-shrink-0 lg:pt-14">
              <AlertFilter
                alerts={languageFiltered}
                selectedType={selectedEventType}
                onSelectType={setSelectedEventType}
              />
            </div>
          </div>

          {/* Donation Section - Premium Redesign */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="mb-16 glass rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden group border border-white/5"
          >
            {/* Decorative Background Elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/15 transition-colors duration-700"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/15 transition-colors duration-700"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="bg-blue-500/10 p-4 rounded-3xl mb-6 border border-blue-500/20 shadow-inner">
                <CloudRainWind size={40} className="text-blue-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
                {t('footer.donate_title') || t('footer.donate')}
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto mb-10 text-lg font-medium leading-relaxed">
                {t('footer.donate_desc')}
              </p>

              <div className="flex flex-wrap justify-center gap-6">
                {/* PayPal Form */}
                <form action="https://www.paypal.com/donate" method="post" target="_blank">
                  <input type="hidden" name="business" value="RLBDLZGFL5DRQ" />
                  <input type="hidden" name="no_recurring" value="0" />
                  <input type="hidden" name="item_name" value="Ayúdanos a mejorar el servicio" />
                  <input type="hidden" name="currency_code" value="EUR" />
                  <button
                    type="submit"
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0070ba] to-[#005ea6] text-white font-black transition-all shadow-xl hover:shadow-[#0070ba]/40 active:scale-95 group/btn text-sm tracking-widest uppercase"
                  >
                    <span className="text-xl">PayPal</span>
                    {t('footer.donate')}
                  </button>
                </form>

                {/* Buy Me a Coffee */}
                <a
                  href="https://buymeacoffee.com/alertasmeteo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black transition-all shadow-xl hover:shadow-white/20 active:scale-95 group/btn text-sm tracking-widest uppercase border border-white"
                >
                  <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="BMC" className="h-6" />
                  <span>{t('footer.donate_bmc')}</span>
                </a>
              </div>
            </div>
          </motion.div>

          {/* List Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                {t('list.title')}
              </h2>
              <div className="hidden sm:block text-xs font-black uppercase tracking-[0.2em] text-slate-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                {finalFilteredAlerts.length} avisos activos
              </div>
            </div>

            <motion.div
              layout
              className="relative"
            >
              <AlertList filteredAlerts={finalFilteredAlerts} />
            </motion.div>
          </div>
        </motion.div>
      </main>

      <footer className="py-12 glass border-t border-white/5 mt-auto text-center relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-slate-400 text-sm font-bold tracking-tight relative z-10">
          <p>© {new Date().getFullYear()} — <span className="text-gradient font-black">Visualizador de Alertas AEMET</span></p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-blue-400 transition-all font-black border border-white/10 px-3 py-1.5 rounded-lg hover:border-blue-400/30"
            >
              Admin Dashboard
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
