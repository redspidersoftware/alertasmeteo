import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"

const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')
const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET')
const SUPPORT_EMAIL = Deno.env.get('SUPPORT_EMAIL') || 'ochentainueve@gmail.com'
const WORKER_URL = (Deno.env.get('WORKER_URL') || 'https://aemet-supabase-service.alertasmeteo.workers.dev').replace(/\/$/, '')
const WORKER_USER = Deno.env.get('WORKER_USER')
const WORKER_PASS = Deno.env.get('WORKER_PASS')

// Destino de los formularios de contacto: la clave 'support_email' de la
// configuración del dashboard (editable desde el panel admin) tiene
// prioridad sobre el secret SUPPORT_EMAIL.
let cachedSupportEmail: { value: string; expires: number } | null = null

async function resolveSupportEmail(): Promise<string> {
    if (cachedSupportEmail && cachedSupportEmail.expires > Date.now()) return cachedSupportEmail.value
    if (!WORKER_USER || !WORKER_PASS) return SUPPORT_EMAIL
    try {
        const login = await fetch(`${WORKER_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(WORKER_USER)}&password=${encodeURIComponent(WORKER_PASS)}`,
            redirect: 'manual',
        })
        const match = (login.headers.get('Set-Cookie') || '').match(/session=([^;]+)/)
        if (!match) return SUPPORT_EMAIL
        const resp = await fetch(`${WORKER_URL}/api/config`, {
            headers: { 'Cookie': `session=${match[1]}` },
            redirect: 'manual',
        })
        const data = await resp.json()
        const value = typeof data?.config?.support_email === 'string' ? data.config.support_email.trim() : ''
        if (value.includes('@')) {
            cachedSupportEmail = { value, expires: Date.now() + 10 * 60 * 1000 }
            return value
        }
    } catch { /* sin configuración en el worker → secret */ }
    return SUPPORT_EMAIL
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function generateToken(email: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(UNSUBSCRIBE_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.toLowerCase().trim()))
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const escapeHtml = (v: string): string => String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

function unsubscribeFooter(appUrl: string, email: string, token: string): string {
    const link = `${appUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`
    return `
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b; text-align: center;">
            ¿Ya no deseas recibir estos correos?
            <a href="${link}" style="color: #dc2626; font-weight: bold; text-decoration: underline;">
                Darse de baja y eliminar mi cuenta
            </a>
        </p>
        <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 10px;">
            Este es un mensaje automático de Alertas Meteo.
        </p>
    `
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const isTest = req.method === 'GET'

        if (!SMTP_USER || !SMTP_PASS) {
            throw new Error("SMTP_USER or SMTP_PASS secrets are not set in Supabase project settings.")
        }
        if (!UNSUBSCRIBE_SECRET) {
            throw new Error("UNSUBSCRIBE_SECRET secret is not set in Supabase project settings.")
        }

        let email: string, name: string, subject: string, html: string;

        if (isTest) {
            email = SMTP_USER
            name = "Test User"
            subject = "Prueba de conexión SMTP (Nodemailer)"
            html = "<h1>La conexión SMTP funciona correctamente</h1>"
        } else {
            const payload = await req.json()
            const type = payload.type || 'confirmation'
            name = payload.name || 'Usuario'
            const appUrl = payload.appUrl || "https://alertasmeteo.vercel.app"

            if (type === 'contact') {
                const contactEmail = payload.email || 'No proporcionado'
                subject = `[Contacto] ${payload.subject || 'Sin asunto'}`
                const token = await generateToken(contactEmail !== 'No proporcionado' ? contactEmail : 'admin@alertasmeteo')
                html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2563eb;">Nuevo mensaje de contacto</h2>
                        <p><strong>De:</strong> ${escapeHtml(name)} (${escapeHtml(contactEmail)})</p>
                        <p><strong>Asunto:</strong> ${escapeHtml(payload.subject || 'Sin asunto')}</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="white-space: pre-wrap; color: #334155;">${escapeHtml(payload.message || 'Sin mensaje')}</p>
                        </div>
                        ${unsubscribeFooter(appUrl, contactEmail, token)}
                    </div>
                `
                email = await resolveSupportEmail()
            } else {
                email = payload.email
                const preferences = payload.preferences || {}

                const severityMap: Record<string, string> = {
                    'red': 'Rojo (Extremo)',
                    'orange': 'Naranja (Importante)',
                    'yellow': 'Amarillo (Riesgo)',
                    'green': 'Sin riesgo'
                }

                const severities = preferences.preferredSeverities
                    ?.map((s: string) => severityMap[s] || s)
                    .join(', ') || 'Todas'

                const eventTypes = preferences.preferredEventTypes && preferences.preferredEventTypes.length > 0
                    ? preferences.preferredEventTypes.sort().join(', ')
                    : 'Todos'

                const dailyForecast = preferences.dailyForecast !== false ? 'Activado' : 'Desactivado'
                const token = await generateToken(email)

                subject = "Tus preferencias de alertas han sido actualizadas"
                html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2563eb;">¡Hola ${name}!</h2>
                        <p>Te confirmamos que hemos actualizado tus preferencias de visualización de alertas meteorológicas.</p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Resumen diario Telegram:</strong> ${dailyForecast}</p>
                            <p style="margin: 5px 0;"><strong>Niveles de gravedad:</strong> ${severities}</p>
                            <p style="margin: 5px 0;"><strong>Tipos de avisos:</strong> ${eventTypes}</p>
                        </div>
                        <p>A partir de ahora, verás los avisos filtrados según esta configuración cuando inicies sesión.</p>
                        ${unsubscribeFooter(appUrl, email, token)}
                    </div>
                `
            }
        }

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Alertas Meteo" <${SMTP_USER}>`,
            to: email,
            subject: subject,
            html: html,
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
