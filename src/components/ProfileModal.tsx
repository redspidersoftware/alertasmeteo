import { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Save, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { validatePhone, validatePostalCode, updateUser, type UserData } from '../services/userService';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
    const { user, refreshProfile } = useAuth();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'basic' | 'prefs'>('basic');

    const [formData, setFormData] = useState<UserData>({
        name: '',
        email: '',
        phone: '',
        postalCode: '',
        language: 'es',
        preferredSeverities: ['yellow', 'orange', 'red'],
        preferredEventTypes: []
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                postalCode: user.postalCode || '',
                language: user.language || 'es',
                preferredSeverities: user.preferredSeverities || ['yellow', 'orange', 'red'],
                preferredEventTypes: user.preferredEventTypes || []
            });
            setErrors({});
            setSuccessMsg('');
            setErrorMsg('');
            setActiveTab('basic');
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const toggleSeverity = (severity: string) => {
        const current = formData.preferredSeverities || [];
        const next = current.includes(severity)
            ? current.filter(s => s !== severity)
            : [...current, severity];
        setFormData({ ...formData, preferredSeverities: next });
    };

    const toggleEventType = (type: string) => {
        const current = formData.preferredEventTypes || [];
        const next = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        setFormData({ ...formData, preferredEventTypes: next });
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Required';
        if (!validatePhone(formData.phone)) newErrors.phone = t('form.error.phone');
        if (!validatePostalCode(formData.postalCode)) newErrors.cp = t('form.error.cp');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            setActiveTab('basic');
            return;
        }

        setIsSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            await updateUser(user.id!, {
                name: formData.name,
                phone: formData.phone,
                postalCode: formData.postalCode,
                language: formData.language,
                preferredSeverities: formData.preferredSeverities,
                preferredEventTypes: formData.preferredEventTypes
            });

            await refreshProfile();
            setSuccessMsg(t('profile.success'));
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (error: any) {
            setErrorMsg(error.message || t('profile.error'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{t('profile.title')}</h3>
                            <p className="text-xs text-slate-400">{t('profile.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'basic' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t('profile.tab.basic')}
                    </button>
                    <button
                        onClick={() => setActiveTab('prefs')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'prefs' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t('profile.tab.prefs')}
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errorMsg && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
                            {errorMsg}
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                            {successMsg}
                        </div>
                    )}

                    {activeTab === 'basic' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 ml-1">{t('form.name')}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={`w-full bg-white/5 border ${errors.name ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                                        placeholder="E.g. Juan Pérez"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 opacity-60">
                                <label className="text-xs font-medium text-slate-400 ml-1">{t('form.email')} ({t('form.email')} - Read only)</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        readOnly
                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-slate-400 cursor-not-allowed focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 ml-1">{t('form.phone')}</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className={`w-full bg-white/5 border ${errors.phone ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm`}
                                            placeholder="600 000 000"
                                        />
                                    </div>
                                    {errors.phone && <p className="text-[10px] text-red-400 ml-1">{errors.phone}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 ml-1">{t('form.cp')}</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="text"
                                            maxLength={5}
                                            value={formData.postalCode}
                                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                            className={`w-full bg-white/5 border ${errors.cp ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm`}
                                            placeholder="28001"
                                        />
                                    </div>
                                    {errors.cp && <p className="text-[10px] text-red-400 ml-1">{errors.cp}</p>}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-xs font-medium text-slate-400 ml-1">{t('form.lang')}</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, language: 'es' })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${formData.language === 'es' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        🇪🇸 Español
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, language: 'en' })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${formData.language === 'en' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        🇬🇧 English
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">{t('profile.severities')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['red', 'orange', 'yellow', 'green'].map(sev => (
                                        <button
                                            key={sev}
                                            type="button"
                                            onClick={() => toggleSeverity(sev)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-medium ${formData.preferredSeverities?.includes(sev)
                                                    ? 'bg-white/10 border-blue-500/50 text-white'
                                                    : 'bg-white/5 border-transparent text-slate-500 opacity-60'
                                                }`}
                                        >
                                            <div className={`w-3 h-3 rounded-full ${sev === 'red' ? 'bg-red-500' :
                                                    sev === 'orange' ? 'bg-orange-500' :
                                                        sev === 'yellow' ? 'bg-yellow-400' : 'bg-emerald-500'
                                                }`} />
                                            {t(`severity.${sev}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">{t('profile.event_types')}</label>
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {[
                                        { id: 'Lluvias y Tormentas', label: 'event.rain' },
                                        { id: 'Viento', label: 'event.wind' },
                                        { id: 'Nevadas', label: 'event.snow' },
                                        { id: 'Fenómenos Costeros', label: 'event.coastal' },
                                        { id: 'Temperaturas Extremas', label: 'event.temp' }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => toggleEventType(type.id)}
                                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all text-sm ${formData.preferredEventTypes?.includes(type.id)
                                                    ? 'bg-blue-600/20 border-blue-500/50 text-white shadow-inner'
                                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <span>{t(type.label)}</span>
                                            {formData.preferredEventTypes?.includes(type.id) && (
                                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {formData.preferredEventTypes?.length === 0 && (
                                    <p className="text-[10px] text-slate-500 italic text-center">{t('profile.all_types')}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('profile.saving')}
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                {t('profile.save')}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
