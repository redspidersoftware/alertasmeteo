# Solución: Error en el Registro de Usuarios

## Problema
El registro de usuarios no funciona en producción porque Supabase requiere confirmación de email por defecto.

## Solución Rápida (Recomendada)

### Opción 1: Deshabilitar Confirmación de Email (Para desarrollo/demo)

1. Ve a tu **Supabase Dashboard**
2. Navega a **Authentication** → **Providers** → **Email**
3. Desactiva la opción **"Confirm email"**
4. Guarda los cambios

**Esto permitirá que los usuarios se registren sin necesidad de confirmar su email.**

---

### Opción 2: Configurar Email Templates (Para producción)

Si quieres mantener la confirmación de email:

1. Ve a **Authentication** → **Email Templates**
2. Configura el template de "Confirm signup"
3. Añade un proveedor de email (SendGrid, Resend, etc.)

---

## Verificación

Después de aplicar la Opción 1:

1. Ve a tu app en Vercel
2. Intenta registrar un nuevo usuario
3. Debería funcionar inmediatamente

## Nota Adicional

Si ya has intentado registrar usuarios y fallaron, puedes:
- Ir a **Authentication** → **Users** en Supabase
- Eliminar los usuarios con estado "Waiting for verification"
- Volver a intentar el registro
