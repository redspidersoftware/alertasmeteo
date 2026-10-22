import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ADMIN_USERNAME = Deno.env.get('ADMIN_USERNAME')
const ADMIN_PASS = Deno.env.get('ADMIN_PASS')
const ADMIN_TOKEN_SECRET = Deno.env.get('ADMIN_TOKEN_SECRET')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Constant-time comparison to avoid timing attacks
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let result = 0
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
}

async function signToken(username: string, expiresAt: number): Promise<string> {
    const payload = `${username}:${expiresAt}`
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(ADMIN_TOKEN_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    return `${expiresAt}.${hex}`
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (!ADMIN_USERNAME || !ADMIN_PASS || !ADMIN_TOKEN_SECRET) {
            throw new Error("ADMIN_USERNAME, ADMIN_PASS or ADMIN_TOKEN_SECRET secrets are not set.")
        }

        const { username, password } = await req.json()

        if (!username || !password) {
            throw new Error("Usuario y contraseña requeridos")
        }

        const userOk = timingSafeEqual(String(username), ADMIN_USERNAME)
        const passOk = timingSafeEqual(String(password), ADMIN_PASS)

        if (!userOk || !passOk) {
            // Small delay to slow brute force
            await new Promise(r => setTimeout(r, 500))
            return new Response(JSON.stringify({ success: false, error: 'Credenciales incorrectas' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const expiresAt = Date.now() + (12 * 60 * 60 * 1000) // 12 hours
        const token = await signToken(ADMIN_USERNAME, expiresAt)

        return new Response(JSON.stringify({ success: true, token, expiresAt }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        const err = error as Error
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
