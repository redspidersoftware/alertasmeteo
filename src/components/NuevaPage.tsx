import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAlerts, getNationalPrediction } from '../services/aemet';
import { updateUser, saveUser } from '../services/userService';
import { supabase } from '../lib/supabase';
import type { WeatherAlert, NationalPrediction } from '../types';
import { MapView } from './MapView';
import { motion, AnimatePresence } from 'framer-motion';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useDarkMode } from '../hooks/useDarkMode';

type Tab = 'map' | 'info' | 'alertas' | 'settings';
type AuthState = 'login' | 'register';

export const NuevaPage = () => {
  const { user, login, loginWithGoogle, logout, refreshProfile } = useAuth();
  const { status: pushStatus, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications(user?.id ?? null);
  const { installState, install: installApp, isIOS } = useInstallPrompt();
  const { dark: darkMode, toggle: toggleDarkMode } = useDarkMode();
  const { t } = useLanguage();

  // Modales de servicio
  const [showToSModal, setShowToSModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  // Navigation State
  const [currentTab, setCurrentTab] = useState<Tab>('map');
  const [authState, setAuthState] = useState<AuthState>('login');
  const [selectedAlert, setSelectedAlert] = useState<WeatherAlert | null>(null);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // phone acts as password
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regTerms, setRegTerms] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // Alerts State
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  // Alerts in the user's own postal code zone
  const [userZoneAlerts, setUserZoneAlerts] = useState<WeatherAlert[]>([]);

  // National Prediction State
  const [prediction, setPrediction] = useState<NationalPrediction | null>(null);

  // Settings view local states (bound to Supabase profile)
  const [prefSeverities, setPrefSeverities] = useState<string[]>(['yellow', 'orange', 'red']);
  const [prefPhenomena, setPrefPhenomena] = useState<string[]>(['viento', 'lluvia', 'nieve']);
  const [postalCodeInput, setPostalCodeInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fonts & Material Symbols are loaded globally from index.html

  // Fetch real AEMET alerts (exclude green/Minor and non-Spanish)
  useEffect(() => {
    if (user) {
      getAlerts().then(data => setAlerts(data.filter(a => a.severity !== 'green' && a.language.startsWith('es'))));
      const interval = setInterval(() => {
        getAlerts().then(data => setAlerts(data.filter(a => a.severity !== 'green' && a.language.startsWith('es'))));
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // When alerts or user postal code change, compute user zone alerts
  useEffect(() => {
    if (!user?.postalCode || alerts.length === 0) {
      setUserZoneAlerts([]);
      return;
    }
    (async () => {
      const { data: mappingData } = await supabase
        .from('postal_code_mapping')
        .select('aemet_zone_name')
        .eq('postal_code', user.postalCode);
      if (!mappingData || mappingData.length === 0) {
        setUserZoneAlerts([]);
        return;
      }
      const userZones = new Set(mappingData.map((m: { aemet_zone_name: string }) => m.aemet_zone_name.toLowerCase()));
      setUserZoneAlerts(alerts.filter(a => userZones.has((a.area || '').toLowerCase())));
    })();
  }, [alerts, user?.postalCode]);

  // Deep-link from push notification: read ?alert=ID or ?tab=alertas
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const alertId = params.get('alert');
    const tab = params.get('tab');

    if (alertId) {
      const found = alerts.find(a => a.id === alertId);
      if (found) {
        setSelectedAlert(found);
        setCurrentTab('alertas');
      } else {
        // Alert ID not found in filtered list, just go to alertas tab
        setCurrentTab('alertas');
      }
      // Clean URL params so it doesn't re-trigger on refresh
      window.history.replaceState({}, '', window.location.pathname);
    } else if (tab === 'alertas') {
      setCurrentTab('alertas');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [alerts]);

  // Fetch National Prediction when info tab is active
  useEffect(() => {
    if (user && currentTab === 'info') {
      getNationalPrediction().then(setPrediction);
    }
  }, [user, currentTab]);

  // Load user settings preferences
  useEffect(() => {
    if (user) {
      if (user.preferredSeverities) {
        setPrefSeverities(user.preferredSeverities);
      }
      if (user.preferredEventTypes) {
        setPrefPhenomena(user.preferredEventTypes);
      }
      if (user.postalCode) {
        setPostalCodeInput(user.postalCode);
      }
      
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.user_metadata?.avatar_url) {
          setAvatarUrl(data.user.user_metadata.avatar_url);
        } else if (data.user?.user_metadata?.picture) {
          setAvatarUrl(data.user.user_metadata.picture);
        }
      });
    }
  }, [user]);

  // Google Login handler
  const handleGoogleLogin = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Error al iniciar sesión con Google.');
      setLoading(false);
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const ok = await login(email, password);
      if (!ok) {
        setAuthError(t('login.error.creds') || 'Credenciales incorrectas');
      }
    } catch (err) {
      setAuthError('Error de autenticación. Intente de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (regPassword !== regConfirmPassword) {
      setAuthError('Las contraseñas no coinciden.');
      return;
    }
    if (!regTerms) {
      setAuthError('Debe aceptar los términos de servicio.');
      return;
    }

    setLoading(true);
    try {
      await saveUser({
        name: regName,
        email: regEmail,
        phone: '', 
        postalCode: '28001',
        language: 'es',
      }, regPassword);
      setRegSuccess(true);
      setTimeout(() => {
        setAuthState('login');
        setEmail(regEmail);
        setPassword(regPassword);
        setRegSuccess(false);
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setAuthError(null);
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message || 'Error al crear la cuenta.');
      } else {
        setAuthError('Error al crear la cuenta.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle user severity preference
  const handleSeverityToggle = (severity: string) => {
    let newSeverities = [...prefSeverities];
    if (newSeverities.includes(severity)) {
      newSeverities = newSeverities.filter(s => s !== severity);
    } else {
      newSeverities.push(severity);
    }
    setPrefSeverities(newSeverities);
  };

  // Toggle user phenomenon preference
  const handlePhenomenonToggle = (phenomenon: string) => {
    let newPhenomena = [...prefPhenomena];
    if (newPhenomena.includes(phenomenon)) {
      newPhenomena = newPhenomena.filter(p => p !== phenomenon);
    } else {
      newPhenomena.push(phenomenon);
    }
    setPrefPhenomena(newPhenomena);
  };

  // Update user postal code in local state
  const handlePostalCodeUpdate = (val: string) => {
    setPostalCodeInput(val);
  };

  // Save all settings to backend
  const handleSaveChanges = async () => {
    if (!user?.id) return;
    try {
      await updateUser(user.id, {
        preferredSeverities: prefSeverities,
        preferredEventTypes: prefPhenomena,
        postalCode: postalCodeInput
      });
      await refreshProfile();
      alert("Tus cambios se han guardado correctamente.");
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Error al guardar los ajustes.");
    }
  };

  // Filter alerts by search query (e.g. municipality or province)
  const filteredAlerts = alerts;

  // Share an alert
  const shareAlert = async (alert: WeatherAlert) => {
    const severityLabel = alert.severity === 'red' ? 'ROJA' : alert.severity === 'orange' ? 'NARANJA' : 'AMARILLA';
    const text = `⚠️ ALERTA ${severityLabel}: ${alert.event}\n📍 ${alert.area}\n\n${alert.description ? alert.description.substring(0, 200) + '...' : ''}\n\n🔗 Ver en MeteoAlerta: https://alertas-meteo.vercel.app/?alert=${encodeURIComponent(alert.id)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Alerta ${severityLabel}: ${alert.event}`, text });
        return;
      } catch {
        // User cancelled or error, fall through
      }
    }

    // Fallback: show share options modal-style via prompt
    window.prompt('Copia el texto para compartir:', text);
  };

  const shareAlertWhatsApp = (alert: WeatherAlert) => {
    const severityLabel = alert.severity === 'red' ? 'ROJA' : alert.severity === 'orange' ? 'NARANJA' : 'AMARILLA';
    const text = `⚠️ ALERTA ${severityLabel}: ${alert.event}\n📍 ${alert.area}\n\n🔗 Ver: https://alertas-meteo.vercel.app/?alert=${encodeURIComponent(alert.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareAlertTelegram = (alert: WeatherAlert) => {
    const severityLabel = alert.severity === 'red' ? 'ROJA' : alert.severity === 'orange' ? 'NARANJA' : 'AMARILLA';
    const text = `⚠️ ALERTA ${severityLabel}: ${alert.event}\n📍 ${alert.area}\n\n🔗 Ver: https://alertas-meteo.vercel.app/?alert=${encodeURIComponent(alert.id)}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://alertas-meteo.vercel.app/?alert=' + alert.id)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyAlertLink = (alert: WeatherAlert) => {
    navigator.clipboard.writeText(`https://alertas-meteo.vercel.app/?alert=${encodeURIComponent(alert.id)}`);
    window.alert('Enlace copiado al portapapeles.');
  };



  // Format date helper for "Hoy, 14 Mayo" style
  const getFormattedDate = () => {
    const date = new Date();
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'short' });
    return `Hoy, ${day} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
  };

  return (
    <div className="font-['Hanken_Grotesk'] text-[#181c20] min-h-screen bg-[#f7f9ff] flex flex-col relative select-none">
      {/* Dynamic inline styles for design system values */}
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          vertical-align: middle;
        }
        .login-card {
          box-shadow: 0px 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #E9ECEF;
        }
        .active-alert-indicator {
          width: 6px;
          flex-shrink: 0;
        }
        .map-container {
          min-height: 450px;
          position: relative;
          overflow: hidden;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f4f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c2c6d4;
          border-radius: 3px;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(233, 236, 239, 1);
        }
        .glass-overlay {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(8px);
        }
        .urgent-pulse {
            animation: pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-border {
            0%, 100% { border-color: rgba(255, 152, 0, 0.4); }
            50% { border-color: rgba(255, 152, 0, 1); }
        }
        .raindrop {
            position: absolute;
            background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(172,199,255,0.4) 100%);
            width: 1.5px;
            height: 40px;
            top: -50px;
            animation: fall linear infinite;
        }
        @keyframes fall {
            to {
                transform: translateY(350px) translateX(15px);
            }
        }
        .snowdrop {
            position: absolute;
            background: white;
            border-radius: 50%;
            width: 4px;
            height: 4px;
            top: -10px;
            animation: fall-snow linear infinite;
            opacity: 0.8;
            box-shadow: 0 0 4px rgba(255,255,255,0.8);
        }
        @keyframes fall-snow {
            to { transform: translateY(350px) translateX(30px) rotate(360deg); }
        }
        .windline {
            position: absolute;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
            height: 2px;
            width: 80px;
            left: -100px;
            animation: blow-wind linear infinite;
        }
        @keyframes blow-wind {
            to { transform: translateX(800px); }
        }
        @keyframes lightning {
            0%, 95%, 98% { background-color: transparent; }
            96%, 99% { background-color: rgba(255, 255, 255, 0.4); }
        }
        .lightning-flash {
            animation: lightning 6s infinite;
        }
      `}</style>

      {/* Helper Component for Rain */}
      {currentTab === 'alertas' && selectedAlert?.event?.toLowerCase().includes('lluvia') && (
        <div style={{ display: 'none' }}></div>
      )}

      <AnimatePresence mode="wait">
        {!user ? (
          authState === 'login' ? (
            /* ======================================================== */
            /* ─────────────── LOGIN SCREEN (STITCH STYLE) ───────────── */
            /* ======================================================== */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="flex-grow flex flex-col items-center justify-center p-5 bg-[#f7f9ff]"
            >
              <main className="w-full max-w-[440px] flex flex-col gap-6">
                {/* Header / Brand Section */}
                <header className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-[#e0e3e8] flex items-center justify-center p-1 overflow-hidden shadow-sm">
                    <img
                      alt="MeteoAlerta España Logo"
                      className="w-full h-full object-contain"
                      src="https://lh3.googleusercontent.com/aida/AP1WRLveR4U1EzLSoPjIP7wHXc7yfyOrWNt6p8d_2Msn90UcNJKUyVo8PLl1oWka4NG7Vmi957kC3R-2eLMGSReACq2DPgdvLGWqe0JaV_9_D4gRHezCk3CGUesVcH5bIkcrL_yPFR2NVjHw2gIkwli7vm-2P-RIV0NqAExALdE01vR73Q4gDeKzoqwsjQLzZcaeEsk7y5rcXwKLzS6ARyvJVGoUP5odV4kYOzUIU63TfOjH0u0iRhwSmCmbOg"
                    />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#003f87] tracking-tight">
                      MeteoAlerta España
                    </h1>
                    <p className="text-sm text-[#424752] max-w-[320px] mx-auto font-medium">
                      Accede a la red oficial de alertas meteorológicas y protección civil en tiempo real.
                    </p>
                  </div>
                </header>

                {/* Login Card */}
                <section className="bg-white login-card rounded-xl p-6 flex flex-col gap-6">
                  <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                    {/* Email Input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#181c20] ml-1" htmlFor="email">
                        Correo electrónico
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">
                          mail
                        </span>
                        <input
                          className="w-full pl-11 pr-4 py-3 bg-[#f7f9ff] border border-[#c2c6d4] rounded-lg text-sm text-[#181c20] focus:outline-none focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all"
                          id="email"
                          type="email"
                          placeholder="ejemplo@correo.es"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-semibold text-[#181c20]" htmlFor="password">
                          Contraseña
                        </label>
                        <a href="#" className="text-xs text-[#003f87] hover:underline font-semibold transition-all">
                          ¿Olvidaste tu contraseña?
                        </a>
                      </div>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">
                          lock
                        </span>
                        <input
                          className="w-full pl-11 pr-11 py-3 bg-[#f7f9ff] border border-[#c2c6d4] rounded-lg text-sm text-[#181c20] focus:outline-none focus:border-[#003f87] focus:ring-1 focus:ring-[#003f87] transition-all"
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#727784] hover:text-[#424752] transition-colors"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <span className="material-symbols-outlined">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Error Alert */}
                    {authError && (
                      <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 p-3 rounded-lg flex items-start gap-2 text-[#93000a] text-xs font-semibold">
                        <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5">error</span>
                        <p>{authError}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      className="w-full mt-2 py-3 bg-[#003f87] text-white font-bold text-sm rounded-lg shadow-sm hover:bg-[#0056b3] transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Iniciar Sesión</span>
                          <span className="material-symbols-outlined">login</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-[1px] bg-[#c2c6d4]/50"></div>
                    <span className="text-[10px] font-bold text-[#727784] uppercase tracking-widest">
                      o continuar con
                    </span>
                    <div className="flex-1 h-[1px] bg-[#c2c6d4]/50"></div>
                  </div>

                  {/* Google Sign In */}
                  <button 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    type="button"
                    className="w-full py-3 bg-[#f7f9ff] border border-[#c2c6d4] rounded-lg text-sm text-[#181c20] font-semibold flex items-center justify-center gap-3 hover:bg-[#ebeef3] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <svg height="18" viewBox="0 0 24 24" width="18">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      ></path>
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      ></path>
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      ></path>
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      ></path>
                    </svg>
                    <span>Google</span>
                  </button>

                  <p className="text-center text-sm text-[#424752]">
                    ¿No tienes una cuenta?{' '}
                    <button
                      onClick={() => {
                        setAuthState('register');
                        setAuthError(null);
                      }}
                      className="text-[#003f87] font-bold hover:underline"
                    >
                      Crear una cuenta nueva
                    </button>
                  </p>
                </section>

                {/* Footer Links */}
                <footer className="mt-4 flex flex-col items-center gap-2">
                  <div className="flex gap-4 flex-wrap justify-center text-xs">
                    <button onClick={() => setShowToSModal(true)} className="text-[#727784] hover:text-[#424752] transition-colors cursor-pointer bg-transparent border-none p-0 font-inherit text-xs">
                      Términos de servicio
                    </button>
                    <button onClick={() => setShowPrivacyModal(true)} className="text-[#727784] hover:text-[#424752] transition-colors cursor-pointer bg-transparent border-none p-0 font-inherit text-xs">
                      Política de privacidad
                    </button>
                    <button onClick={() => setShowSupportModal(true)} className="text-[#727784] hover:text-[#424752] transition-colors cursor-pointer bg-transparent border-none p-0 font-inherit text-xs">
                      Soporte técnico
                    </button>
                  </div>
                  <p className="text-[10px] text-[#c2c6d4] font-medium">
                    © 2026 MeteoAlerta España. Todos los derechos reservados.
                  </p>
                </footer>
              </main>
            </motion.div>
          ) : (
            /* ======================================================== */
            /* ─────────────── REGISTER SCREEN (STITCH STYLE) ────────── */
            /* ======================================================== */
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="flex-grow flex flex-col items-center justify-center p-5 bg-[#f7f9ff]"
            >
              <main className="w-full max-w-[460px] flex flex-col gap-6">
                <header className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 bg-[#0056b3] rounded-xl flex items-center justify-center text-white shadow-lg">
                    <span className="material-symbols-outlined !text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      warning
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[#003f87] tracking-tight">
                    MeteoAlerta España
                  </h1>
                  <p className="text-xs text-[#424752] font-semibold max-w-[320px]">
                    Únete a la red de alertas meteorológicas líder para recibir avisos críticos en tiempo real.
                  </p>
                </header>

                <section className="bg-white glass-panel rounded-xl shadow-sm p-6 border-l-4 border-[#003f87] transition-all">
                  {regSuccess ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <span className="material-symbols-outlined text-green-500 text-5xl animate-bounce">
                        check_circle
                      </span>
                      <h3 className="text-md font-bold text-[#181c20] mt-4">¡Cuenta creada con éxito!</h3>
                      <p className="text-xs text-[#727784] mt-1">Redirigiendo a iniciar sesión...</p>
                    </div>
                  ) : (
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#424752] uppercase tracking-wider">
                          Nombre Completo
                        </label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">
                            person
                          </span>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Juan Pérez"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#c2c6d4] bg-white text-sm focus:outline-none focus:border-[#003f87] transition-all"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#424752] uppercase tracking-wider">
                          Email
                        </label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">
                            mail
                          </span>
                          <input
                            type="email"
                            required
                            placeholder="tu@email.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#c2c6d4] bg-white text-sm focus:outline-none focus:border-[#003f87] transition-all"
                          />
                        </div>
                      </div>

                      {/* Password inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#424752] uppercase tracking-wider">
                            Contraseña
                          </label>
                          <div className="relative group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">
                              lock
                            </span>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#c2c6d4] bg-white text-sm focus:outline-none focus:border-[#003f87] transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#424752] uppercase tracking-wider">
                            Confirmar
                          </label>
                          <div className="relative group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727784] group-focus-within:text-[#003f87] transition-colors">
                              lock_reset
                            </span>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={regConfirmPassword}
                              onChange={(e) => setRegConfirmPassword(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#c2c6d4] bg-white text-sm focus:outline-none focus:border-[#003f87] transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="flex items-start gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={regTerms}
                          onChange={(e) => setRegTerms(e.target.checked)}
                          className="mt-1 rounded border-[#c2c6d4] text-[#003f87] focus:ring-[#003f87] h-4 w-4"
                          required
                        />
                        <label htmlFor="terms" className="text-[10px] text-[#424752] leading-snug">
                          Acepto los <a href="#" className="text-[#003f87] hover:underline font-bold">términos de servicio</a> y la <a href="#" className="text-[#003f87] hover:underline font-bold">política de privacidad</a> para recibir avisos de Protección Civil.
                        </label>
                      </div>

                      {/* Error Alert */}
                      {authError && (
                        <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 p-3 rounded-lg flex items-start gap-2 text-[#93000a] text-xs font-semibold">
                          <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5">error</span>
                          <p>{authError}</p>
                        </div>
                      )}

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#003f87] text-white font-bold text-sm py-3 rounded-xl shadow-sm hover:bg-[#0056b3] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                      >
                        <span>Crear Cuenta</span>
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </button>
                    </form>
                  )}
                </section>

                <div className="text-center">
                  <p className="text-xs text-[#424752]">
                    ¿Ya tienes una cuenta?{' '}
                    <button
                      onClick={() => {
                        setAuthState('login');
                        setAuthError(null);
                      }}
                      className="text-[#003f87] font-bold hover:underline"
                    >
                      Inicia Sesión
                    </button>
                  </p>
                </div>
              </main>
            </motion.div>
          )
        ) : (
          /* ======================================================== */
          /* ─────────────── MAIN VIEW CONTAINER (WITH TABS) ───────── */
          /* ======================================================== */
          <div key="app-shell" className="flex flex-col flex-grow w-full min-h-screen">
            
            {/* Content Body: Sidebar Navigation + Tab Contents */}
            <div className="flex-grow flex flex-row relative min-h-[100dvh]">
              
              {/* ── LEFT DESKTOP SIDEBAR NAVIGATION (ICON-ONLY) ── */}
              <aside className="hidden md:flex flex-col bg-[#f1f4f9] border-r border-[#c2c6d4]/20 w-16 lg:w-20 py-6 items-center justify-between flex-shrink-0 z-10">
                <nav className="flex flex-col gap-5 items-center w-full">
                  <button
                    onClick={() => setCurrentTab('map')}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      currentTab === 'map'
                        ? 'bg-[#0056b3] text-white shadow-md'
                        : 'text-[#424752] hover:bg-[#ebeef3] hover:text-[#181c20]'
                    }`}
                    title="Mapa de Alertas"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTab === 'map' ? 1 : 0}` }}>map</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('info')}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      currentTab === 'info'
                        ? 'bg-[#0056b3] text-white shadow-md'
                        : 'text-[#424752] hover:bg-[#ebeef3] hover:text-[#181c20]'
                    }`}
                    title="Información y Soporte"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTab === 'info' ? 1 : 0}` }}>info</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('alertas')}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative ${
                      currentTab === 'alertas'
                        ? 'bg-[#0056b3] text-white shadow-md'
                        : 'text-[#424752] hover:bg-[#ebeef3] hover:text-[#181c20]'
                    }`}
                    title="Detalle de Alertas"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTab === 'alertas' ? 1 : 0}` }}>notifications_active</span>
                    {filteredAlerts.length > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#ba1a1a] rounded-full animate-pulse"></span>
                    )}
                  </button>

                  <button
                    onClick={() => setCurrentTab('settings')}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      currentTab === 'settings'
                        ? 'bg-[#0056b3] text-white shadow-md'
                        : 'text-[#424752] hover:bg-[#ebeef3] hover:text-[#181c20]'
                    }`}
                    title="Ajustes"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTab === 'settings' ? 1 : 0}` }}>settings</span>
                  </button>
                </nav>

                <div className="flex flex-col gap-4 items-center">
                  <button
                    onClick={toggleDarkMode}
                    className="w-10 h-10 rounded-xl hover:bg-[#ebeef3] text-[#424752] flex items-center justify-center transition-colors"
                    title={darkMode ? 'Modo claro' : 'Modo oscuro'}
                  >
                    <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('¿Desea cerrar sesión?')) {
                        await logout();
                      }
                    }}
                    className="w-10 h-10 rounded-xl hover:bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center transition-colors"
                    title="Cerrar sesión"
                  >
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                </div>
              </aside>

              {/* ── TAB VIEW CONTENTS ── */}
              <div className="flex-grow p-4 sm:p-6 lg:p-8 pb-20 md:pb-6 overflow-y-auto w-full max-w-[1600px] mx-auto">
                <AnimatePresence mode="wait">
                  {currentTab === 'map' && (
                    /* ───────────────── TAB: MAP ───────────────── */
                    <motion.div
                      key="tab-map"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex flex-col lg:flex-row gap-6 h-full"
                    >
                      <div className="flex-grow w-full lg:w-2/3 flex flex-col gap-6">
                        {/* Map Container */}
                        <section className="w-full h-[400px] md:h-[500px] lg:h-[600px] relative rounded-xl overflow-hidden shadow-md bg-[#ebeef3] border border-[#c2c6d4]/30">
                          <div className="absolute inset-0 z-0">
                            <MapView 
                              alerts={filteredAlerts} 
                              onSelectAlert={(alert) => {
                                setSelectedAlert(alert);
                                setCurrentTab('alertas');
                              }} 
                            />
                          </div>
                          <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
                            <button className="w-10 h-10 rounded-lg shadow-md bg-white text-[#003f87] flex items-center justify-center border border-[#c2c6d4]/30 hover:bg-[#d7e2ff] transition-all">
                              <span className="material-symbols-outlined">add</span>
                            </button>
                            <button className="w-10 h-10 rounded-lg shadow-md bg-white text-[#003f87] flex items-center justify-center border border-[#c2c6d4]/30 hover:bg-[#d7e2ff] transition-all">
                              <span className="material-symbols-outlined">remove</span>
                            </button>
                            <button className="w-10 h-10 rounded-lg shadow-md bg-white text-[#003f87] flex items-center justify-center border border-[#c2c6d4]/30 hover:bg-[#d7e2ff] transition-all">
                              <span className="material-symbols-outlined">my_location</span>
                            </button>
                          </div>
                          <div className="absolute left-4 bottom-4 z-10 glass-overlay px-4 py-2.5 rounded-xl shadow-sm border border-white/20">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#424752] mb-1.5">
                              RIESGO METEOROLÓGICO
                            </h4>
                            <div className="flex gap-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></div>
                                <span className="text-[9px] font-extrabold uppercase text-[#ba1a1a]">EXTREMO</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></div>
                                <span className="text-[9px] font-extrabold uppercase text-[#f97316]">IMPORTANTE</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
                                <span className="text-[9px] font-extrabold uppercase text-[#eab308]">RIESGO</span>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* Radar Satelital */}
                        <section className="w-full">
                          <div className="flex justify-between items-end mb-2">
                            <h2 className="text-xl font-bold text-[#003f87]">Radar Satelital</h2>
                          </div>
                          <div className="relative rounded-lg overflow-hidden shadow-lg bg-[#ebeef3] border border-[#c2c6d4]/30">
                            <video autoPlay className="w-full h-auto block" loop muted playsInline>
                              <source src="https://api.met.no/weatherapi/geosatellite/1.4/europe.mp4" type="video/mp4"/>
                              Tu navegador no soporta videos.
                            </video>
                          </div>
                        </section>
                      </div>

                      {/* Alerts list */}
                      <aside className="w-full lg:w-1/3 flex flex-col gap-4">
                        <div className="flex justify-between items-end border-b border-[#c2c6d4]/20 pb-2">
                          <h2 className="text-sm font-extrabold text-[#003f87] tracking-tight uppercase">Alertas Activas</h2>
                          <span className="text-[11px] font-bold text-[#424752]">{getFormattedDate()}</span>
                        </div>

                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[350px] md:max-h-[450px] lg:max-h-[600px] pr-1.5 custom-scrollbar">
                          {filteredAlerts.length === 0 ? (
                            <div className="bg-[#ebeef3]/60 border border-[#c2c6d4]/40 rounded-xl p-8 text-center text-[#424752]">
                              <span className="material-symbols-outlined text-3xl text-[#727784] mb-2">check_circle</span>
                              <p className="text-sm font-semibold">Sin alertas activas</p>
                              <p className="text-xs text-[#727784] mt-1">No hay alertas meteorológicas vigentes para los filtros seleccionados.</p>
                            </div>
                          ) : (
                            filteredAlerts.map((alert) => {
                              let severityBg = 'bg-[#eab308]';
                              let badgeText = 'NIVEL AMARILLO';
                              let badgeTextColors = 'text-[#001a40] bg-[#ffea85]';
                              let iconColor = 'text-[#eab308]';

                              if (alert.severity === 'red') {
                                severityBg = 'bg-[#ba1a1a]';
                                badgeText = 'NIVEL ROJO';
                                badgeTextColors = 'text-white bg-[#ba1a1a]';
                                iconColor = 'text-[#ba1a1a]';
                              } else if (alert.severity === 'orange') {
                                severityBg = 'bg-[#f97316]';
                                badgeText = 'NIVEL NARANJA';
                                badgeTextColors = 'text-white bg-[#f97316]';
                                iconColor = 'text-[#f97316]';
                              }

                              let iconName = 'warning';
                              const evt = alert.event?.toLowerCase() || '';
                              if (evt.includes('lluvia')) iconName = 'rainy';
                              else if (evt.includes('tormenta')) iconName = 'thunderstorm';
                              else if (evt.includes('nieve') || evt.includes('nevad')) iconName = 'ac_unit';
                              else if (evt.includes('temperatura') || evt.includes('calor') || evt.includes('frío') || evt.includes('hielo')) iconName = 'device_thermostat';
                              else if (evt.includes('viento') || evt.includes('costero') || evt.includes('galerna') || evt.includes('oleaje')) iconName = 'air';

                              return (
                                <article
                                  key={alert.id}
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setCurrentTab('alertas');
                                  }}
                                  className="bg-white rounded-xl shadow-sm border border-[#c2c6d4]/30 flex flex-shrink-0 min-h-[120px] overflow-hidden hover:shadow-md transition-all duration-200 group cursor-pointer active:scale-[0.98]"
                                >
                                  <div className={`active-alert-indicator ${severityBg}`}></div>
                                  <div className="p-4 flex-grow flex flex-col justify-between">
                                    <div>
                                      <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${badgeTextColors}`}>
                                          {badgeText}
                                        </span>
                                        <span className={`material-symbols-outlined ${iconColor} group-hover:scale-110 transition-transform`}>
                                          {iconName}
                                        </span>
                                      </div>
                                      <h3 className="text-sm font-bold text-[#181c20] line-clamp-1 mb-1 leading-snug">
                                        {alert.event}
                                      </h3>
                                      <p className="text-[11px] font-semibold text-[#424752] line-clamp-2">
                                        {alert.area}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[#424752] mt-3 border-t border-[#c2c6d4]/10 pt-2 text-[10px] font-semibold">
                                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                                      <span>
                                        Vigente hasta {new Date(alert.expires).toLocaleTimeString('es-ES', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </article>
                              );
                            })
                          )}
                        </div>
                      </aside>
                    </motion.div>
                  )}

                  {currentTab === 'info' && (
                    /* ─────────────── TAB: INFO (INFORMACIÓN Y SOPORTE) ─────────────── */
                    <motion.div
                      key="tab-info"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8 max-w-6xl mx-auto"
                    >
                      <div className="flex justify-between items-center border-b border-[#c2c6d4]/20 pb-4">
                        <h2 className="text-xl md:text-2xl font-extrabold text-[#003f87]">Información y Soporte</h2>
                        <span className="text-xs text-[#727784] font-semibold">MeteoAlerta España</span>
                      </div>

                      {/* Section 1: Predicción Nacional (Bento Layout) */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#003f87]">distance</span>
                          <h3 className="font-bold text-base text-[#181c20]">Predicción Nacional</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Main Prediction Details */}
                          <div className="md:col-span-2 bg-white rounded-2xl p-6 border-l-4 border-[#003f87] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[250px]">
                            {prediction ? (
                              <div className="relative z-10 space-y-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-[10px] font-bold text-[#727784] uppercase tracking-wider">Hoy en la Península</p>
                                    <p className="text-lg font-extrabold text-[#003f87] mt-1">
                                      {prediction.significantPhenomena ? prediction.significantPhenomena.split('.')[0] : 'Estabilidad General'}
                                    </p>
                                  </div>
                                  <span className="material-symbols-outlined text-[#003f87] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_sync</span>
                                </div>
                                <p className="text-xs text-[#424752] leading-relaxed max-w-xl line-clamp-3">
                                  {prediction.generalPrediction || 'Cielos mayormente despejados con algunos intervalos de nubosidad en el tercio norte peninsular.'}
                                </p>
                                <div className="flex flex-wrap gap-2 pt-2">
                                  <span className="flex items-center gap-1 text-[10px] font-bold bg-[#d7e2ff] text-[#001a40] px-3 py-1 rounded-full">
                                    <span className="material-symbols-outlined text-xs">device_thermostat</span> Termómetro Estable
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] font-bold bg-[#ebeef3] text-[#424752] px-3 py-1 rounded-full">
                                    <span className="material-symbols-outlined text-xs">air</span> Viento Moderado
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-[#727784]">
                                <div className="w-6 h-6 border-2 border-[#003f87]/30 border-t-[#003f87] rounded-full animate-spin mb-2" />
                                <p className="text-xs font-semibold">Cargando datos oficiales AEMET...</p>
                              </div>
                            )}
                            <div className="absolute right-[-10%] bottom-[-10%] opacity-5 pointer-events-none">
                              <span className="material-symbols-outlined text-[200px]">map</span>
                            </div>
                          </div>

                          {/* Active Warnings Metric */}
                          <div className="bg-white rounded-2xl p-6 border-l-4 border-[#f97316] shadow-sm flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-[#727784] uppercase tracking-wider block">Avisos Activos</span>
                              <h4 className="text-2xl font-extrabold text-[#181c20] mt-2">
                                {filteredAlerts.length} {filteredAlerts.length === 1 ? 'Aviso' : 'Avisos'}
                              </h4>
                              <p className="text-xs text-[#424752] mt-2 leading-relaxed">
                                {filteredAlerts.length > 0 
                                  ? 'Existen alertas de riesgo meteorológico vigentes según las últimas actualizaciones de AEMET.' 
                                  : 'No hay alertas activas en el territorio nacional con los filtros actuales.'}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (filteredAlerts.length > 0) {
                                  setSelectedAlert(filteredAlerts[0]);
                                }
                                setCurrentTab('alertas');
                              }}
                              className="mt-6 w-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                              <span>Ver Detalles</span>
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </section>

                      {/* Section 2: Qué hacemos (High-End Card) */}
                      <section className="bg-white rounded-2xl border border-[#c2c6d4]/30 overflow-hidden shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                          <div className="relative min-h-[220px] md:h-auto">
                            <img
                              alt="Centro Meteorológico"
                              className="absolute inset-0 w-full h-full object-cover"
                              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4VI4qMDzzJo1rivyrXn0b6D8fvxeRuCOejODN9lgTKiWW1_u9CUVzR5cM1NzGzNdJGvwizFd0SEQFhm7mK1nN5aJZxMpYnWQPpEXFi9S8aH6FxQ2PtmiAckv1oV-mKpIL7Em0ZZTlMbJDisV9GFqj4yg1qrHHhwm0UoGn1ob2wAnYs3ZK7DiPPtduv1NoVT0Qz4N5tCmpP9eRl6ItStpfW5tWKMifZX3KdttFyjc9iSzU2VA8J5HLGWo1KaQ1_ltX2hAhuu3pm-8"
                            />
                            <div className="absolute inset-0 bg-[#003f87]/20 backdrop-grayscale-[0.4]"></div>
                          </div>
                          <div className="p-6 md:p-8 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="material-symbols-outlined text-[#003f87]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                              <h3 className="font-bold text-base text-[#181c20]">Qué hacemos</h3>
                            </div>
                            <p className="text-sm font-semibold text-[#181c20] mb-3 leading-snug">
                              Garantizando la seguridad ciudadana a través de la precisión meteorológica.
                            </p>
                            <p className="text-xs text-[#424752] leading-relaxed mb-4">
                              MeteoAlerta es una plataforma independiente de visualización de riesgos meteorológicos en tiempo real. Integramos datos directos de la <strong>AEMET</strong> y avisos oficiales de <strong>Protección Civil</strong>.
                            </p>
                            <ul className="space-y-2 text-xs text-[#424752] font-semibold">
                              <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-green-600 text-sm mt-0.5">check_circle</span>
                                <span>Actualización continua cada 10 minutos.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-green-600 text-sm mt-0.5">check_circle</span>
                                <span>Avisos de riesgo clasificados según AEMET.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-green-600 text-sm mt-0.5">check_circle</span>
                                <span>Alertas adaptadas con instrucciones de seguridad.</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </section>

                      {/* Section 3: Contacto (Form + Social Channels) */}
                      <section className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        {/* Contact Form */}
                        <div className="md:col-span-3 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#003f87]">mail</span>
                            <h3 className="font-bold text-base text-[#181c20]">Formulario de Soporte</h3>
                          </div>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              alert('Mensaje enviado correctamente. Nos pondremos en contacto a la brevedad.');
                              (e.target as HTMLFormElement).reset();
                            }}
                            className="bg-white p-6 rounded-2xl border border-[#c2c6d4]/30 space-y-4 shadow-sm"
                          >
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#424752] uppercase tracking-wider ml-1" htmlFor="asunto">
                                Asunto
                              </label>
                              <input
                                className="w-full bg-[#f7f9ff] border border-[#c2c6d4] rounded-lg px-4 py-2.5 text-xs text-[#181c20] focus:outline-none focus:border-[#003f87] transition-all"
                                id="asunto"
                                placeholder="Ej: Error en el mapa / Sugerencia"
                                type="text"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#424752] uppercase tracking-wider ml-1" htmlFor="mensaje">
                                Mensaje
                              </label>
                              <textarea
                                className="w-full bg-[#f7f9ff] border border-[#c2c6d4] rounded-lg px-4 py-2.5 text-xs text-[#181c20] focus:outline-none focus:border-[#003f87] transition-all"
                                id="mensaje"
                                placeholder="Escribe tu consulta o reporte aquí..."
                                rows={4}
                                required
                              />
                            </div>
                            <button
                              className="w-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs py-3 rounded-xl shadow-sm transition-all active:scale-[0.98]"
                              type="submit"
                            >
                              Enviar Mensaje
                            </button>
                          </form>
                        </div>

                        {/* Social Channels */}
                        <div className="md:col-span-2 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#003f87]">share</span>
                            <h3 className="font-bold text-base text-[#181c20]">Canales Oficiales</h3>
                          </div>
                          <div className="space-y-3">
                            <a
                              href="https://twitter.com/AlertasMeteoES"
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-4 bg-white border border-[#c2c6d4]/30 rounded-2xl hover:bg-[#f7f9ff] transition-all shadow-sm group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2]">
                                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-bold text-xs text-[#181c20]">X (Twitter)</p>
                                  <p className="text-[10px] text-[#727784] font-semibold">@AlertasMeteoES</p>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[#727784] text-sm group-hover:text-[#003f87]">open_in_new</span>
                            </a>
                            
                            <a
                              href="https://t.me/alertasMeteoBot"
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-4 bg-white border border-[#c2c6d4]/30 rounded-2xl hover:bg-[#f7f9ff] transition-all shadow-sm group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc]">
                                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.75 3.81-1.65 6.35-2.75 7.61-3.3 3.61-1.56 4.36-1.83 4.85-1.84.11 0 .35.03.5.16.13.12.17.28.18.39.01.07.01.14 0 .2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-bold text-xs text-[#181c20]">Telegram</p>
                                  <p className="text-[10px] text-[#727784] font-semibold">@alertasMeteoBot</p>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[#727784] text-sm group-hover:text-[#003f87]">open_in_new</span>
                            </a>
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {currentTab === 'alertas' && (
                    /* ─────────────── TAB: ALERTAS (DETALLE DE ALERTA) ─────────────── */
                    <motion.div
                      key="tab-alertas"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-6 max-w-4xl mx-auto"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() => setCurrentTab('map')}
                          className="flex items-center gap-1.5 text-[#003f87] font-bold text-xs hover:underline transition-all bg-white px-3 py-1.5 rounded-lg border border-[#c2c6d4]/30 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_back</span>
                          <span>Volver al Mapa</span>
                        </button>
                      </div>

                      {selectedAlert ? (
                        <div className="space-y-6">
                          {/* Hero Alert Card */}
                          <section className={`relative bg-white rounded-2xl border-2 border-l-[10px] shadow-sm overflow-hidden transition-all ${selectedAlert.severity === 'orange' || selectedAlert.severity === 'red' ? 'urgent-pulse' : ''}`}
                            style={{
                              borderColor: selectedAlert.severity === 'red' ? '#ba1a1a' : selectedAlert.severity === 'orange' ? '#f97316' : '#eab308'
                            }}
                          >
                            {/* Effects Container */}
                            <div className={`pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl ${selectedAlert.event?.toLowerCase().includes('tormenta') ? 'lightning-flash' : ''}`}>
                              {/* Rain Effect */}
                              {(selectedAlert.event?.toLowerCase().includes('lluvia') || selectedAlert.event?.toLowerCase().includes('tormenta')) && (
                                Array.from({ length: 30 }).map((_, i) => (
                                  <div key={`rain-${i}`} className="raindrop" style={{
                                    left: `${Math.random() * 100}%`,
                                    animationDuration: `${0.4 + Math.random() * 0.5}s`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    opacity: 0.2 + Math.random() * 0.4
                                  }} />
                                ))
                              )}
                              {/* Snow Effect */}
                              {(selectedAlert.event?.toLowerCase().includes('nieve') || selectedAlert.event?.toLowerCase().includes('nevad')) && (
                                Array.from({ length: 40 }).map((_, i) => (
                                  <div key={`snow-${i}`} className="snowdrop" style={{
                                    left: `${Math.random() * 100}%`,
                                    animationDuration: `${2 + Math.random() * 3}s`,
                                    animationDelay: `${Math.random() * 5}s`,
                                    width: `${3 + Math.random() * 3}px`,
                                    height: `${3 + Math.random() * 3}px`,
                                    opacity: 0.4 + Math.random() * 0.6
                                  }} />
                                ))
                              )}
                              {/* Wind Effect */}
                              {(selectedAlert.event?.toLowerCase().includes('viento') || selectedAlert.event?.toLowerCase().includes('costero') || selectedAlert.event?.toLowerCase().includes('galerna')) && (
                                Array.from({ length: 15 }).map((_, i) => (
                                  <div key={`wind-${i}`} className="windline" style={{
                                    top: `${Math.random() * 100}%`,
                                    animationDuration: `${0.5 + Math.random() * 1.5}s`,
                                    animationDelay: `${Math.random() * 3}s`,
                                    width: `${40 + Math.random() * 80}px`,
                                    opacity: 0.3 + Math.random() * 0.5
                                  }} />
                                ))
                              )}
                            </div>
                            
                            <div className="relative z-10 px-5 py-3 flex justify-between items-center border-b border-[#c2c6d4]/10 bg-slate-50/50">
                              <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-full animate-ping"
                                  style={{
                                    backgroundColor: selectedAlert.severity === 'red' ? '#ba1a1a' : selectedAlert.severity === 'orange' ? '#f97316' : '#eab308'
                                  }}
                                />
                                <span className="text-[10px] font-bold uppercase tracking-widest"
                                  style={{
                                    color: selectedAlert.severity === 'red' ? '#ba1a1a' : selectedAlert.severity === 'orange' ? '#f97316' : '#854d0e'
                                  }}
                                >
                                  Aviso Nivel {selectedAlert.severity === 'red' ? 'Rojo' : selectedAlert.severity === 'orange' ? 'Naranja' : 'Amarillo'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-[#c2c6d4]/20 text-[10px] font-semibold text-[#424752]">
                                  <span className="material-symbols-outlined text-xs">schedule</span>
                                  <span className="hidden sm:inline">Expira: {new Date(selectedAlert.expires).toLocaleDateString('es-ES')} • {new Date(selectedAlert.expires).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="sm:hidden">{new Date(selectedAlert.expires).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <button
                                  onClick={() => shareAlert(selectedAlert)}
                                  className="flex items-center gap-1 bg-[#003f87] text-white px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-[#0056b3] transition-all"
                                  title="Compartir alerta"
                                >
                                  <span className="material-symbols-outlined text-xs">share</span>
                                  <span className="hidden sm:inline">Compartir</span>
                                </button>
                              </div>
                            </div>
                            <div className="relative z-10 p-6 space-y-4">
                              <div>
                                <h3 className="text-xl font-extrabold text-[#181c20] leading-tight">{selectedAlert.event}</h3>
                                <div className="flex items-center gap-1.5 text-[#003f87] font-bold mt-1.5">
                                  <span className="material-symbols-outlined text-xs">location_on</span>
                                  <span className="text-xs uppercase">{selectedAlert.area}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#f7f9ff]/80 backdrop-blur-[2px] p-4 rounded-xl border border-[#c2c6d4]/30">
                                  <p className="text-[9px] font-bold uppercase text-[#727784] tracking-wider mb-1">Severidad</p>
                                  <p className="text-lg font-extrabold text-[#003f87] capitalize">
                                    {selectedAlert.severity === 'red' ? 'Rojo' : selectedAlert.severity === 'orange' ? 'Naranja' : 'Amarillo'}
                                  </p>
                                </div>
                                <div className="bg-[#f7f9ff]/80 backdrop-blur-[2px] p-4 rounded-xl border border-[#c2c6d4]/30">
                                  <p className="text-[9px] font-bold uppercase text-[#727784] tracking-wider mb-1">Fenómeno</p>
                                  <p className="text-lg font-extrabold text-[#003f87] capitalize">{selectedAlert.event || 'Meteorológico'}</p>
                                </div>
                              </div>
                              {/* Share buttons row */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  onClick={() => shareAlert(selectedAlert)}
                                  className="flex items-center gap-1.5 bg-[#f7f9ff] border border-[#c2c6d4]/40 px-3 py-2 rounded-lg text-[11px] font-bold text-[#424752] hover:bg-[#ebeef3] hover:border-[#003f87]/40 transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm text-[#003f87]">ios_share</span>
                                  Compartir
                                </button>
                                <button
                                  onClick={() => shareAlertWhatsApp(selectedAlert)}
                                  className="flex items-center gap-1.5 bg-[#25d366]/10 border border-[#25d366]/30 px-3 py-2 rounded-lg text-[11px] font-bold text-[#128c7e] hover:bg-[#25d366]/20 transition-all"
                                >
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                  WhatsApp
                                </button>
                                <button
                                  onClick={() => shareAlertTelegram(selectedAlert)}
                                  className="flex items-center gap-1.5 bg-[#0088cc]/10 border border-[#0088cc]/30 px-3 py-2 rounded-lg text-[11px] font-bold text-[#0088cc] hover:bg-[#0088cc]/20 transition-all"
                                >
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.75 3.81-1.65 6.35-2.75 7.61-3.3 3.61-1.56 4.36-1.83 4.85-1.84.11 0 .35.03.5.16.13.12.17.28.18.39.01.07.01.14 0 .2z"/>
                                  </svg>
                                  Telegram
                                </button>
                                <button
                                  onClick={() => copyAlertLink(selectedAlert)}
                                  className="flex items-center gap-1.5 bg-[#f7f9ff] border border-[#c2c6d4]/40 px-3 py-2 rounded-lg text-[11px] font-bold text-[#424752] hover:bg-[#ebeef3] hover:border-[#003f87]/40 transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm text-[#003f87]">link</span>
                                  Copiar enlace
                                </button>
                              </div>
                            </div>
                          </section>

                          {/* Technical Description */}
                          <section className="bg-white p-6 rounded-2xl border border-[#c2c6d4]/30 shadow-sm space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#003f87]">monitoring</span>
                              <h3 className="font-bold text-sm text-[#181c20]">Detalle Técnico</h3>
                            </div>
                            <p className="text-xs text-[#424752] leading-relaxed whitespace-pre-line">
                              {selectedAlert.description || 'No hay descripción detallada disponible en el boletín técnico para esta alerta.'}
                            </p>
                          </section>

                          {/* Safety Instructions */}
                          <section className="bg-[#003f87] text-white p-6 rounded-2xl shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#acc7ff]">safety_check</span>
                              <h3 className="font-bold text-sm">Instrucciones de Seguridad</h3>
                            </div>
                            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 text-xs leading-relaxed">
                              {selectedAlert.instruction || 'Manténgase informado y siga las indicaciones de los servicios de Protección Civil y emergencias en su localidad.'}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="bg-white/20 px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">Evite zonas inundables</span>
                              <span className="bg-white/20 px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">Cierre puertas y ventanas</span>
                            </div>
                          </section>

                          {/* Emergency Contacts */}
                          <section className="bg-[#f1f4f9]/50 p-6 rounded-2xl border border-[#c2c6d4]/20 space-y-4">
                            <h4 className="text-[10px] font-bold uppercase text-[#727784] tracking-wider">Contactos de Emergencia</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <a href="tel:112" className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-[#c2c6d4]/10 active:bg-red-50 transition-all group">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-red-100/50 flex items-center justify-center text-[#ba1a1a]">
                                    <span className="material-symbols-outlined">emergency</span>
                                  </div>
                                  <div>
                                    <p className="font-bold text-xs text-[#181c20]">Emergencias</p>
                                    <p className="text-[10px] text-[#727784]">Atención nacional 24h</p>
                                  </div>
                                </div>
                                <span className="text-xl font-extrabold text-[#ba1a1a]">112</span>
                              </a>

                              <a href="tel:061" className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-[#c2c6d4]/10 active:bg-blue-50 transition-all group">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#d7e2ff] flex items-center justify-center text-[#003f87]">
                                    <span className="material-symbols-outlined">medical_services</span>
                                  </div>
                                  <div>
                                    <p className="font-bold text-xs text-[#181c20]">Urgencias Sanitarias</p>
                                    <p className="text-[10px] text-[#727784]">Servicio de urgencias</p>
                                  </div>
                                </div>
                                <span className="text-xl font-extrabold text-[#003f87]">061</span>
                              </a>
                            </div>
                          </section>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-[#c2c6d4]/30 p-12 text-center text-[#727784] space-y-4">
                          <span className="material-symbols-outlined text-4xl text-[#727784] animate-bounce">warning</span>
                          <div>
                            <h3 className="font-bold text-base text-[#181c20]">No se ha seleccionado ninguna alerta</h3>
                            <p className="text-xs text-[#727784] mt-1">
                              Puedes pulsar sobre cualquier alerta en el mapa o en la lista de avisos del mapa para ver sus detalles específicos.
                            </p>
                          </div>
                          {userZoneAlerts.length > 0 && (
                            <div className="pt-4 max-w-md mx-auto space-y-3">
                              <p className="text-[10px] font-bold uppercase text-[#727784] tracking-wider text-left border-b pb-1.5">Alertas activas en tu zona</p>
                              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                                {userZoneAlerts.map((a) => (
                                  <button
                                    key={a.id}
                                    onClick={() => setSelectedAlert(a)}
                                    className="w-full text-left p-3 rounded-lg border border-[#c2c6d4]/30 hover:bg-[#f7f9ff] flex items-center justify-between text-xs transition-all"
                                  >
                                    <span className="font-semibold text-[#181c20] line-clamp-1">{a.event} ({a.area})</span>
                                    <span className="material-symbols-outlined text-[#003f87] text-sm">chevron_right</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {currentTab === 'settings' && (
                    /* ─────────────── TAB: SETTINGS ─────────────── */
                    <motion.div
                      key="tab-settings"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="w-full max-w-7xl mx-auto space-y-6"
                    >
                      <section className="mb-6">
                        <div className="glass-card rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 shadow-sm border-l-4 border-[#003f87]">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-[#d7e2ff]/50 border-2 border-[#d7e2ff] shadow-md flex items-center justify-center overflow-hidden">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-[#003f87] text-[40px]">account_circle</span>
                              )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-[#003f87] text-white p-1 rounded-full border-2 border-white">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </div>
                          </div>
                          <div className="text-center md:text-left flex-1">
                            <h2 className="text-xl font-bold text-[#181c20]">{user?.name || 'Carlos Rodríguez'}</h2>
                            <p className="text-base text-[#424752]">Suscripción Premium • {user?.email || 'carlos@meteoalerta.es'}</p>
                            <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
                              <span className="text-xs font-bold text-[#424752]">CP:</span>
                              <input 
                                type="text" 
                                placeholder="28001" 
                                value={postalCodeInput}
                                onChange={(e) => handlePostalCodeUpdate(e.target.value)}
                                className="w-24 px-2 py-1 text-sm rounded border border-[#c2c6d4] bg-white focus:ring-[#003f87] focus:border-[#003f87] outline-none" 
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-6">

                          {/* Install App Card */}
                          {installState !== 'installed' && (
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#c2c6d4]/30">
                              <div className="bg-[#ebeef3] px-6 py-4 border-b border-[#c2c6d4]/30">
                                <h3 className="text-xl font-semibold text-[#003f87] flex items-center gap-2">
                                  <span className="material-symbols-outlined">install_mobile</span>
                                  Instalar Aplicación
                                </h3>
                              </div>
                              <div className="p-6 space-y-4">
                                <p className="text-sm text-[#424752]">
                                  Instala MeteoAlerta en tu dispositivo para acceder más rápido, recibir notificaciones y usarla sin conexión.
                                </p>

                                {/* Android / Chrome / Edge — un solo clic */}
                                {installState === 'installable' && (
                                  <button
                                    id="install-app-btn"
                                    onClick={installApp}
                                    className="w-full flex items-center justify-center gap-3 bg-[#003f87] hover:bg-[#0056b3] active:scale-95 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-200"
                                  >
                                    <span className="material-symbols-outlined text-[22px]">download</span>
                                    Instalar ahora
                                  </button>
                                )}

                                {/* iOS — instrucciones manuales */}
                                {installState === 'ios' && (
                                  <div className="bg-[#f0f4ff] border border-[#003f87]/20 rounded-xl p-4 space-y-3">
                                    <p className="text-sm font-bold text-[#003f87] flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[18px]">info</span>
                                      Cómo instalar en iPhone / iPad:
                                    </p>
                                    <ol className="text-sm text-[#424752] space-y-2 list-none">
                                      <li className="flex items-start gap-2">
                                        <span className="bg-[#003f87] text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">1</span>
                                        Abre esta página en <strong>Safari</strong>
                                      </li>
                                      <li className="flex items-start gap-2">
                                        <span className="bg-[#003f87] text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">2</span>
                                        Pulsa el botón <strong>Compartir</strong> <span className="material-symbols-outlined text-[16px] align-middle">ios_share</span>
                                      </li>
                                      <li className="flex items-start gap-2">
                                        <span className="bg-[#003f87] text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">3</span>
                                        Selecciona <strong>"Añadir a pantalla de inicio"</strong>
                                      </li>
                                    </ol>
                                  </div>
                                )}

                                {/* Navegador no compatible */}
                                {installState === 'unsupported' && !isIOS && (
                                  <p className="text-xs text-[#727784] flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">info</span>
                                    Usa Chrome o Edge en Android para instalar la app con un clic.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Push Notifications Card */}
                          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#c2c6d4]/30">
                            <div className="bg-[#ebeef3] px-6 py-4 border-b border-[#c2c6d4]/30">
                              <h3 className="text-xl font-semibold text-[#003f87] flex items-center gap-2">
                                <span className="material-symbols-outlined">notifications</span>
                                Notificaciones Push
                              </h3>
                            </div>
                            <div className="p-6 space-y-3">
                              <p className="text-sm text-[#424752] mb-4">
                                Recibe alertas meteorológicas directamente en tu dispositivo, incluso con la app cerrada.
                                {pushStatus === 'unsupported' && <span className="ml-1 text-[#ba1a1a] font-semibold">Tu navegador no soporta notificaciones push.</span>}
                                {pushStatus === 'denied' && <span className="ml-1 text-[#ba1a1a] font-semibold">Has bloqueado los permisos. Actívalos en los ajustes del navegador.</span>}
                              </p>
                              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                                pushStatus === 'subscribed'
                                  ? 'bg-[#e8f0fe]/40 border-[#003f87]/20'
                                  : 'bg-[#e1e3e4]/30 border-[#c2c6d4]/30'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <span className={`w-4 h-4 rounded-full flex-shrink-0 ${
                                    pushStatus === 'subscribed' ? 'bg-[#003f87]' : 'bg-[#727784]'
                                  }`} />
                                  <div>
                                    <span className={`font-bold block text-sm ${
                                      pushStatus === 'subscribed' ? 'text-[#003f87]' : 'text-[#181c20]'
                                    }`}>
                                      {pushStatus === 'subscribed' ? 'Notificaciones activas' :
                                       pushStatus === 'loading' ? 'Activando...' :
                                       pushStatus === 'denied' ? 'Bloqueadas por el navegador' :
                                       pushStatus === 'unsupported' ? 'No disponible' :
                                       'Notificaciones desactivadas'}
                                    </span>
                                    <span className={`text-xs italic ${
                                      pushStatus === 'subscribed' ? 'text-[#003f87]/70' : 'text-[#424752]'
                                    }`}>
                                      {pushStatus === 'subscribed' ? 'Recibirás alertas aunque la app esté cerrada' : 'Activa para recibir alertas en este dispositivo'}
                                    </span>
                                  </div>
                                </div>
                                {pushStatus !== 'unsupported' && (
                                  <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in flex-shrink-0">
                                    <input
                                      id="push-toggle"
                                      type="checkbox"
                                      checked={pushStatus === 'subscribed'}
                                      onChange={() => {
                                        if (pushStatus === 'subscribed') {
                                          pushUnsubscribe();
                                        } else {
                                          pushSubscribe();
                                        }
                                      }}
                                      disabled={pushStatus === 'loading' || pushStatus === 'denied'}
                                      className={`absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer ${pushStatus === 'subscribed' ? 'right-0 border-[#003f87]' : 'left-0 border-[#727784]'}`}
                                    />
                                    <label className={`block overflow-hidden h-6 rounded-full cursor-pointer ${pushStatus === 'subscribed' ? 'bg-[#0056b3]' : 'bg-[#e0e3e8]'}`} htmlFor="push-toggle"></label>
                                  </div>
                                )}
                              </div>
                              {pushStatus === 'subscribed' && (
                                <p className="text-[10px] text-[#727784] flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px] text-[#22c55e]">check_circle</span>
                                  Este dispositivo está registrado para recibir notificaciones push de MeteoAlerta.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#c2c6d4]/30">
                            <div className="bg-[#ebeef3] px-6 py-4 border-b border-[#c2c6d4]/30">
                              <h3 className="text-xl font-semibold text-[#003f87] flex items-center gap-2">
                                <span className="material-symbols-outlined">notifications_active</span>
                                Umbrales de Notificación
                              </h3>
                            </div>
                            <div className="p-6 space-y-4">
                              <p className="text-base text-[#424752] mb-4">Selecciona el nivel mínimo de riesgo para recibir alertas en tu dispositivo.</p>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-[#ffdad6]/20 rounded-lg border border-[#ba1a1a]/20">
                                  <div className="flex items-center gap-3">
                                    <span className="w-4 h-4 rounded-full bg-[#ba1a1a]"></span>
                                    <div>
                                      <span className="font-bold text-[#93000a] block">Nivel Rojo</span>
                                      <span className="text-xs text-[#93000a]/70 italic">Riesgo Extremo</span>
                                    </div>
                                  </div>
                                  <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                    <input 
                                      checked={prefSeverities.includes('red')}
                                      onChange={() => handleSeverityToggle('red')}
                                      className={`absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer ${prefSeverities.includes('red') ? 'right-0 border-[#003f87]' : 'left-0 border-[#727784]'}`} 
                                      id="toggle-red" 
                                      type="checkbox" 
                                    />
                                    <label className={`block overflow-hidden h-6 rounded-full cursor-pointer ${prefSeverities.includes('red') ? 'bg-[#0056b3]' : 'bg-[#e0e3e8]'}`} htmlFor="toggle-red"></label>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[#ffdbcc]/20 rounded-lg border border-[#722b00]/20">
                                  <div className="flex items-center gap-3">
                                    <span className="w-4 h-4 rounded-full bg-[#f97316]"></span>
                                    <div>
                                      <span className="font-bold text-[#7b2f00] block">Nivel Naranja</span>
                                      <span className="text-xs text-[#7b2f00]/70 italic">Riesgo Importante</span>
                                    </div>
                                  </div>
                                  <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                    <input 
                                      checked={prefSeverities.includes('orange')}
                                      onChange={() => handleSeverityToggle('orange')}
                                      className={`absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer ${prefSeverities.includes('orange') ? 'right-0 border-[#003f87]' : 'left-0 border-[#727784]'}`} 
                                      id="toggle-orange" 
                                      type="checkbox" 
                                    />
                                    <label className={`block overflow-hidden h-6 rounded-full cursor-pointer ${prefSeverities.includes('orange') ? 'bg-[#0056b3]' : 'bg-[#e0e3e8]'}`} htmlFor="toggle-orange"></label>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[#e1e3e4]/30 rounded-lg border border-[#c2c6d4]/30">
                                  <div className="flex items-center gap-3">
                                    <span className="w-4 h-4 rounded-full bg-[#eab308]"></span>
                                    <div>
                                      <span className="font-bold text-[#181c20] block">Nivel Amarillo</span>
                                      <span className="text-xs text-[#424752] italic">Riesgo Moderado</span>
                                    </div>
                                  </div>
                                  <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                    <input 
                                      checked={prefSeverities.includes('yellow')}
                                      onChange={() => handleSeverityToggle('yellow')}
                                      className={`absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer ${prefSeverities.includes('yellow') ? 'right-0 border-[#003f87]' : 'left-0 border-[#727784]'}`} 
                                      id="toggle-yellow" 
                                      type="checkbox" 
                                    />
                                    <label className={`block overflow-hidden h-6 rounded-full cursor-pointer ${prefSeverities.includes('yellow') ? 'bg-[#0056b3]' : 'bg-[#e0e3e8]'}`} htmlFor="toggle-yellow"></label>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-6 flex justify-end">
                                <button onClick={handleSaveChanges} className="bg-[#003f87] text-white px-6 py-2 rounded-full font-bold text-xs hover:opacity-90 transition-all active:scale-95 shadow-md flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">save</span>
                                  Guardar Cambios
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#c2c6d4]/30">
                            <h4 className="font-bold text-[#003f87] mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined">storm</span>
                              Fenómenos Meteorológicos
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {['viento', 'lluvia', 'tormentas', 'nieve', 'temperaturas', 'costeros', 'polvo en suspensión', 'galernas', 'rissagas', 'aludes', 'visibilidad'].map(p => (
                                <label key={p} className="flex items-center justify-between cursor-pointer group bg-[#ebeef3]/30 p-3 rounded-lg border border-[#c2c6d4]/20 hover:border-[#003f87]/50 transition-all">
                                  <span className="text-base text-[#181c20] capitalize group-hover:text-[#003f87] transition-colors">{p}</span>
                                  <input 
                                    type="checkbox" 
                                    checked={prefPhenomena.includes(p)}
                                    onChange={() => handlePhenomenonToggle(p)}
                                    className="rounded border-[#727784] text-[#003f87] focus:ring-[#003f87] h-5 w-5" 
                                  />
                                </label>
                              ))}
                            </div>
                            <div className="mt-6 pt-4 border-t border-[#c2c6d4]/30 flex justify-end">
                              <button onClick={handleSaveChanges} className="bg-[#003f87] text-white px-6 py-2 rounded-full font-bold text-xs hover:opacity-90 transition-all active:scale-95 shadow-md flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Guardar Cambios
                              </button>
                            </div>
                          </div>
                        </div>

                        <aside className="lg:col-span-4 space-y-6">
                          <div className="bg-[#e5e8ee] p-6 rounded-xl shadow-sm space-y-4">
                            <h3 className="text-xl font-semibold text-[#424752] border-b border-[#c2c6d4]/30 pb-2">Información</h3>
                            <ul className="space-y-4">
                              <li onClick={() => setCurrentTab('info')} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-[#003f87]">online_prediction</span>
                                  <span className="text-base text-[#181c20]">Predicción Nacional</span>
                                </div>
                                <span className="material-symbols-outlined text-[#c2c6d4] group-hover:text-[#003f87]">chevron_right</span>
                              </li>
                              <li onClick={() => setCurrentTab('info')} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-[#003f87]">info_i</span>
                                  <span className="text-base text-[#181c20]">Qué hacemos</span>
                                </div>
                                <span className="material-symbols-outlined text-[#c2c6d4] group-hover:text-[#003f87]">chevron_right</span>
                              </li>
                              <li onClick={toggleDarkMode} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-[#003f87]">{darkMode ? 'light_mode' : 'dark_mode'}</span>
                                  <span className="text-base text-[#181c20]">Modo oscuro</span>
                                </div>
                                <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                  <input
                                    type="checkbox"
                                    checked={darkMode}
                                    onChange={toggleDarkMode}
                                    className={`absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer ${darkMode ? 'right-0 border-[#003f87]' : 'left-0 border-[#727784]'}`}
                                    id="toggle-dark"
                                  />
                                  <label className={`block overflow-hidden h-6 rounded-full cursor-pointer ${darkMode ? 'bg-[#0056b3]' : 'bg-[#e0e3e8]'}`} htmlFor="toggle-dark"></label>
                                </div>
                              </li>
                              <li className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-[#003f87]">info</span>
                                  <span className="text-base text-[#181c20]">Versión de la App</span>
                                </div>
                                <span className="text-[#424752] font-bold">3.0.6</span>
                              </li>
                              <li onClick={() => setShowSupportModal(true)} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-[#003f87]">contact_support</span>
                                  <span className="text-base text-[#181c20]">Contacto y Soporte</span>
                                </div>
                                <span className="material-symbols-outlined text-[#c2c6d4] group-hover:text-[#003f87]">chevron_right</span>
                              </li>
                              <li onClick={() => setShowPrivacyModal(true)} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-[#003f87]">security</span>
                                  <span className="text-base text-[#181c20]">Privacidad</span>
                                </div>
                                <span className="material-symbols-outlined text-[#c2c6d4] group-hover:text-[#003f87]">chevron_right</span>
                              </li>
                              <li onClick={() => setCurrentTab('info')} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-[#003f87]">help</span>
                                  <span className="text-base text-[#181c20]">Centro de Ayuda</span>
                                </div>
                                <span className="material-symbols-outlined text-[#c2c6d4] group-hover:text-[#003f87]">chevron_right</span>
                              </li>
                            </ul>
                          </div>
                          <div className="bg-[#003f87] text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                            <div className="relative z-10">
                              <h4 className="font-bold text-lg mb-2 text-white">Canal Oficial</h4>
                              <p className="text-sm text-[#bbd0ff] opacity-90 leading-relaxed">
                                MeteoAlerta utiliza datos en tiempo real de AEMET y Protección Civil. En caso de emergencia, siga siempre las instrucciones de las autoridades locales.
                              </p>
                            </div>
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#0056b3]/20 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 bg-[#acc7ff]/10 rounded-full blur-xl"></div>
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm('¿Desea cerrar sesión?')) {
                                await logout();
                              }
                            }}
                            className="w-full py-4 rounded-xl bg-[#ffdad6] text-[#93000a] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
                          >
                            <span className="material-symbols-outlined">logout</span>
                            Cerrar Sesión
                          </button>
                        </aside>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── BOTTOM MOBILE NAVIGATION BAR ── */}
              <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 pb-safe bg-white border-t border-[#c2c6d4]/30 shadow-lg md:hidden">
                <button
                  onClick={() => setCurrentTab('map')}
                  className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-all ${
                    currentTab === 'map' ? 'text-[#003f87]' : 'text-[#727784]'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTab === 'map' ? 1 : 0}` }}>map</span>
                  <span className="text-[10px] font-bold mt-0.5">Mapa</span>
                </button>

                <button
                  onClick={() => setCurrentTab('info')}
                  className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-all ${
                    currentTab === 'info' ? 'text-[#003f87]' : 'text-[#727784]'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTab === 'info' ? 1 : 0}` }}>info</span>
                  <span className="text-[10px] font-bold mt-0.5">Info</span>
                </button>

                <button
                  onClick={() => setCurrentTab('alertas')}
                  className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-all ${
                    currentTab === 'alertas' ? 'text-[#003f87]' : 'text-[#727784]'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTab === 'alertas' ? 1 : 0}` }}>notifications_active</span>
                  <span className="text-[10px] font-bold mt-0.5">Alertas</span>
                </button>

                <button
                  onClick={() => setCurrentTab('settings')}
                  className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-all ${
                    currentTab === 'settings' ? 'text-[#003f87]' : 'text-[#727784]'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${currentTab === 'settings' ? 1 : 0}` }}>settings</span>
                  <span className="text-[10px] font-bold mt-0.5">Ajustes</span>
                </button>
              </nav>

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Terms of Service Modal ────────────────────────────── */}
      <AnimatePresence>
        {showToSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowToSModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebedf3]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #003f87, #0066cc)' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>gavel</span>
                  </div>
                  <h2 className="text-base font-extrabold text-[#1a1c22]">Términos de Servicio</h2>
                </div>
                <button
                  onClick={() => setShowToSModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f2f3f7] transition-colors cursor-pointer bg-transparent border-none"
                >
                  <span className="material-symbols-outlined text-[#727784]" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-5 py-4 text-[#424752] text-[13px] leading-relaxed space-y-4">
                <p className="text-[10px] text-[#727784] font-semibold uppercase tracking-wider">Última actualización: 23 de junio de 2026</p>

                <p>
                  Por favor, lea atentamente estos Términos de Servicio (&ldquo;Términos&rdquo;) antes de utilizar el sitio web{' '}
                  <a href="https://alertasmeteo.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#003f87] font-bold hover:underline">alertasmeteo.vercel.app</a>{' '}
                  (el &ldquo;Servicio&rdquo;) operado por MeteoAlerta España (&ldquo;nosotros&rdquo;, &ldquo;nuestro&rdquo;).
                </p>
                <p>
                  El acceso y uso del Servicio está condicionado a la aceptación y cumplimiento de estos Términos. Estos Términos se aplican a todos los visitantes, usuarios y otras personas que accedan o utilicen el Servicio.
                </p>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">1.</span> Naturaleza del Servicio e Información Meteorológica
                  </h3>
                  <p>
                    MeteoAlerta España es una plataforma independiente de carácter meramente informativo y de alerta temprana que recopila, procesa y retransmite avisos meteorológicos oficiales procedentes de la Agencia Estatal de Meteorología (AEMET).
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[12px] pl-1">
                    <li><strong>Origen de los datos:</strong> La información y avisos provienen directamente de fuentes públicas oficiales (AEMET).</li>
                    <li><strong>Ausencia de consejo oficial:</strong> Este Servicio no sustituye a los canales de emergencia oficiales de las autoridades de Protección Civil, del Gobierno de España o de las respectivas Comunidades Autónomas. En caso de alertas de riesgo extremo (Nivel Rojo o Naranja), los usuarios deben priorizar siempre las instrucciones de las autoridades competentes.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">2.</span> Registro de Cuentas y Seguridad
                  </h3>
                  <p>
                    Para recibir alertas personalizadas, los usuarios deben registrarse proporcionando una dirección de correo electrónico válida y establecer una contraseña segura.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[12px] pl-1">
                    <li><strong>Responsabilidad de la cuenta:</strong> Usted es responsable de salvaguardar la contraseña que utiliza para acceder al Servicio y de cualquier actividad o acción bajo su contraseña.</li>
                    <li><strong>Precisión de datos:</strong> Al registrarse, se compromete a facilitar información verídica (como su Código Postal) para garantizar la correcta geolocalización de sus avisos.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">3.</span> Servicios de Notificación (Telegram y Canales de Terceros)
                  </h3>
                  <p>
                    MeteoAlerta España ofrece la posibilidad de sincronizar su cuenta con un Bot de Telegram oficial (<code className="bg-[#f2f3f7] px-1 py-0.5 rounded text-[11px] font-bold">@alertasMeteoBot</code>) para la recepción de alertas meteorológicas automatizadas y previsiones diarias.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[12px] pl-1">
                    <li><strong>Configuración manual:</strong> El usuario es responsable de realizar la vinculación inicial a través del bot e introducir su número de teléfono de contacto en su panel de Ajustes si desea activar ciertas notificaciones.</li>
                    <li><strong>Costes del servicio:</strong> El Servicio es gratuito, no obstante, MeteoAlerta España no se hace responsable de las tarifas de datos que su operador móvil pueda aplicar por la recepción de mensajes.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">4.</span> Limitación de Responsabilidad e Interrupciones del Servicio
                  </h3>
                  <p>
                    MeteoAlerta España se esfuerza por ofrecer un servicio de alta disponibilidad y entrega rápida de avisos, pero <strong>el Servicio se proporciona &ldquo;TAL CUAL&rdquo; y &ldquo;SEGÚN DISPONIBILIDAD&rdquo;</strong>.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[12px] pl-1">
                    <li><strong>Retardos y fallos de entrega:</strong> No garantizamos que las alertas se entreguen de forma instantánea o ininterrumpida debido a factores ajenos a nuestro control (caídas de red de operadores de telefonía, cortes de servidores en la API de AEMET, limitaciones del API de Telegram, etc.).</li>
                    <li><strong>Exclusión de daños:</strong> En ningún caso MeteoAlerta España, sus desarrolladores o colaboradores serán responsables de cualquier daño directo, indirecto, incidental o consecuente derivado de la falta de recepción de una alerta meteorológica, de decisiones tomadas basándose en la información del Servicio, o de la indisponibilidad temporal del sitio web.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">5.</span> Baja del Servicio y Supresión de Datos
                  </h3>
                  <p>Respetamos plenamente su privacidad y el control de sus datos personales bajo el RGPD.</p>
                  <ul className="list-disc list-inside space-y-1 text-[12px] pl-1">
                    <li><strong>Derecho de exclusión:</strong> En cualquier momento, usted puede darse de baja del Servicio y solicitar la eliminación completa de su perfil accediendo a la página dedicada de baja.</li>
                    <li><strong>Eliminación permanente:</strong> Al confirmar su correo electrónico y contraseña en dicha página, se eliminarán de forma inmediata e irreversible todos sus datos de nuestras bases de datos públicas y de autenticación, incluyendo preferencias de alertas, código postal, correo y número de teléfono.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">6.</span> Modificaciones de los Términos
                  </h3>
                  <p>
                    Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es importante, intentaremos proporcionar un aviso con al menos 15 días de antelación a la entrada en vigor de los nuevos términos.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">7.</span> Contacto
                  </h3>
                  <p>
                    Si tiene alguna pregunta sobre estos Términos, por favor póngase en contacto con nosotros a través de los canales de soporte indicados en la pestaña de Información del panel principal de la aplicación.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-[#ebedf3] flex justify-end">
                <button
                  onClick={() => setShowToSModal(false)}
                  className="px-5 py-2 rounded-lg text-white text-sm font-bold cursor-pointer border-none transition-all duration-200 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #003f87, #0066cc)' }}
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Privacy Policy Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowPrivacyModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebedf3]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #003f87, #0066cc)' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>security</span>
                  </div>
                  <h2 className="text-base font-extrabold text-[#1a1c22]">Política de Privacidad</h2>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f2f3f7] transition-colors cursor-pointer bg-transparent border-none"
                >
                  <span className="material-symbols-outlined text-[#727784]" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-5 py-4 text-[#424752] text-[13px] leading-relaxed space-y-4">
                <p className="text-[10px] text-[#727784] font-semibold uppercase tracking-wider">Última actualización: 30 de junio de 2026</p>

                <p>
                  En MeteoAlerta España nos tomamos muy en serio la seguridad y confidencialidad de tus datos. De acuerdo con el Reglamento General de Protección de Datos (RGPD) de la UE, esta Política describe cómo gestionamos tu información.
                </p>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">1.</span> Datos que recopilamos
                  </h3>
                  <p>
                    Para prestar el servicio recopilamos exclusivamente los datos mínimos necesarios:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[12px] pl-1">
                    <li><strong>Correo electrónico:</strong> Utilizado como identificador de inicio de sesión y canal para el envío opcional de alertas por email.</li>
                    <li><strong>Preferencia geográfica (Código Postal/Provincia):</strong> Exclusivamente para filtrar los avisos y alertas meteorológicas relevantes para tu zona.</li>
                    <li><strong>Suscripción Push:</strong> Para enviarte notificaciones web directas al navegador, guardamos el endpoint de red y las llaves criptográficas públicas correspondientes en Supabase de forma segura.</li>
                    <li><strong>Número de teléfono y Telegram ID (Opcional):</strong> Si decides activar voluntariamente las alertas por SMS o a través de nuestro bot de Telegram.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">2.</span> Uso y Almacenamiento de Datos
                  </h3>
                  <p>
                    Tus datos se almacenan de forma segura en las bases de datos de **Supabase** (bajo estrictos estándares de encriptación). Los datos se procesan con la única finalidad de automatizar la entrega de las alertas meteorológicas procedentes de AEMET. **Nunca** vendemos, alquilamos ni compartimos tu información personal con anunciantes o terceros.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">3.</span> Cookies y almacenamiento local
                  </h3>
                  <p>
                    Utilizamos cookies técnicas del sistema y el almacenamiento local del navegador (`localStorage`) únicamente para mantener tu sesión activa de forma segura y guardar tus preferencias de diseño (como el filtro de alertas preferidas) en el dispositivo. No utilizamos cookies de rastreo comercial.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-[#1a1c22] flex items-center gap-2">
                    <span className="text-[#003f87] font-bold">4.</span> Derechos del usuario (RGPD)
                  </h3>
                  <p>
                    Tienes derecho a acceder, rectificar o solicitar la supresión de tus datos. Puedes ejercer tu derecho de supresión de forma automática dándote de baja del servicio en tu pestaña de Ajustes o en el enlace correspondiente de la web, lo cual eliminará de forma irreversible toda tu información.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-[#ebedf3] flex justify-end">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-5 py-2 rounded-lg text-white text-sm font-bold cursor-pointer border-none transition-all duration-200 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #003f87, #0066cc)' }}
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Technical Support Modal ──────────────────────────────── */}
      <AnimatePresence>
        {showSupportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowSupportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebedf3]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #003f87, #0066cc)' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>contact_support</span>
                  </div>
                  <h2 className="text-base font-extrabold text-[#1a1c22]">Soporte Técnico</h2>
                </div>
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f2f3f7] transition-colors cursor-pointer bg-transparent border-none"
                >
                  <span className="material-symbols-outlined text-[#727784]" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-5 py-4 text-[#424752] text-[13px] leading-relaxed space-y-5">
                <p>
                  ¿Tienes algún problema con las notificaciones push o la localización? Puedes enviarnos un reporte directamente o contactar por nuestras redes oficiales.
                </p>

                {/* Contact Form */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-[#1a1c22] uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#003f87]">mail</span>
                    Enviar Mensaje
                  </h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      alert('Tu reporte se ha registrado correctamente. Analizaremos tu caso en las próximas horas.');
                      setShowSupportModal(false);
                    }}
                    className="bg-[#f7f9ff] p-4 rounded-xl border border-[#c2c6d4]/30 space-y-3"
                  >
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#424752] uppercase tracking-wider ml-1" htmlFor="modal-asunto">
                        Asunto
                      </label>
                      <input
                        className="w-full bg-white border border-[#c2c6d4] rounded-lg px-3 py-2 text-xs text-[#181c20] focus:outline-none focus:border-[#003f87]"
                        id="modal-asunto"
                        placeholder="Ej: Error al activar notificaciones"
                        type="text"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#424752] uppercase tracking-wider ml-1" htmlFor="modal-mensaje">
                        Mensaje
                      </label>
                      <textarea
                        className="w-full bg-white border border-[#c2c6d4] rounded-lg px-3 py-2 text-xs text-[#181c20] focus:outline-none focus:border-[#003f87]"
                        id="modal-mensaje"
                        placeholder="Explica qué problema experimentas..."
                        rows={3}
                        required
                      />
                    </div>
                    <button
                      className="w-full bg-[#003f87] hover:bg-[#0056b3] text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition-all active:scale-[0.98]"
                      type="submit"
                    >
                      Enviar reporte
                    </button>
                  </form>
                </div>

                {/* Social Channels */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-[#1a1c22] uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#003f87]">share</span>
                    Canales de Contacto Directo
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href="https://t.me/alertasMeteoBot"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 bg-white border border-[#c2c6d4]/30 rounded-xl hover:bg-[#f7f9ff] transition-all shadow-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc] flex-shrink-0">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.75 3.81-1.65 6.35-2.75 7.61-3.3 3.61-1.56 4.36-1.83 4.85-1.84.11 0 .35.03.5.16.13.12.17.28.18.39.01.07.01.14 0 .2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-[10px] text-[#181c20]">Telegram</p>
                          <p className="text-[8px] text-[#727784]">@alertasMeteoBot</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[#727784] text-[12px] group-hover:text-[#003f87]">open_in_new</span>
                    </a>

                    <a
                      href="https://twitter.com/AlertasMeteoES"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 bg-white border border-[#c2c6d4]/30 rounded-xl hover:bg-[#f7f9ff] transition-all shadow-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2] flex-shrink-0">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-[10px] text-[#181c20]">X (Twitter)</p>
                          <p className="text-[8px] text-[#727784]">@AlertasMeteoES</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[#727784] text-[12px] group-hover:text-[#003f87]">open_in_new</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-[#ebedf3] flex justify-end">
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="px-5 py-2 rounded-lg text-white text-sm font-bold cursor-pointer border-none transition-all duration-200 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #003f87, #0066cc)' }}
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
