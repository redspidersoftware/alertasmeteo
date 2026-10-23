import { describe, expect, it } from 'vitest';
import { validateEmail, validatePhone, validatePostalCode } from './userService';

describe('validateEmail', () => {
    it('acepta emails válidos', () => {
        expect(validateEmail('user@example.com')).toBe(true);
        expect(validateEmail('a.b+c@sub.dominio.es')).toBe(true);
        expect(validateEmail('ñandú@correo.gob.es')).toBe(true);
    });

    it('rechaza emails mal formados', () => {
        expect(validateEmail('')).toBe(false);
        expect(validateEmail('no-arroba.com')).toBe(false);
        expect(validateEmail('user@')).toBe(false);
        expect(validateEmail('@dominio.com')).toBe(false);
        expect(validateEmail('user dominio.com')).toBe(false);
        expect(validateEmail('user@dominio')).toBe(false);
    });
});

describe('validatePhone', () => {
    it('acepta móviles y fijos españoles con o sin prefijo', () => {
        expect(validatePhone('612345678')).toBe(true);
        expect(validatePhone('712345678')).toBe(true);
        expect(validatePhone('912345678')).toBe(true);
        expect(validatePhone('612 345 678')).toBe(true);
        expect(validatePhone('+34612345678')).toBe(true);
        expect(validatePhone('0034612345678')).toBe(true);
        expect(validatePhone('34612345678')).toBe(true);
    });

    it('rechaza números inválidos', () => {
        expect(validatePhone('')).toBe(false);
        expect(validatePhone('512345678')).toBe(false);
        expect(validatePhone('61234567')).toBe(false);
        expect(validatePhone('6123456789')).toBe(false);
        expect(validatePhone('abcdefghi')).toBe(false);
    });
});

describe('validatePostalCode', () => {
    it('acepta códigos postales españoles (provincias 01-52)', () => {
        expect(validatePostalCode('28001')).toBe(true);
        expect(validatePostalCode('01001')).toBe(true);
        expect(validatePostalCode('52001')).toBe(true);
        expect(validatePostalCode('08001')).toBe(true);
    });

    it('rechaza CP fuera de rango o mal formados', () => {
        expect(validatePostalCode('00000')).toBe(false);
        expect(validatePostalCode('53001')).toBe(false);
        expect(validatePostalCode('1234')).toBe(false);
        expect(validatePostalCode('123456')).toBe(false);
        expect(validatePostalCode('2800a')).toBe(false);
        expect(validatePostalCode('')).toBe(false);
        expect(validatePostalCode(' 28001')).toBe(false);
    });
});
