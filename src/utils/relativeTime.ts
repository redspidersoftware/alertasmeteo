/** "hace X min" para la cabecera de alertas. `now` se inyecta para poder testear. */
export function formatRelativeTime(timestamp: number, now: number): string {
    const diffMs = Math.max(0, now - timestamp);
    const minutes = Math.floor(diffMs / 60_000);

    if (minutes < 1) return 'ahora mismo';
    if (minutes === 1) return 'hace 1 min';
    if (minutes < 60) return `hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'hace 1 h';
    if (hours < 24) return `hace ${hours} h`;

    return 'hace más de 24 h';
}
