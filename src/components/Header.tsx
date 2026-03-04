import { ChevronDown, UserPlus, LogIn, LogOut, User, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { UserRegistrationModal } from './UserRegistrationModal';
import { LoginModal } from './LoginModal';
import { ProfileModal } from './ProfileModal';
import { AboutModal } from './AboutModal';
import { ContactModal } from './ContactModal';

export const Header = () => {
    const { language, setLanguage, t } = useLanguage();
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [isContactOpen, setIsContactOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLanguageSelect = (lang: 'es' | 'en') => {
        setLanguage(lang);
        setIsOpen(false);
    };

    const getFlag = (lang: string) => {
        const flagCode = lang === 'es' ? 'es' : 'gb';
        return (
            <img
                src={`https://flagcdn.com/w40/${flagCode}.png`}
                srcSet={`https://flagcdn.com/w80/${flagCode}.png 2x`}
                width="20"
                alt={lang}
                className="rounded-sm shadow-sm"
            />
        );
    };

    return (
        <>
            <header className="sticky top-0 z-50 glass border-b border-white/5 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 group cursor-pointer transition-all duration-300">
                        <div className="relative group-hover:scale-105 transition-all duration-500">
                            <img
                                src="/logo.png"
                                alt="ALERTAS Meteo Logo"
                                className="h-12 w-auto drop-shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gradient tracking-tight leading-none">
                                {t('app.title')}
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 opacity-90 mt-1 hidden sm:block">
                                {t('app.subtitle')}
                            </p>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-6 border-l border-white/5 ml-8 pl-8">
                        <button
                            onClick={() => setIsAboutOpen(true)}
                            className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest active:scale-95"
                        >
                            {t('nav.about')}
                        </button>
                        <button
                            onClick={() => setIsContactOpen(true)}
                            className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest active:scale-95"
                        >
                            {t('nav.contact')}
                        </button>

                        {/* Social Links */}
                        <div className="flex items-center gap-2 border-l border-white/5 pl-6">
                            <a
                                href="https://twitter.com/AlertasMeteoES"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="@AlertasMeteoES en X (Twitter)"
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 group"
                            >
                                {/* X / Twitter icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                                </svg>
                            </a>
                            <a
                                href="https://t.me/alertasMeteoBot"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="@alertasMeteoBot en Telegram"
                                className="p-2 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 transition-all active:scale-95 group"
                            >
                                {/* Telegram icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg>
                            </a>
                        </div>
                    </nav>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-2 bg-white/5 rounded-2xl pl-4 pr-1.5 py-1.5 border border-white/10 shadow-inner backdrop-blur-md">
                                <div className="flex items-center gap-2.5">
                                    <div className="bg-blue-500/20 p-1.5 rounded-full">
                                        <User size={16} className="text-blue-400" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-100 hidden sm:inline">
                                        {t('auth.welcome')} <span className="text-blue-400">{user.name}</span>
                                    </span>
                                </div>
                                <div className="flex items-center border-l border-white/10 ml-2 pl-1.5 gap-1">
                                    <button
                                        onClick={() => setIsProfileOpen(true)}
                                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-blue-300 transition-all active:scale-95"
                                        title={t('profile.title')}
                                    >
                                        <Settings size={18} />
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all active:scale-95"
                                        title={t('auth.logout')}
                                    >
                                        <LogOut size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm font-bold active:scale-95"
                                >
                                    <LogIn size={18} className="inline mr-2" />
                                    <span className="hidden sm:inline">{t('login.title')}</span>
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-xl shadow-blue-500/30 active:scale-95 active:shadow-none"
                                >
                                    <UserPlus size={18} className="inline mr-2" />
                                    <span className="hidden sm:inline">{t('form.title')}</span>
                                </button>
                            </div>
                        )}

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={toggleDropdown}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 text-sm group active:scale-95 shadow-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="flex-shrink-0">{getFlag(language)}</div>
                                    <span className="font-bold text-slate-100 uppercase hidden sm:inline tracking-widest">{language}</span>
                                </div>
                                <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
                            </button>

                            {isOpen && (
                                <div className="absolute top-full right-0 mt-3 w-44 glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={() => handleLanguageSelect('es')}
                                        className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-blue-500/10 transition-all group ${language === 'es' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'}`}
                                    >
                                        <div className="group-hover:scale-110 transition-transform flex-shrink-0">
                                            {getFlag('es')}
                                        </div>
                                        <span className="text-sm font-bold">Español</span>
                                    </button>
                                    <button
                                        onClick={() => handleLanguageSelect('en')}
                                        className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-blue-500/10 transition-all group ${language === 'en' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'}`}
                                    >
                                        <div className="group-hover:scale-110 transition-transform flex-shrink-0">
                                            {getFlag('en')}
                                        </div>
                                        <span className="text-sm font-bold">English</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <UserRegistrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
            <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
            <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
        </>
    );
};
