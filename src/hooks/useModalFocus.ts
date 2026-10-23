import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accesibilidad de modales: Escape para cerrar, foco dentro del panel
 * (trap con Tab), foco inicial en el panel y devolución del foco al
 * elemento que lo abrió. También bloquea el scroll del body.
 *
 * `onClose` debe ser estable (useCallback) para no re-ejecutar el efecto
 * en cada render.
 */
export function useModalFocus(
    isOpen: boolean,
    onClose: () => void,
    containerRef: RefObject<HTMLElement | null>
): void {
    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        // El panel todavía no está montado al montar el efecto: enfocar en el
        // siguiente frame, cuando React haya colocado el ref.
        const frame = requestAnimationFrame(() => containerRef.current?.focus());

        const onKeyDown = (event: KeyboardEvent) => {
            const panel = containerRef.current;
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !panel) return;

            const focusables = Array.from(
                panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            ).filter((el) => el.getClientRects().length > 0 || el === document.activeElement);

            if (focusables.length === 0) {
                event.preventDefault();
                panel.focus();
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || active === panel || !panel.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !panel.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown, true);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('keydown', onKeyDown, true);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [isOpen, onClose, containerRef]);
}
