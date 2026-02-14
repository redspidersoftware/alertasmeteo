# SOLUCIÓN DEFINITIVA: Variables de Entorno en Vercel

## El Problema
Vercel NO está inyectando las variables de entorno en el build de Vite, por eso aparecen vacías.

## Solución: Configurar las variables CORRECTAMENTE en Vercel

### Paso 1: Elimina las variables actuales

1. Ve a Vercel Dashboard → Tu proyecto → **Settings** → **Environment Variables**
2. **ELIMINA** todas las variables actuales (las 4 que tienes)

### Paso 2: Añade las variables de nuevo CON LA CONFIGURACIÓN CORRECTA

**IMPORTANTE**: Cuando añadas cada variable, asegúrate de:
- Marcar **TODAS** las casillas: Production, Preview, Development
- NO usar el botón "Add" hasta completar TODOS los campos

#### Variable 1:
```
Name: VITE_SUPABASE_URL
Value: https://ewfbpmlcbmkvedgbqfgj.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development
```

#### Variable 2:
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZmJwbWxjYm1rdmVkZ2JxZmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTUxNzYsImV4cCI6MjA4NjY3MTE3Nn0.V-ptTSZKrlnec4vsq4bpCwenGN41c7D1ayViO0vastc
Environments: ✅ Production ✅ Preview ✅ Development
```

#### Variable 3 (Opcional):
```
Name: VITE_USE_MOCK
Value: false
Environments: ✅ Production ✅ Preview ✅ Development
```

### Paso 3: Fuerza un Redeploy desde SETTINGS

**IMPORTANTE**: No uses el botón de Redeploy en Deployments. En su lugar:

1. Quédate en **Settings** → **Environment Variables**
2. Después de añadir las variables, verás un banner amarillo que dice algo como:
   **"To apply these changes, redeploy your project"**
3. Haz clic en el botón **"Redeploy"** de ese banner

### Paso 4: Verifica el Build Log

1. Ve a **Deployments**
2. Haz clic en el deployment que se está ejecutando
3. Ve a **Build Logs**
4. Busca líneas que digan algo como:
   ```
   VITE_SUPABASE_URL=https://...
   ```
5. Si NO ves esas líneas, las variables NO se están inyectando

### Paso 5: Si sigue sin funcionar

Prueba esta alternativa:

1. Ve a **Settings** → **General**
2. Busca **"Build & Development Settings"**
3. En **"Build Command"**, cambia de `npm run build` a:
   ```
   VITE_SUPABASE_URL=https://ewfbpmlcbmkvedgbqfgj.supabase.co VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZmJwbWxjYm1rdmVkZ2JxZmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTUxNzYsImV4cCI6MjA4NjY3MTE3Nn0.V-ptTSZKrlnec4vsq4bpCwenGN41c7D1ayViO0vastc npm run build
   ```
4. Guarda y redeploy

## Verificación Final

Después del deploy:
1. Ve a https://alertasmeteo.vercel.app/debug.html
2. Las variables deberían aparecer
3. Prueba el registro
