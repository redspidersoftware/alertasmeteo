import { beforeEach, describe, expect, it } from 'vitest';
import type { WeatherAlert } from '../types';
import { loadAlertsCache, saveAlertsCache } from './alertsCache';

const STORAGE_KEY = 'meteoalerta-alerts-cache';

const makeAlert = (id: string): WeatherAlert =>
  ({ id, severity: 'red', language: 'es-ES' }) as unknown as WeatherAlert;

describe('alertsCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('guarda y recupera alertas con su timestamp', () => {
    const alerts = [makeAlert('a1'), makeAlert('a2')];
    saveAlertsCache(alerts);

    const cached = loadAlertsCache();
    expect(cached).not.toBeNull();
    expect(cached!.alerts).toHaveLength(2);
    expect(cached!.alerts[0].id).toBe('a1');
    expect(typeof cached!.savedAt).toBe('number');
    expect(cached!.savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('devuelve null si no hay caché', () => {
    expect(loadAlertsCache()).toBeNull();
  });

  it('devuelve null si el JSON está corrupto', () => {
    localStorage.setItem(STORAGE_KEY, '{esto no es json');
    expect(loadAlertsCache()).toBeNull();
  });

  it('devuelve null si la estructura no es válida', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ alerts: 'nope', savedAt: 1 }));
    expect(loadAlertsCache()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ alerts: [], savedAt: 'ayer' }));
    expect(loadAlertsCache()).toBeNull();
  });

  it('sobrescribe la caché anterior', () => {
    saveAlertsCache([makeAlert('old')]);
    saveAlertsCache([makeAlert('new1'), makeAlert('new2')]);

    const cached = loadAlertsCache();
    expect(cached!.alerts).toHaveLength(2);
    expect(cached!.alerts[0].id).toBe('new1');
  });
});
