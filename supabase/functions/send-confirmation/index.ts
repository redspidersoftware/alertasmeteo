// Follow this setup guide to integrate Resend with Supabase Edge Functions:
// https://resend.com/docs/send-with-supabase-edge-functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    const { email, name, preferences } = await req.json()

    // Build a summary of preferences
    const severities = preferences.preferredSeverities?.join(', ') || 'Todas'
    const types = preferences.preferredEventTypes?.length > 0
        ? preferences.preferredEventTypes.join(', ')
        : 'Todos'

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: 'Alertas Meteo <onboarding@resend.dev>', // You should change this to your verified domain later
            to: [email],
            subject: 'Tus preferencias de alertas han sido actualizadas',
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
        }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
})
