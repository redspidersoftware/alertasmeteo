import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_TOKEN_SECRET = Deno.env.get('ADMIN_TOKEN_SECRET')
const ADMIN_USERNAME = Deno.env.get('ADMIN_USERNAME')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyToken(token: string): Promise<boolean> {
    if (!ADMIN_TOKEN_SECRET || !ADMIN_USERNAME || !token) return false
    const parts = token.split('.')
    if (parts.length !== 2) return false
    const expiresAt = parseInt(parts[0], 10)
    if (!expiresAt || Date.now() > expiresAt) return false

    const payload = `${ADMIN_USERNAME}:${expiresAt}`
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(ADMIN_TOKEN_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    return expected === parts[1]
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { token, action, userId, targetEmail } = await req.json()

        const valid = await verifyToken(token)
        if (!valid) {
            return new Response(JSON.stringify({ success: false, error: 'Sesión no válida. Inicia sesión de nuevo.' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        if (action === 'list') {
            // Public users profile data
            const { data: publicUsers, error: pubError } = await adminSupabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })

            if (pubError) throw pubError

            // Auth users for email verification status
            const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers()
            if (authError) throw authError

            const authMap = new Map(authData.users.map(u => [u.id, u]))

            const users = (publicUsers || []).map(u => {
                const auth = authMap.get(u.id)
                return {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    phone: u.phone,
                    postalCode: u.postal_code,
                    language: u.language,
                    isVerified: u.is_verified ?? auth?.email_confirmed_at != null,
                    createdAt: u.created_at,
                    preferredSeverities: u.preferred_severities || [],
                    preferredEventTypes: u.preferred_event_types || [],
                }
            })

            const stats = {
                total: users.length,
                verified: users.filter(u => u.isVerified).length,
                withPostalCode: users.filter(u => u.postalCode).length,
            }

            return new Response(JSON.stringify({ success: true, users, stats }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (action === 'delete') {
            if (!userId && !targetEmail) {
                throw new Error("Se requiere userId o targetEmail")
            }

            let uid = userId

            if (!uid && targetEmail) {
                const { data: authData } = await adminSupabase.auth.admin.listUsers()
                const found = authData?.users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase())
                if (found) uid = found.id
            }

            if (uid) {
                await adminSupabase.from('users').delete().eq('id', uid)
                const { error: delError } = await adminSupabase.auth.admin.deleteUser(uid)
                if (delError) throw delError
            } else if (targetEmail) {
                const { error: pubDelError } = await adminSupabase
                    .from('users')
                    .delete()
                    .eq('email', targetEmail.toLowerCase())
                if (pubDelError) throw pubDelError
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        throw new Error("Acción no reconocida")

    } catch (error) {
        const err = error as Error
        console.error("[AdminAPI Error]", err.message)
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
