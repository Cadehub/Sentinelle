# Quick Deployment Steps - 5 Minutes

## 1. Update .env with Missing Variables

Add to `./.env`:
```
GEMINI_API_KEY="your_gemini_api_key_here"
NODE_ENV="production"
```

## 2. Verify Build Locally

```bash
npm install
npm run build
```

✅ Should complete without errors

## 3. Push to GitHub

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

## 4. Configure Netlify Dashboard

1. Go to: https://app.netlify.com/
2. Select your site
3. Settings → Build & Deploy → Environment
4. Add these environment variables:
   - `VITE_SUPABASE_URL` = `https://wcrkcuugancklxirqfyl.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_ccvNj5ojFxa0nZ4F0c8zgw_VIhwv34O`
   - `GEMINI_API_KEY` = Your key here
   - `NODE_ENV` = `production`

5. Trigger deploy: Settings → Build & Deploy → Deploy Log → Trigger Deploy

## 5. Configure Supabase

1. Go to: https://app.supabase.com/
2. Select your project
3. Settings → Edge Functions → Secrets
4. Add: `GEMINI_API_KEY` = Your key

## 6. Run SQL Migrations

In Supabase SQL Editor, execute:

```sql
-- Copy content from SQL_FIX_RECURSION_WORKING.sql
-- Then from MIGRATION_SYSTEM_BROADCASTS.sql
```

## 7. Test Production

Visit: https://sentinelle-v1.netlify.app

Check:
- ✓ Page loads
- ✓ Can register
- ✓ Can create alert
- ✓ Chat works
- ✓ Admin dashboard loads

## ✅ Done!

Your app is now live and ready for production use.

---

**Troubleshooting?** See `DEPLOYMENT_PRODUCTION_READY.md`
