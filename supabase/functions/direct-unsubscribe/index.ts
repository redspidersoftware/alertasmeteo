import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyToken(email: string, token: string): Promise<boolean> {
    if (!UNSUBSCRIBE_SECRET) return false
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(UNSUBSCRIBE_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.toLowerCase().trim()))
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    return expected === token
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, token } = await req.json()

        if (!email || !token) {
            throw new Error("Email and token are required")
        }

        const valid = await verifyToken(email, token)
        if (!valid) {
            return new Response(JSON.stringify({ success: false, error: 'Token inválido o caducado.' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Find user by email in auth
        const { data: userData, error: listError } = await adminSupabase.auth.admin.listUsers()
        if (listError) throw listError

        const authUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())

        if (authUser) {
            // Delete from public.users first
            await adminSupabase.from('users').delete().eq('id', authUser.id)
            // Delete from auth.users
            const { error: delError } = await adminSupabase.auth.admin.deleteUser(authUser.id)
            if (delError) throw delError
            console.log(`[DirectUnsubscribe] Deleted auth user: ${email}`)
        } else {
            // Maybe only exists in public.users
            const { error: pubDelError } = await adminSupabase
                .from('users')
                .delete()
                .eq('email', email.toLowerCase().trim())
            if (pubDelError) throw pubDelError
            console.log(`[DirectUnsubscribe] Deleted public user (no auth match): ${email}`)
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        const err = error as Error
        console.error("[DirectUnsubscribe Error]", err.message)
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
