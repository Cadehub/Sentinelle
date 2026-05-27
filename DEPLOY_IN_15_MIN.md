# ⚡ QUICK START - Deploy in 15 Minutes

## Step 0: Get Gemini API Key (2 min)
```
👉 https://aistudio.google.com/apikey
```
Click "Get API Key" and copy it.

---

## Step 1: Update .env
```bash
# Open .env and replace:
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
# With:
GEMINI_API_KEY="your_actual_key"
```

---

## Step 2: Commit & Push (2 min)
```bash
git add .
git commit -m "Production deployment"
git push origin main
```
→ Netlify auto-deploys! ✅

---

## Step 3: Netlify Variables (3 min)
https://app.netlify.com/ → Your Site → Settings → Build & Deploy → Environment

Add these 4 variables:
```
VITE_SUPABASE_URL=https://wcrkcuugancklxirqfyl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ccvNj5ojFxa0nZ4F0c8zgw_VIhwv34O
GEMINI_API_KEY=your_actual_key
NODE_ENV=production
```

---

## Step 4: Supabase Secret (2 min)
https://app.supabase.com/ → Your Project → Settings → Edge Functions → Secrets

Add:
```
GEMINI_API_KEY=your_actual_key
```

---

## Step 5: Redeploy Edge Functions (2 min)
```bash
supabase functions deploy --project-id wcrkcuugancklxirqfyl
```

---

## Step 6: Trigger Netlify Rebuild (2 min)
https://app.netlify.com/ → Deploys → Trigger deploy

Wait for build... ⏳ (usually 2-3 min)

---

## Step 7: Test! 🎉
✅ https://sentinelle-v1.netlify.app

---

## DONE! 🚀

Your app is live!

See **DEPLOYMENT_READY_FINAL.md** for detailed guide.
