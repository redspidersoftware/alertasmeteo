# Deployment Guide - AEMET Weather Alerts

## Prerequisites
✅ Supabase project created and configured
✅ Database schema executed (see `supabase_schema.sql`)
✅ Environment variables configured

## Step 1: Prepare for Deployment

### Build the Application
```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

## Step 2: Deploy to Vercel (Recommended - Free Tier)

### Option A: Using Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts and configure environment variables when asked.

### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your Git repository (push your code to GitHub first)
4. Configure Environment Variables in the Vercel dashboard:
   - `VITE_AEMET_API_KEY` = Your AEMET API Key
   - `VITE_USE_MOCK` = `false` (for production)
   - `VITE_SUPABASE_URL` = `https://ewfbpmlcbmkvedgbqfgj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full key)
5. Click "Deploy"

## Step 3: Verify Deployment

1. Visit your deployed URL (e.g., `https://your-app.vercel.app`)
2. Test user registration
3. Check Supabase Dashboard to verify data is being saved
4. Test login/logout functionality

## Alternative Hosting Options

### Netlify (Also Free)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your `dist/` folder
3. Configure environment variables in Site Settings

### GitHub Pages (Static Only - No Server-Side)
Not recommended for this app as it requires environment variables at build time.

## Important Notes

- **Environment Variables**: Never commit `.env` to Git. Add it to `.gitignore`.
- **Supabase RLS**: Ensure Row Level Security policies are properly configured.
- **Email Verification**: For production, configure Supabase Email Templates in Authentication > Email Templates.

## Troubleshooting

**Issue**: "Invalid API key" errors
- **Solution**: Verify environment variables are set correctly in Vercel/Netlify dashboard

**Issue**: Users can't register
- **Solution**: Check Supabase logs and ensure the `users` table exists with correct policies

**Issue**: Build fails
- **Solution**: Run `npm run build` locally first to catch any errors
