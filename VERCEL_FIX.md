# SOLUCIÓN: "Failed to fetch" en Vercel

## Problema
El error "Failed to fetch" indica que la aplicación no puede conectarse a Supabase. Esto sucede porque:
1. Las variables de entorno no están configuradas en Vercel, O
2. Las variables están mal escritas, O
3. Necesitas hacer un nuevo deploy después de añadir las variables

## Solución Paso a Paso

### 1. Verifica las Variables en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona el proyecto `alertasmeteo`
3. Ve a **Settings** → **Environment Variables**
4. Verifica que tengas estas 3 variables:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_AEMET_API_KEY (opcional)
```

### 2. Si NO están configuradas o están mal:

**Borra las variables existentes** y añade estas nuevas:

#### Variable 1:
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://ewfbpmlcbmkvedgbqfgj.supabase.co`
- **Environments**: Production, Preview, Development (marca las 3)

#### Variable 2:
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZmJwbWxjYm1rdmVkZ2JxZmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTUxNzYsImV4cCI6MjA4NjY3MTE3Nn0.V-ptTSZKrlnec4vsq4bpCwenGN41c7D1ayViO0vastc`
- **Environments**: Production, Preview, Development (marca las 3)

### 3. IMPORTANTE: Redeploy

Después de añadir/modificar las variables:

1. Ve a **Deployments**
2. Encuentra el último deployment
3. Clic en los 3 puntos (...) → **Redeploy**
4. Espera 1-2 minutos

### 4. Verifica en Supabase

Mientras se despliega, asegúrate de que en Supabase:

1. **Authentication** → **Providers** → **Email**
2. **Desactiva "Confirm email"**
3. Guarda

### 5. Prueba de nuevo

Una vez completado el redeploy:
1. Ve a https://alertasmeteo.vercel.app/
2. Intenta registrarte
3. Debería funcionar

## Verificación Rápida

Para verificar que las variables están bien, puedes:
1. Abrir la consola del navegador (F12)
2. Escribir: `console.log(import.meta.env.VITE_SUPABASE_URL)`
3. Debería mostrar la URL de Supabase (no `undefined`)
