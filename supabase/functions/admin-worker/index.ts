import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ADMIN_TOKEN_SECRET = Deno.env.get('ADMIN_TOKEN_SECRET')
const ADMIN_USERNAME = Deno.env.get('ADMIN_USERNAME')
const WORKER_URL = (Deno.env.get('WORKER_URL') || 'https://aemet-supabase-service.alertasmeteo.workers.dev').replace(/\/$/, '')
const WORKER_USER = Deno.env.get('WORKER_USER')
const WORKER_PASS = Deno.env.get('WORKER_PASS')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Whitelisted test endpoints (prevents SSRF)
const ALLOWED_TESTS = new Set([
    '/test-cron',
    '/test-image',
    '/test-info',
    '/test-email',
    '/test-map',
    '/test-summary',
    '/test-daily-forecast-telegram',
    '/test-telegram-summary',
    '/test-push-notification',
    '/test-national-prediction',
    '/test-twitter',
])

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

// Login to the worker and return the session cookie value (cached in isolate memory)
let cachedCookie: { value: string; expires: number } | null = null

async function getWorkerSession(): Promise<string> {
    if (cachedCookie && cachedCookie.expires > Date.now()) return cachedCookie.value
    if (!WORKER_USER || !WORKER_PASS) {
        throw new Error("WORKER_USER / WORKER_PASS secrets no configurados")
    }
    const resp = await fetch(`${WORKER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(WORKER_USER)}&password=${encodeURIComponent(WORKER_PASS)}`,
        redirect: 'manual',
    })
    const setCookie = resp.headers.get('Set-Cookie') || ''
    const match = setCookie.match(/session=([^;]+)/)
    if (!match) {
        throw new Error("No se pudo autenticar contra el worker")
    }
    const cookie = `session=${match[1]}`
    cachedCookie = { value: cookie, expires: Date.now() + 9 * 60 * 1000 }
    return cookie
}

async function workerGet(path: string, cookie: string): Promise<Response> {
    return await fetch(`${WORKER_URL}${path}`, {
        headers: { 'Cookie': cookie },
        redirect: 'manual',
    })
}

async function workerPost(path: string, cookie: string, body: unknown): Promise<Response> {
    return await fetch(`${WORKER_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify(body),
    })
}

function buildQuery(params: Record<string, unknown> | undefined): string {
    const qs = new URLSearchParams()
    if (params && typeof params === 'object') {
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && String(v).length > 0) qs.append(k, String(v))
        }
    }
    const s = qs.toString()
    return s ? `?${s}` : ''
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { token, action, key, value, path, params } = await req.json()

        const valid = await verifyToken(token)
        if (!valid) {
            return new Response(JSON.stringify({ success: false, error: 'Sesión no válida. Inicia sesión de nuevo.' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const cookie = await getWorkerSession()

        if (action === 'get-config') {
            const resp = await workerGet('/api/config', cookie)
            const data = await resp.json()
            if (!data.success) throw new Error('Error leyendo configuración')
            // Never expose dashboard credentials to the client
            const cfg = { ...data.config }
            delete cfg.dashboard_user
            delete cfg.dashboard_pass
            return json({ success: true, config: cfg })
        }

        if (action === 'save-config') {
            if (!key || value === undefined) throw new Error('Faltan key o value')
            const resp = await fetch(`${WORKER_URL}/api/save-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
                body: JSON.stringify({ key, value }),
            })
            const data = await resp.json()
            if (!data.success) throw new Error(data.message || 'Error al guardar')
            return json({ success: true })
        }

        if (action === 'get-users') {
            const resp = await workerGet('/api/users', cookie)
            const data = await resp.json()
            if (!data.success) throw new Error('Error leyendo usuarios')
            return json({ success: true, users: data.users || [] })
        }

        if (action === 'get-alerts') {
            const resp = await workerGet('/api/recent-alerts', cookie)
            const data = await resp.json()
            if (!data.success) throw new Error('Error leyendo alertas')
            return json({ success: true, alerts: data.alerts || [] })
        }

        if (action === 'get-weather-alerts') {
            const resp = await workerGet(`/api/weather-alerts${buildQuery(params)}`, cookie)
            const data = await resp.json()
            if (!data.success) throw new Error(data.message || 'Error leyendo alertas meteorológicas')
            return json({ success: true, stats: data.stats || {}, alerts: data.alerts || [] })
        }

        if (action === 'get-logs') {
            const resp = await workerGet(`/api/notification-logs${buildQuery(params)}`, cookie)
            const data = await resp.json()
            if (!data.success) throw new Error(data.message || 'Error leyendo notificaciones')
            return json({ success: true, stats: data.stats || {}, logs: data.logs || [] })
        }

        if (action === 'get-postal-codes') {
            const page = Number(params?.page ?? 0)
            if (!Number.isFinite(page) || page < 0 || page > 200) throw new Error('Página no válida')
            const resp = await workerGet(`/api/postal-codes?page=${page}`, cookie)
            const data = await resp.json()
            if (!data.success) throw new Error(data.message || 'Error leyendo códigos postales')
            return json({ success: true, mappings: data.mappings || [] })
        }

        if (action === 'save-postal-code') {
            if (!params?.postal_code || !params?.aemet_zone_name || !params?.province) {
                throw new Error('Faltan datos del código postal')
            }
            const resp = await workerPost('/api/save-postal-code', cookie, {
                postal_code: params.postal_code,
                aemet_zone_name: params.aemet_zone_name,
                province: params.province,
                old_postal_code: params.old_postal_code || params.postal_code,
            })
            const data = await resp.json()
            if (!data.success) throw new Error(data.message || 'Error al guardar el código postal')
            return json({ success: true })
        }

        if (action === 'delete-postal-code') {
            if (!params?.postal_code) throw new Error('Falta el código postal')
            const resp = await workerPost('/api/delete-postal-code', cookie, { postal_code: params.postal_code })
            const data = await resp.json()
            if (!data.success) throw new Error(data.message || 'Error al eliminar el código postal')
            return json({ success: true })
        }

        if (action === 'run-test') {
            if (!path || !ALLOWED_TESTS.has(path)) {
                throw new Error('Endpoint de test no permitido')
            }
            const qs = new URLSearchParams()
            if (params && typeof params === 'object') {
                for (const [k, v] of Object.entries(params)) {
                    if (v !== undefined && v !== null && String(v).length > 0) qs.append(k, String(v))
                }
            }
            const suffix = qs.toString() ? `?${qs.toString()}` : ''
            const resp = await workerGet(`${path}${suffix}`, cookie)
            const text = await resp.text()

            let parsed: unknown = null
            try { parsed = JSON.parse(text) } catch { /* not json */ }

            return json({ success: resp.ok, status: resp.status, data: parsed, text })
        }

        throw new Error('Acción no reconocida')

    } catch (error) {
        const err = error as Error
        console.error("[AdminWorker Error]", err.message)
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
