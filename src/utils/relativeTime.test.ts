import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relativeTime';

const NOW = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

describe('formatRelativeTime', () => {
  it('muestra "ahora mismo" para menos de un minuto', () => {
    expect(formatRelativeTime(NOW, NOW)).toBe('ahora mismo');
    expect(formatRelativeTime(NOW - 59_000, NOW)).toBe('ahora mismo');
  });

  it('muestra minutos hasta llegar a la hora', () => {
    expect(formatRelativeTime(NOW - MIN, NOW)).toBe('hace 1 min');
    expect(formatRelativeTime(NOW - 5 * MIN, NOW)).toBe('hace 5 min');
    expect(formatRelativeTime(NOW - 59 * MIN, NOW)).toBe('hace 59 min');
  });

  it('muestra horas hasta llegar al día', () => {
    expect(formatRelativeTime(NOW - HOUR, NOW)).toBe('hace 1 h');
    expect(formatRelativeTime(NOW - 3 * HOUR, NOW)).toBe('hace 3 h');
    expect(formatRelativeTime(NOW - 23 * HOUR, NOW)).toBe('hace 23 h');
  });

  it('muestra más de 24 h a partir del día completo', () => {
    expect(formatRelativeTime(NOW - 24 * HOUR, NOW)).toBe('hace más de 24 h');
  });

  it('nunca devuelve tiempos negativos si el reloj va "atrás"', () => {
    expect(formatRelativeTime(NOW + 10_000, NOW)).toBe('ahora mismo');
  });
});
