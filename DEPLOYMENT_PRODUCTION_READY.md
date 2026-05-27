# Deployment Guide - Sentinelle V1

## Pre-Deployment Checklist

### 1. Environment Variables Setup
Ensure all required environment variables are configured:

```env
# Application
APP_URL="https://yourdomain.com"
NODE_ENV="production"

# Supabase
VITE_SUPABASE_URL="https://wcrkcuugancklxirqfyl.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_ccvNj5ojFxa0nZ4F0c8zgw_VIhwv34O"

# Gemini API (required for AI features)
GEMINI_API_KEY="your_gemini_api_key_here"
```

### 2. Local Build Verification
Before deploying, verify the build succeeds locally:

```bash
npm install
npm run build
npm start
```

### 3. Database Migrations
Execute all required SQL migrations in Supabase:

1. **SQL_FIX_RECURSION_WORKING.sql** - Fix RLS policies
2. **MIGRATION_SYSTEM_BROADCASTS.sql** - System broadcasts table
3. **Any custom migrations** in `supabase/migrations/`

Steps:
- Go to Supabase Dashboard → SQL Editor
- Run each migration file in order
- Verify no errors

### 4. Edge Functions Deployment
Deploy all Supabase Edge Functions:

```bash
supabase functions deploy --project-id <your-project-id>
```

Or use Supabase Dashboard → Edge Functions:
- Set `GEMINI_API_KEY` secret in Settings → Edge Functions → Secrets
- Each function will auto-deploy on file change

Functions to verify:
- ✓ `translate-message` - Translation service
- ✓ `publish-alert` - Alert publishing
- ✓ `chat-guard` - Message moderation
- ✓ `upload-alert-images` - Image upload
- ✓ `update-alert` - Alert updates
- ✓ `delete-alert` - Alert deletion

### 5. Supabase RLS Policies
Verify these RLS policies are enabled:
- `profiles_select_own` - Users can read own profile
- `profiles_select_admin` - Admins can read all profiles
- `profiles_update_own` - Users can update own profile
- `profiles_update_admin` - Admins can update all profiles

### 6. Build Configuration
The app uses:
- **Vite** for frontend bundling
- **Tailwind CSS** for styling
- **TypeScript** for type safety
- **Express** for backend server

Build command:
```bash
npm run build
```

Output:
- Frontend: `dist/` (Vite bundle)
- Backend: `dist/server.cjs` (esbuild bundle)

### 7. Deployment Platforms

#### Option A: Netlify (Recommended)
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables in Netlify UI:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (for backend API)
   - `NODE_ENV=production`

5. Configure redirects (already in `netlify.toml`):
   - All routes → `/index.html` for SPA

#### Option B: Vercel
1. Connect GitHub repository
2. Framework Preset: Other (custom)
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables in Vercel Dashboard

#### Option C: Docker (Self-hosted)
```bash
docker build -t sentinelle-v1 .
docker run -p 3000:3000 \
  -e VITE_SUPABASE_URL="..." \
  -e VITE_SUPABASE_ANON_KEY="..." \
  -e GEMINI_API_KEY="..." \
  sentinelle-v1
```

### 8. Security Checklist

- [ ] All `.env` files excluded from git (check `.gitignore`)
- [ ] `.env.example` committed with public docs only
- [ ] API keys never logged to console in production
- [ ] CORS configured for your domain only
- [ ] SSL/HTTPS enforced
- [ ] Security headers configured (see `netlify.toml`)
- [ ] Rate limiting considered for API endpoints

### 9. Performance Optimization

- [ ] Vite build verified with `npm run build`
- [ ] Source maps generated for debugging
- [ ] Images optimized and lazy-loaded
- [ ] Bundle size analyzed
- [ ] Caching headers configured

### 10. Monitoring & Logs

After deployment:
- [ ] Check application logs
- [ ] Monitor Supabase edge function logs
- [ ] Set up error tracking (Sentry optional)
- [ ] Test critical features:
  - User authentication
  - Alert creation and publishing
  - Real-time chat and notifications
  - Admin dashboard functionality

### 11. Database Backup

Before production:
```bash
# Backup Supabase database
supabase db pull
```

### 12. SSL Certificate & Domain

- [ ] Domain points to deployment platform
- [ ] SSL certificate auto-renewed (automatic on Netlify/Vercel)
- [ ] `APP_URL` environment variable updated to production domain

## Deployment Commands

### Local Testing
```bash
npm install
npm run dev          # Development server
npm run build        # Production build
npm start            # Run production build locally
```

### Deployment to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

### Deployment to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## Troubleshooting

### Build Fails
- Clear `node_modules`: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 18+)
- Clear cache: `npm cache clean --force`

### Supabase Connection Error
- Verify `VITE_SUPABASE_URL` is correct
- Verify `VITE_SUPABASE_ANON_KEY` is correct
- Check Supabase project status in dashboard

### Edge Functions Not Working
- Verify `GEMINI_API_KEY` is set in Supabase Edge Functions Secrets
- Check function logs in Supabase Dashboard
- Redeploy functions: `supabase functions deploy`

### 404 on Routes
- Ensure `netlify.toml` redirect is in place
- SPA fallback: all routes → `/index.html`

### Performance Issues
- Check Vite build output size
- Monitor network requests in DevTools
- Verify Supabase query performance

## Post-Deployment Verification

1. **Frontend Loading**
   - Visit production URL
   - Check page loads without errors
   - Console should be clean

2. **Authentication**
   - Test user registration
   - Test login/logout
   - Verify session persists

3. **Core Features**
   - Create a test alert
   - Join a chat room
   - Check notifications work

4. **Admin Dashboard**
   - Access admin panel
   - Verify moderation features
   - Test broadcast system

5. **Database**
   - Verify data persists
   - Check RLS policies work
   - Monitor query performance

## Rollback Plan

If deployment fails:
1. Revert to previous commit: `git revert <commit-hash>`
2. Redeploy previous build
3. Check logs for errors
4. Fix issues locally and test before redeploying

## Support & Documentation

- [Vite Docs](https://vitejs.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [React Router Docs](https://reactrouter.com/)
- [Netlify Docs](https://docs.netlify.com/)
