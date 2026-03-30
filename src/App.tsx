import { Header } from './components/Header';
import { SatelliteVideo } from './components/SatelliteVideo';
import { AlertSidebar } from './components/AlertSidebar';
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
    <div className="min-h-screen flex flex-col selection:bg-blue-500/30 relative">
      <div className="fixed inset-0 z-0 opacity-60 hover:opacity-100 transition-opacity duration-700">
        <MapView alerts={finalFilteredAlerts} />
      </div>


      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <AlertSidebar alerts={finalFilteredAlerts} />


        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Map + Sidebar Layout */}
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 mb-16 justify-end relative">

              {/* Map Section */}
              {/* Map Title Overlay - Kept for context but smaller/on-top */}
              <div className="absolute top-0 left-0 right-0 p-4 lg:p-0 pointer-events-none">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 bg-slate-900/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 shadow-2xl">
                      <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                      {t('map.title')}
                    </h2>
                  </div>
                  {(selectedEventType || selectedSeverity) && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] font-black uppercase tracking-widest bg-blue-600/30 text-blue-200 px-4 py-2 rounded-xl backdrop-blur-md border border-blue-500/20 shadow-lg"
                    >
                      {t('event.filtered_by')}: {selectedEventType || selectedSeverity}
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Empty space to let map show through */}
              <div className="h-[200px] lg:h-[300px] pointer-events-none"></div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-[420px] flex-shrink-0 lg:pt-14 space-y-6">
              <div className="opacity-40">
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

              {/* Donation Section - Moved to sidebar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-900/40 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group"
              >
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-xl">
                      <CloudRainWind size={18} className="text-blue-400" />
                    </div>
                    <h2 className="text-lg font-black text-white tracking-tight">
                      {t('footer.donate_title') || t('footer.donate')}
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* PayPal */}
                    <form action="https://www.paypal.com/donate" method="post" target="_blank">
                      <input type="hidden" name="business" value="RLBDLZGFL5DRQ" />
                      <input type="hidden" name="no_recurring" value="0" />
                      <input type="hidden" name="item_name" value="Ayúdanos a mejorar el servicio" />
                      <input type="hidden" name="currency_code" value="EUR" />
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-white text-[10px] font-black transition-all shadow-lg uppercase tracking-widest"
                      >
                        PayPal {t('footer.donate')}
                      </button>
                    </form>

                    {/* Buy Me a Coffee */}
                    <a
                      href="https://buymeacoffee.com/alertasmeteo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black transition-all border border-white/10 uppercase tracking-widest"
                    >
                      <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="BMC" className="h-4" />
                      <span>{t('footer.donate_bmc')}</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>


            {/* Satellite Video Section */}
            <SatelliteVideo />
          </motion.div>
        </main>

        <footer className="py-12 glass border-t border-white/5 mt-auto text-center relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-slate-400 text-sm font-bold tracking-tight relative z-10">
            <p>© {new Date().getFullYear()} — <span className="text-gradient font-black">Visualizador de Alertas AEMET</span></p>
          </div>
        </footer>
      </div>
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

