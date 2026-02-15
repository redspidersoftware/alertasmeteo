import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS') // Gmail App Password

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const isTest = req.method === 'GET'
    console.log(`[Function] Method: ${req.method} | Test mode: ${isTest}`)

    try {
        let email, name, preferences

        if (isTest) {
            email = SMTP_USER // Test send to self
            name = "Test User"
            preferences = { preferredSeverities: ['test'], preferredEventTypes: ['test'] }
            console.log("[Test] Running connectivity test...")
        } else {
            const payload = await req.json()
            email = payload.email
            name = payload.name
            preferences = payload.preferences
            console.log(`[Prod] Sending to: ${email}`)
        }

        if (!SMTP_USER || !SMTP_PASS) {
            throw new Error("Missing SMTP_USER or SMTP_PASS secrets")
        }

        // Build a summary of preferences
        const severities = preferences.preferredSeverities?.join(', ') || 'Todas'
        const types = preferences.preferredEventTypes?.length > 0
            ? preferences.preferredEventTypes.join(', ')
            : 'Todos'

        console.log("[SMTP] Initializing client...")
        const client = new SmtpClient();

        console.log("[SMTP] Connecting to TLS (465)...")
        await client.connectTLS({
            hostname: "smtp.gmail.com",
            port: 465,
            username: SMTP_USER,
            password: SMTP_PASS,
        });
        console.log("[SMTP] Connected successfully")

        console.log("[SMTP] Sending email...")
        await client.send({
            from: SMTP_USER!,
            to: email,
            subject: isTest ? "Prueba de conexión SMTP" : "Tus preferencias de alertas han sido actualizadas",
            content: "text/html",
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
        console.log("[SMTP] Email sent")

        await client.close();
        console.log("[SMTP] Connection closed")

        return new Response(JSON.stringify({
            success: true,
            message: isTest ? "SMTP Test successful! Check your inbox." : "Email sent successfully",
            debug: { user: SMTP_USER, target: email }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })

    } catch (error) {
        console.error("[SMTP Error]", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
            hint: "Check if SMTP_USER and SMTP_PASS (App Password) are correct."
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
    }
})
