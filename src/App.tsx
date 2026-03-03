import { Header } from './components/Header';
import { AlertList } from './components/AlertList';
import { MapView } from './components/MapView';
import { UnsubscribePage } from './components/UnsubscribePage';
import { motion } from 'framer-motion';
import { CloudRainWind } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

import { getAlerts } from './services/aemet';
import type { WeatherAlert } from './types';
import { useLanguage } from './context/LanguageContext';
import { LanguageProvider } from './context/LanguageProvider';
import { AlertFilter } from './components/AlertFilter';
import { AuthProvider, useAuth } from './context/AuthContext';
import { verifyUser } from './services/userService';
import { EulaPage } from './components/EulaPage';
import { Timeline } from './components/Timeline';


const AppContent = () => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [timelineTime, setTimelineTime] = useState<Date | null>(null);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
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
  const languageFiltered = useMemo(() => {
    return alerts.filter(alert => {
      // A. Language Filter
      const alertLang = alert.language ? alert.language.toLowerCase() : 'es';
      const isRightLanguage = alertLang.startsWith(language);
      if (!isRightLanguage) return false;

      // B. User Preferences or Defaults
      const allowedSeverities = user?.preferredSeverities || ['yellow', 'orange', 'red', 'green'];
      const allowedTypes = user?.preferredEventTypes || [];

      const isAllowedSeverity = allowedSeverities.includes(alert.severity);

      // Improved matching: partial match to handle "Lluvias y Tormentas" or different AEMET formats
      const isAllowedType = allowedTypes.length === 0 || allowedTypes.some(type =>
        alert.event.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(alert.event.toLowerCase())
      );

      return isAllowedSeverity && isAllowedType;
    });
  }, [alerts, language, user]);

  const timelineRange = useMemo(() => {

    if (languageFiltered.length === 0) return null;
    let min = new Date(languageFiltered[0].raw.effective || languageFiltered[0].sent).getTime();
    let max = new Date(languageFiltered[0].expires).getTime();
    languageFiltered.forEach(alert => {
      const eff = new Date(alert.raw.effective || alert.sent).getTime();
      const exp = new Date(alert.expires).getTime();
      if (eff < min) min = eff;
      if (exp > max) max = exp;
    });
    return { min, max };
  }, [languageFiltered]);


  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isTimelinePlaying) {
      if (!timelineTime && timelineRange) {
        setTimelineTime(new Date(timelineRange.min));
      }
      interval = setInterval(() => {
        setTimelineTime(prev => {
          if (!prev || !timelineRange) return null;
          const next = new Date(prev.getTime() + 1800000); // 30 mins step
          if (next.getTime() > timelineRange.max) {
            return new Date(timelineRange.min); // Loop
          }
          return next;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isTimelinePlaying, timelineTime, timelineRange]);


  // 2. Event Type + Severity Filter (applied on top of language filter)
  const finalFilteredAlerts = languageFiltered.filter(alert => {
    const matchesType = !selectedEventType || alert.event === selectedEventType;
    const matchesSeverity = !selectedSeverity || alert.severity === selectedSeverity;

    const effective = new Date(alert.raw.effective || alert.sent).getTime();
    const expires = new Date(alert.expires).getTime();
    const targetTime = timelineTime ? timelineTime.getTime() : Date.now();

    const isWithinTime = targetTime >= effective && targetTime < expires;

    return matchesType && matchesSeverity && isWithinTime;
  });


  const handleFilterChange = (type: string | null, severity: string | null) => {
    setSelectedEventType(type);
    setSelectedSeverity(severity);
  };

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
                {(selectedEventType || selectedSeverity) && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs font-black uppercase tracking-widest bg-blue-600/20 text-blue-300 px-4 py-2 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/10"
                  >
                    {t('event.filtered_by')}: {selectedEventType || selectedSeverity}
                  </motion.span>
                )}
              </div>
              <div className="glass-dark rounded-[2.5rem] overflow-hidden p-1 shadow-2xl ring-1 ring-white/5 bg-slate-900/40">
                <MapView alerts={finalFilteredAlerts} />
              </div>

              {/* Donation Section - Relocated under map */}
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="mt-8 glass rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden group border border-white/5"
              >
                {/* Decorative Background Elements */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/15 transition-colors duration-700"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/15 transition-colors duration-700"></div>

                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20 shadow-inner flex-shrink-0">
                      <CloudRainWind size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight">
                        {t('footer.donate_title') || t('footer.donate')}
                      </h2>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md">
                        {t('footer.donate_desc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-end gap-4">
                    {/* PayPal Form */}
                    <form action="https://www.paypal.com/donate" method="post" target="_blank">
                      <input type="hidden" name="business" value="RLBDLZGFL5DRQ" />
                      <input type="hidden" name="no_recurring" value="0" />
                      <input type="hidden" name="item_name" value="Ayúdanos a mejorar el servicio" />
                      <input type="hidden" name="currency_code" value="EUR" />
                      <button
                        type="submit"
                        className="flex items-center justify-center gap-2 px-6 h-11 min-w-[200px] rounded-xl bg-gradient-to-r from-[#0070ba] to-[#005ea6] text-white font-black transition-all shadow-lg hover:shadow-[#0070ba]/40 active:scale-95 group/btn text-xs tracking-widest uppercase"
                      >
                        <span className="text-lg">PayPal</span>
                        {t('footer.donate')}
                      </button>
                    </form>

                    {/* Buy Me a Coffee */}
                    <a
                      href="https://buymeacoffee.com/alertasmeteo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-6 h-11 min-w-[200px] rounded-xl bg-white text-black font-black transition-all shadow-lg hover:shadow-white/20 active:scale-95 group/btn text-xs tracking-widest uppercase border border-white"
                    >
                      <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="BMC" className="h-5" />
                      <span>{t('footer.donate_bmc')}</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-96 flex-shrink-0 lg:pt-14">
              <AlertFilter
                alerts={languageFiltered}
                selectedType={selectedEventType}
                selectedSeverity={selectedSeverity}
                onFilterChange={handleFilterChange}
              />
              <Timeline
                alerts={languageFiltered}
                currentTime={timelineTime}
                onTimeChange={setTimelineTime}
                isPlaying={isTimelinePlaying}
                onTogglePlay={() => setIsTimelinePlaying(!isTimelinePlaying)}
              />
            </div>

          </div>


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
        </div>
      </footer>
    </div>
  );
};

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
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
