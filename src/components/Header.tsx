import { CloudRainWind, ChevronDown, UserPlus, LogIn, LogOut, User, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { UserRegistrationModal } from './UserRegistrationModal';
import { LoginModal } from './LoginModal';
import { ProfileModal } from './ProfileModal';

export const Header = () => {
    const { language, setLanguage, t } = useLanguage();
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
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

    const getFlag = (lang: string) => lang === 'es' ? '🇪🇸' : '🇬🇧';

    return (
        <>
            <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                            <CloudRainWind size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                                {t('app.title')}
                            </h1>
                            <p className="text-xs text-slate-400 hidden sm:block">{t('app.subtitle')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg pl-3 pr-1 py-1 border border-white/10">
                                <div className="flex items-center gap-2">
                                    <User size={16} className="text-blue-400" />
                                    <span className="text-sm font-medium text-slate-200 hidden sm:inline">{t('auth.welcome')} {user.name}</span>
                                </div>
                                <div className="flex items-center border-l border-white/10 ml-2 pl-1">
                                    <button
                                        onClick={() => setIsProfileOpen(true)}
                                        className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-blue-400 transition-colors"
                                        title={t('profile.title')}
                                    >
                                        <Settings size={16} />
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                        title={t('auth.logout')}
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                                >
                                    <LogIn size={16} />
                                    <span className="hidden sm:inline">{t('login.title')}</span>
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <UserPlus size={16} />
                                    <span className="hidden sm:inline">{t('form.title')}</span>
                                </button>
                            </>
                        )}

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={toggleDropdown}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-sm w-20 sm:w-32 justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg leading-none">{getFlag(language)}</span>
                                    <span className="font-medium text-slate-200 uppercase hidden sm:inline">{language.toUpperCase()}</span>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isOpen && (
                                <div className="absolute top-full right-0 mt-2 w-40 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => handleLanguageSelect('es')}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${language === 'es' ? 'bg-white/5 text-blue-400' : 'text-slate-300'}`}
                                    >
                                        <span className="text-lg leading-none">🇪🇸</span>
                                        <span className="text-sm font-medium">Español (ES)</span>
                                    </button>
                                    <button
                                        onClick={() => handleLanguageSelect('en')}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${language === 'en' ? 'bg-white/5 text-blue-400' : 'text-slate-300'}`}
                                    >
                                        <span className="text-lg leading-none">🇬🇧</span>
                                        <span className="text-sm font-medium">English (EN)</span>
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
        </>
    );
};
