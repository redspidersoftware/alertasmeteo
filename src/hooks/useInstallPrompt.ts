import { useState, useEffect } from 'react';

type InstallState = 'installable' | 'installed' | 'ios' | 'unsupported';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UseInstallPromptReturn {
    installState: InstallState;
    install: () => Promise<void>;
    isIOS: boolean;
}

const isStandaloneMode = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);

export function useInstallPrompt(): UseInstallPromptReturn {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installState, setInstallState] = useState<InstallState>(() => {
        if (isStandaloneMode()) return 'installed';
        if (isIOS) return 'ios';
        return 'unsupported';
    });

    useEffect(() => {
        // Capturar el evento de instalación en Chrome/Edge/Android
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
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
    }, []);

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
