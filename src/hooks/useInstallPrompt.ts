import { useState, useEffect } from 'react';

type InstallState = 'installable' | 'installed' | 'ios' | 'unsupported';

interface UseInstallPromptReturn {
    installState: InstallState;
    install: () => Promise<void>;
    isIOS: boolean;
}

export function useInstallPrompt(): UseInstallPromptReturn {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [installState, setInstallState] = useState<InstallState>('unsupported');

    const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    useEffect(() => {
        // Si ya está instalada (modo standalone)
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as any).standalone === true;

        if (isStandalone) {
            setInstallState('installed');
            return;
        }

        // iOS no soporta beforeinstallprompt — instrucciones manuales
        if (isIOS) {
            setInstallState('ios');
            return;
        }

        // Capturar el evento de instalación en Chrome/Edge/Android
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setInstallState('installable');
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Detectar si se instaló
        const installedHandler = () => setInstallState('installed');
        window.addEventListener('appinstalled', installedHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installedHandler);
        };
    }, [isIOS]);

    const install = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallState('installed');
        }
        setDeferredPrompt(null);
    };

    return { installState, install, isIOS };
}
