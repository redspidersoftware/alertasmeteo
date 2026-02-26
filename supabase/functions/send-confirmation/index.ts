import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"

const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

            if (type === 'contact') {
                const contactEmail = payload.email || 'No proporcionado'
                subject = `[Contacto] ${payload.subject || 'Sin asunto'}`
                html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2563eb;">Nuevo mensaje de contacto</h2>
                        <p><strong>De:</strong> ${name} (${contactEmail})</p>
                        <p><strong>Asunto:</strong> ${payload.subject}</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="white-space: pre-wrap; color: #334155;">${payload.message || 'Sin mensaje'}</p>
                        </div>
                        <p style="font-size: 12px; color: #64748b;">Mensaje enviado desde Alertas Meteo.</p>
                    </div>
                `
                email = "ochentainueve@gmail.com" // Recibir el contacto aquí
            } else {
                email = payload.email
                const preferences = payload.preferences || {}
                const severities = preferences.preferredSeverities?.join(', ') || 'Todas'
                const eventTypes = preferences.preferredEventTypes && preferences.preferredEventTypes.length > 0
                    ? preferences.preferredEventTypes.sort().join(', ')
                    : 'Todos'
                const appUrl = payload.appUrl || "https://alertas-meteo.vercel.app"

                subject = "Tus preferencias de alertas han sido actualizadas"
                html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2563eb;">¡Hola ${name}!</h2>
                        <p>Te confirmamos que hemos actualizado tus preferencias de visualización de alertas meteorológicas.</p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Niveles de gravedad:</strong> ${severities}</p>
                            <p><strong>Tipos de avisos:</strong> ${eventTypes}</p>
                        </div>
                        <p>A partir de ahora, verás los avisos filtrados según esta configuración cuando inicies sesión.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #64748b;">¿Ya no deseas recibir estas alertas? <a href="${appUrl}/unsubscribe" style="color: #2563eb;">Darme de baja aquí</a>.</p>
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
