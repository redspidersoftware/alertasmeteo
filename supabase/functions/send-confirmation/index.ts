import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer"

const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS') // Gmail App Password

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const isTest = req.method === 'GET'
    console.log(`[Function] Method: ${req.method} | Test mode: ${isTest}`)

    try {
        let email: string, name: string, preferences: any

        if (isTest) {
            email = SMTP_USER || ""
            name = "Test User"
            preferences = { preferredSeverities: ['test-severity'], preferredEventTypes: ['test-event'] }
            console.log("[Test] Running connectivity test to:", email)
        } else {
            const payload = await req.json()
            email = payload.email
            name = payload.name
            preferences = payload.preferences
            console.log(`[Prod] Sending to: ${email}`)
        }

        if (!SMTP_USER || !SMTP_PASS) {
            throw new Error("Missing SMTP_USER or SMTP_PASS secrets in Supabase")
        }

        // Build a summary of preferences
        const severities = preferences.preferredSeverities?.join(', ') || 'Todas'
        const types = preferences.preferredEventTypes?.length > 0
            ? preferences.preferredEventTypes.sort().join(', ')
            : 'Todos'

        console.log("[SMTP] Creating transporter...")
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // Use SSL
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        console.log("[SMTP] Sending mail via Nodemailer...")
        const info = await transporter.sendMail({
            from: `"Alertas Meteo" <${SMTP_USER}>`,
            to: email,
            subject: isTest ? "Prueba de conexión SMTP (Nodemailer)" : "Tus preferencias de alertas han sido actualizadas",
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">¡Hola ${name}!</h2>
          <p>Te confirmamos que hemos actualizado tus preferencias de visualización de alertas meteorológicas.</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Niveles de gravedad:</strong> ${severities}</p>
            <p><strong>Tipos de avisos:</strong> ${types}</p>
          </div>
          
          <p>A partir de ahora, verás los avisos filtrados según esta configuración cuando inicies sesión.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b;">Este es un mensaje automático de Alertas Meteo.</p>
        </div>
      `,
        });

        console.log("[SMTP] Success:", info.messageId)

        return new Response(JSON.stringify({
            success: true,
            messageId: info.messageId,
            message: isTest ? "SMTP Test successful via Nodemailer! Check your inbox." : "Email sent successfully",
            debug: { user: SMTP_USER, target: email }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (err: any) {
        console.error("[SMTP Error]", err);
        return new Response(JSON.stringify({
            success: false,
            error: err.message,
            stack: err.stack,
            hint: "Ensure you are using a Gmail App Password, not your regular password. Also check SMTP_USER secret."
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
