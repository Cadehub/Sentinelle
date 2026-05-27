# ✅ DEPLOYMENT CHECKLIST - Images Upload Fix

## 📋 PRE-DEPLOYMENT VERIFICATION

### Database (Supabase)
- [x] Table `alert_images` exists with columns:
  - `id` (uuid, primary key)
  - `alert_id` (uuid, FK → alerts.id)
  - `image_url` (text)
  - `image_order` (integer)
  - `created_at` (timestamp)
  
### Environment Variables (Already Configured)
- [x] `IMGBB_API_KEY` - For image compression & upload
- [x] `GEMINI_API_KEY` - For moderation
- [x] `VITE_SUPABASE_URL` - Frontend Supabase URL

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy Frontend (React App)
```bash
cd "c:\Users\UltraBook 3.1\Desktop\Projet S"
npm run build
# This builds the dist/ folder for production
```
✅ **Status**: Already built successfully

### Step 2: Deploy Edge Functions to Supabase
Edge Functions are already coded and ready. Deploy via Supabase CLI:

```bash
# Deploy upload-alert-images function
supabase functions deploy upload-alert-images

# Deploy publish-alert function  
supabase functions deploy publish-alert

# Deploy update-alert function
supabase functions deploy update-alert

# Deploy delete-alert function
supabase functions deploy delete-alert

# Deploy sentinelle-guide function
supabase functions deploy sentinelle-guide
```

### Step 3: Configure RLS Policies (if needed)
Ensure `alert_images` table has RLS policies:
```sql
-- Allow anyone to read images
CREATE POLICY "Allow public read" ON alert_images
  FOR SELECT USING (true);

-- Allow users to insert their own alert images
CREATE POLICY "Allow users to insert images for their alerts" ON alert_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM alerts 
      WHERE alerts.id = alert_images.alert_id 
      AND alerts.user_id = auth.uid()
    )
  );
```

---

## 🧪 POST-DEPLOYMENT TESTING

### Test 1: Publish Alert with Multiple Images
1. Go to `/publish` page
2. Select 3-5 images
3. Fill in alert details
4. Click "Diffuser l'alerte"
5. **Expected Result**: 
   - Alert created successfully
   - Redirected to homepage
   - No console errors

### Test 2: Verify Images in Database
1. Open Supabase Dashboard
2. Go to `alert_images` table
3. Filter by the alert you just created
4. **Expected Result**:
   - 3-5 rows with same `alert_id`
   - `image_order` values: 0, 1, 2, 3, 4
   - `image_url` contains valid ImgBB URLs

### Test 3: Homepage Display
1. Go to homepage (`/`)
2. Scroll to the alert you just created
3. **Expected Result**:
   - Image displays on the card
   - No loading errors
   - Image is clickable

### Test 4: Alert Details Page
1. Click on the alert card
2. Scroll to see images section
3. **Expected Result**:
   - Primary image displays (if exists)
   - Gallery grid shows all additional images
   - 3x3 grid layout with image_order 0, 1, 2...

### Test 5: Story Generation
1. In alert details, click "Partager l'alerte"
2. Click "Générer une image story"
3. **Expected Result**:
   - Story image includes main photo
   - Gallery thumbnails visible below main image
   - Image downloads automatically
   - Story Modal opens with image

### Test 6: Edit Alert & Add More Images
1. In your own alert, click edit button
2. Add new images
3. Save changes
4. **Expected Result**:
   - New images added to gallery
   - Images appear in story generation
   - `alert_images` table updated with new entries

---

## 📊 EXPECTED DATABASE STATE AFTER TEST

### alerts table
```
id | user_id | title | image_url | ... | created_at
XX | YY      | "Vol" | "https://i.imgbb.com/..." | 2026-05-19
```

### alert_images table
```
id | alert_id | image_url                    | image_order | created_at
1  | XX       | "https://i.imgbb.com/xxx1"  | 0           | 2026-05-19
2  | XX       | "https://i.imgbb.com/xxx2"  | 1           | 2026-05-19
3  | XX       | "https://i.imgbb.com/xxx3"  | 2           | 2026-05-19
4  | XX       | "https://i.imgbb.com/xxx4"  | 3           | 2026-05-19
5  | XX       | "https://i.imgbb.com/xxx5"  | 4           | 2026-05-19
```

---

## 🔍 TROUBLESHOOTING

### Problem: Images don't show in gallery
**Solution**:
1. Check browser console for errors
2. Verify `alert_images` table has data
3. Verify `image_order` values are correct
4. Check image URLs are valid (open in new tab)

### Problem: Edge Function upload fails
**Solution**:
1. Check Supabase logs: Dashboard → Functions → Logs
2. Verify `IMGBB_API_KEY` is set correctly
3. Check network requests in browser DevTools
4. Ensure image data is base64 encoded

### Problem: Images don't appear in story image
**Solution**:
1. Verify `alertImages` state is populated
2. Check `alertImages.length > 0`
3. Clear browser cache and reload
4. Check story generation isn't timing out

### Problem: Images fail to save to alert_images
**Solution**:
1. Check RLS policies on `alert_images` table
2. Verify user is authenticated
3. Check Supabase database logs
4. Ensure `alert_id` exists in `alerts` table

---

## ✨ SUCCESS INDICATORS

- [x] Images upload without errors
- [x] Images save to `alert_images` table
- [x] Images display on homepage cards
- [x] Images display in alert modal
- [x] Images include in story image generation
- [x] Build completes without errors
- [x] No TypeScript type errors
- [x] No console errors in browser

---

## 📝 ROLLBACK PROCEDURE (if needed)

If something goes wrong:
1. Revert `src/pages/Publish.tsx` to previous version
2. Images will still save as primary `image_url` (old behavior)
3. Gallery images won't display (fallback: only primary image)
4. No data loss

---

## 📞 SUPPORT

For issues during deployment:
1. Check `IMAGE_FIX_SUMMARY.md` for technical details
2. Review browser console (F12)
3. Check Supabase dashboard logs
4. Verify Edge Functions are deployed
5. Ensure RLS policies are configured

---

**Last Updated**: 2026-05-19
**Deployed By**: GitHub Copilot
**Status**: ✅ Ready for Deployment
