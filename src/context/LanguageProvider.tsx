import { useState, type ReactNode } from 'react';
import { LanguageContext, type LanguageContextType } from './LanguageContext';

type Language = 'es' | 'en';

const translations: Record<string, Record<Language, string>> = {
    'app.title': { es: 'AEMET Alertas', en: 'AEMET Alerts' },
    'app.subtitle': { es: 'Tiempo Real', en: 'Real Time' },
    'app.providedBy': { es: 'Datos proporcionados por', en: 'Data provided by' },
    'map.title': { es: 'Mapa de Alertas', en: 'Alert Map' },
    'list.title': { es: 'Listado de Avisos', en: 'Advisory List' },
    'list.subtitle': { es: 'Monitorización de fenómenos adversos en España.', en: 'Monitoring of adverse weather events in Spain.' },
    'alert.expires': { es: 'Expira:', en: 'Expires:' },
    'alert.description': { es: 'Descripción Completa:', en: 'Full Description:' },
    'alert.instructions': { es: 'Instrucciones:', en: 'Instructions:' },
    'loading': { es: 'Cargando alertas...', en: 'Loading alerts...' },
    'error.fetch': { es: 'No se pudieron cargar las alertas.', en: 'Could not load alerts.' },
    'retry': { es: 'Reintentar', en: 'Retry' },
    'no.alerts': { es: 'No hay alertas activas en este momento.', en: 'No active alerts at this moment.' },
    'filter.title': { es: 'Filtrar por Tipo', en: 'Filter by Type' },
    'filter.all': { es: 'Todos los avisos', en: 'All alerts' },

    // Registration Form
    'form.title': { es: 'Alta de Usuario', en: 'User Registration' },
    'form.subtitle': { es: 'Recibe alertas personalizadas', en: 'Get personalized alerts' },
    'form.name': { es: 'Nombre Completo', en: 'Full Name' },
    'form.email': { es: 'Correo Electrónico', en: 'Email Address' },
    'form.phone': { es: 'Teléfono Móvil', en: 'Mobile Phone' },
    'form.cp': { es: 'Código Postal', en: 'Postal Code' },
    'form.lang': { es: 'Idioma Preferido', en: 'Preferred Language' },
    'form.submit': { es: 'Registrar', en: 'Register' },
    'form.success': { es: 'Usuario registrado. Revisa tu email para verificar la cuenta.', en: 'User registered. Please check email to verify account.' }, // Updated
    'form.error.email': { es: 'Email inválido', en: 'Invalid Email' },
    'form.error.phone': { es: 'Teléfono inválido (España)', en: 'Invalid Phone (Spain)' },
    'form.error.cp': { es: 'Código Postal inválido', en: 'Invalid Postal Code' },
    'form.cancel': { es: 'Cancelar', en: 'Cancel' },
    'form.eula': { es: 'He leído y acepto los', en: 'I have read and accept the' },
    'form.eula.link': { es: 'Términos y Condiciones de Uso (EULA)', en: 'End User License Agreement (EULA)' },
    'form.error.eula': { es: 'Debes aceptar los términos para continuar', en: 'You must accept the terms to continue' },

    // Login Form
    'login.title': { es: 'Iniciar Sesión', en: 'Log In' },
    'login.submit': { es: 'Entrar', en: 'Login' },
    'login.success': { es: 'Sesión iniciada correctamente', en: 'Logged in successfully' },
    'login.error.creds': { es: 'Credenciales inválidas', en: 'Invalid credentials' },
    'login.error.unverified': { es: 'Cuenta no verificada. Revisa tu email.', en: 'Account not verified. Check your email.' },
    'auth.logout': { es: 'Cerrar Sesión', en: 'Log Out' },
    'auth.welcome': { es: 'Hola,', en: 'Hello,' },
    'profile.title': { es: 'Configuración de Perfil', en: 'Profile Settings' },
    'profile.subtitle': { es: 'Actualiza tus datos personales', en: 'Update your personal details' },
    'profile.save': { es: 'Guardar Cambios', en: 'Save Changes' },
    'profile.saving': { es: 'Guardando...', en: 'Saving...' },
    'profile.success': { es: 'Perfil actualizado correctamente', en: 'Profile updated successfully' },
    'profile.error': { es: 'Error al actualizar el perfil', en: 'Error updating profile' },
    'footer.donate': { es: 'Apoyar el proyecto (PayPal)', en: 'Support the project (PayPal)' },
    'footer.donate_bmc': { es: 'Invitame a un café (BMC)', en: 'Buy Me a Coffee (BMC)' },
    'footer.donate_desc': { es: 'Si te gusta el servicio, considera hacer una donación para ayudar a mantenerlo.', en: 'If you like the service, consider making a donation to help maintain it.' },

    // Preferences Tab
    'profile.tab.basic': { es: 'Datos Básicos', en: 'Basic Info' },
    'profile.tab.prefs': { es: 'Preferencias', en: 'Preferences' },
    'profile.severities': { es: 'Niveles de Gravedad', en: 'Severity Levels' },
    'profile.event_types': { es: 'Tipos de Fenómenos', en: 'Event Types' },
    'profile.all_types': { es: 'Todos los tipos', en: 'All types' },

    // Severity Labels
    'severity.red': { es: 'Rojo (Extremo)', en: 'Red (Extreme)' },
    'severity.orange': { es: 'Naranja (Importante)', en: 'Orange (Severe)' },
    'severity.yellow': { es: 'Amarillo (Riesgo)', en: 'Yellow (Moderate)' },
    'severity.green': { es: 'Sin riesgo', en: 'No risk' },

    // Common Event Types
    'event.rain': { es: 'Lluvia', en: 'Rain' },
    'event.storms': { es: 'Tormentas', en: 'Storms' },
    'event.wind': { es: 'Viento', en: 'Wind' },
    'event.snow': { es: 'Nieve', en: 'Snow' },
    'event.coastal': { es: 'Costeros', en: 'Coastal' },
    'event.temp': { es: 'Temperaturas', en: 'Temperatures' },

    // Email Notifications
    'email.subject': { es: 'Tus preferencias han cambiado', en: 'Your preferences have changed' },
    'email.body_header': { es: 'Hola, hemos actualizado tus preferencias de alertas:', en: 'Hi, we have updated your alert preferences:' },
    'email.success_sent': { es: 'Se ha enviado un correo de confirmación', en: 'A confirmation email has been sent' },

    // UI Revamp
    'event.filtered_by': { es: 'Filtrado por', en: 'Filtered by' },
    'footer.donate_title': { es: 'Apoya el Proyecto', en: 'Support the Project' }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>('es');

    const t = (key: string) => {
        return translations[key]?.[language] || key;
    };

    const value: LanguageContextType = { language, setLanguage, t };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
