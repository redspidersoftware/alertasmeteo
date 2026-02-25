import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        const { email, password } = payload

        if (!email || !password) {
            throw new Error("Email and password are required")
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // 1. Initial client to verify the user identity
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        console.log(`[DeleteUser] Attempting to verify identity for: ${email}`)

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError || !authData.user) {
            console.error(`[DeleteUser] Verification failed for ${email}:`, authError?.message)
            return new Response(JSON.stringify({
                success: false,
                error: 'Credenciales inválidas. No se pudo verificar la identidad para eliminar la cuenta.'
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const userId = authData.user.id
        console.log(`[DeleteUser] User verified. ID: ${userId}. Proceeding with deletion...`)

        // 2. Create Admin client for deletion
        const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Delete from public.users first (if not cascaded)
        // We do this manually to be safe
        const { error: dbError } = await adminSupabase
            .from('users')
            .delete()
            .eq('id', userId)

        if (dbError) {
            console.warn(`[DeleteUser] Warning: Error deleting from public.users table (might already be deleted or schema issue):`, dbError.message)
            // We continue anyway, as the main goal is auth deletion
        }

        // 3. Delete from auth.users (This is the critical part)
        const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error(`[DeleteUser] Error deleting from auth.users:`, deleteError.message)
            throw deleteError
        }

        console.log(`[DeleteUser] Successfully deleted user: ${email}`)

        return new Response(JSON.stringify({
            success: true,
            message: "User account deleted permanently from both auth and public tables."
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        const err = error as Error
        console.error("[DeleteUser Error]", err.message)
        return new Response(JSON.stringify({
            success: false,
            error: err.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
