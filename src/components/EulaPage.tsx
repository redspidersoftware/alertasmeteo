import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Globe } from 'lucide-react';

export const EulaPage = () => {
    const [lang, setLang] = useState<'es' | 'en'>('es');

    return (
        <div className="min-h-screen flex flex-col selection:bg-blue-500/30">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-white/5 px-4 sm:px-8 py-4 flex items-center justify-between">
                <a
                    href="/"
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    {lang === 'es' ? 'Volver al inicio' : 'Back to home'}
                </a>

                <div className="flex items-center gap-2 text-white font-black tracking-tight">
                    <FileText size={20} className="text-blue-400" />
                    <span className="text-gradient">EULA</span>
                </div>

                <button
                    onClick={() => setLang(l => l === 'es' ? 'en' : 'es')}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
                >
                    <Globe size={14} />
                    {lang === 'es' ? '🇬🇧 English' : '🇪🇸 Español'}
                </button>
            </header>

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {lang === 'es' ? <EulaEs /> : <EulaEn />}
                </motion.div>
            </main>

            <footer className="py-8 glass border-t border-white/5 text-center text-slate-500 text-sm font-medium">
                © {new Date().getFullYear()} — <span className="text-gradient font-bold">Alertas Meteo</span>
            </footer>
        </div>
    );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-8">
        <h2 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block" />
            {title}
        </h2>
        <div className="text-slate-300 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
);

const EulaEs = () => (
    <div>
        <div className="mb-10 text-center">
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                Términos y Condiciones de Uso
            </h1>
            <p className="text-slate-400 text-sm">
                Última actualización: 24 de febrero de 2026
            </p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/5 space-y-2">
            <Section title="1. Aceptación de los Términos">
                <p>
                    Al registrarse en <strong className="text-white">Alertas Meteo</strong>, el usuario acepta en su totalidad los presentes
                    Términos y Condiciones de Uso (EULA). Si no está de acuerdo con alguna de las condiciones, deberá
                    abstenerse de utilizar el servicio.
                </p>
            </Section>

            <Section title="2. Descripción del Servicio">
                <p>
                    Alertas Meteo es un servicio de información meteorológica que proporciona avisos y alertas de fenómenos
                    adversos en España, basándose en datos oficiales de la Agencia Estatal de Meteorología (AEMET).
                </p>
                <p>
                    El servicio incluye notificaciones por correo electrónico, Telegram y WhatsApp sobre alertas activas
                    según las preferencias configuradas por el usuario.
                </p>
            </Section>

            <Section title="3. Registro y Datos Personales">
                <p>
                    Para utilizar el servicio de notificaciones, el usuario debe registrarse proporcionando: nombre
                    completo, correo electrónico, número de teléfono móvil y código postal.
                </p>
                <p>
                    Estos datos se almacenan de forma segura y únicamente se utilizarán para el envío de alertas
                    meteorológicas y la gestión de la cuenta del usuario.
                </p>
            </Section>

            <Section title="4. Privacidad y Protección de Datos">
                <p>
                    El tratamiento de los datos personales se realiza conforme al Reglamento General de Protección de
                    Datos (RGPD) y la Ley Orgánica de Protección de Datos y garantía de los derechos digitales (LOPDGDD).
                </p>
                <p>
                    Los datos personales <strong className="text-white">no serán cedidos a terceros</strong> ni utilizados
                    con fines comerciales. El usuario puede ejercer sus derechos de acceso, rectificación, supresión y
                    portabilidad contactando con el administrador del servicio.
                </p>
            </Section>

            <Section title="5. Exactitud de la Información">
                <p>
                    Alertas Meteo actúa como intermediario de los datos proporcionados por AEMET. No garantizamos la
                    exactitud, completitud ni puntualidad de las alertas, ya que éstas dependen de terceros.
                </p>
                <p>
                    El servicio <strong className="text-white">no sustituye</strong> a los canales oficiales de
                    comunicación de emergencias ni a las instrucciones de las autoridades competentes.
                </p>
            </Section>

            <Section title="6. Uso Aceptable">
                <p>El usuario se compromete a:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Proporcionar datos verídicos durante el registro.</li>
                    <li>No utilizar el servicio para fines ilegales o fraudulentos.</li>
                    <li>No intentar acceder de forma no autorizada a los sistemas del servicio.</li>
                </ul>
            </Section>

            <Section title="7. Limitación de Responsabilidad">
                <p>
                    Alertas Meteo no será responsable de ningún daño, directo o indirecto, derivado del uso o la
                    imposibilidad de uso del servicio, incluyendo fallos técnicos, interrupciones o errores en la
                    información meteorológica.
                </p>
            </Section>

            <Section title="8. Modificaciones">
                <p>
                    Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios significativos
                    serán comunicados a los usuarios registrados por correo electrónico.
                </p>
            </Section>

            <Section title="9. Cancelación del Servicio">
                <p>
                    El usuario puede darse de baja del servicio en cualquier momento, solicitando la eliminación de su
                    cuenta. Esto conllevará la eliminación de todos sus datos personales del sistema.
                </p>
            </Section>

            <Section title="10. Contacto">
                <p>
                    Para cualquier consulta relacionada con estos Términos o con tus datos personales, puedes contactar
                    con nosotros a través del correo electrónico disponible en la plataforma.
                </p>
            </Section>
        </div>
    </div>
);

const EulaEn = () => (
    <div>
        <div className="mb-10 text-center">
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                End User License Agreement
            </h1>
            <p className="text-slate-400 text-sm">
                Last updated: February 24, 2026
            </p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/5 space-y-2">
            <Section title="1. Acceptance of Terms">
                <p>
                    By registering with <strong className="text-white">Alertas Meteo</strong>, the user fully accepts
                    these Terms and Conditions of Use (EULA). If you do not agree with any of the conditions, you must
                    refrain from using the service.
                </p>
            </Section>

            <Section title="2. Service Description">
                <p>
                    Alertas Meteo is a meteorological information service that provides warnings and alerts about severe
                    weather events in Spain, based on official data from the Spanish Meteorological Agency (AEMET).
                </p>
                <p>
                    The service includes notifications via email, Telegram, and WhatsApp about active alerts according
                    to user-configured preferences.
                </p>
            </Section>

            <Section title="3. Registration and Personal Data">
                <p>
                    To use the notification service, users must register by providing: full name, email address, mobile
                    phone number, and postal code.
                </p>
                <p>
                    This data is stored securely and will only be used to send weather alerts and manage the user account.
                </p>
            </Section>

            <Section title="4. Privacy and Data Protection">
                <p>
                    Personal data is processed in compliance with the General Data Protection Regulation (GDPR) and
                    applicable Spanish data protection law.
                </p>
                <p>
                    Personal data <strong className="text-white">will not be shared with third parties</strong> or used
                    for commercial purposes. Users can exercise their rights of access, rectification, erasure, and
                    portability by contacting the service administrator.
                </p>
            </Section>

            <Section title="5. Accuracy of Information">
                <p>
                    Alertas Meteo acts as an intermediary for data provided by AEMET. We do not guarantee the accuracy,
                    completeness, or timeliness of alerts, as these depend on third parties.
                </p>
                <p>
                    The service <strong className="text-white">does not replace</strong> official emergency communication
                    channels or instructions from competent authorities.
                </p>
            </Section>

            <Section title="6. Acceptable Use">
                <p>The user agrees to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Provide truthful data during registration.</li>
                    <li>Not use the service for illegal or fraudulent purposes.</li>
                    <li>Not attempt unauthorized access to the service systems.</li>
                </ul>
            </Section>

            <Section title="7. Limitation of Liability">
                <p>
                    Alertas Meteo shall not be liable for any direct or indirect damages resulting from the use or
                    inability to use the service, including technical failures, interruptions, or errors in weather
                    information.
                </p>
            </Section>

            <Section title="8. Modifications">
                <p>
                    We reserve the right to modify these Terms at any time. Significant changes will be communicated to
                    registered users via email.
                </p>
            </Section>

            <Section title="9. Service Cancellation">
                <p>
                    Users may unsubscribe from the service at any time by requesting account deletion. This will result
                    in the removal of all personal data from the system.
                </p>
            </Section>

            <Section title="10. Contact">
                <p>
                    For any queries related to these Terms or your personal data, please contact us via the email
                    address available on the platform.
                </p>
            </Section>
        </div>
    </div>
);
