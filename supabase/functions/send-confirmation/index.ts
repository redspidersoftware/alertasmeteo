import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const SMTP_USER = Deno.env.get('SMTP_USER')
const SMTP_PASS = Deno.env.get('SMTP_PASS') // Gmail App Password

serve(async (req) => {
    try {
        const { email, name, preferences } = await req.json()

        // Build a summary of preferences
        const severities = preferences.preferredSeverities?.join(', ') || 'Todas'
        const types = preferences.preferredEventTypes?.length > 0
            ? preferences.preferredEventTypes.join(', ')
            : 'Todos'

        const client = new SmtpClient();

        await client.connectTLS({
            hostname: "smtp.gmail.com",
            port: 465, // Use 465 for TLS or 587 (with different config)
            username: SMTP_USER,
            password: SMTP_PASS,
        });

        await client.send({
            from: SMTP_USER!, // Gmail requires matching sender and authenticated user
            to: email,
            subject: "Tus preferencias de alertas han sido actualizadas",
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

        await client.close();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("Error sending email:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})
