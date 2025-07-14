# Vercel Deployment Checklist for Stuff Happens

## ✅ Pre-Deployment Setup Complete

### Files Created:
- ✅ `vercel.json` - Vercel configuration
- ✅ `.env.production.example` - Example environment variables
- ✅ `DEPLOYMENT.md` - Detailed deployment guide
- ✅ `tailwind.config.ts` - Tailwind configuration
- ✅ Updated `next.config.ts` - Added image domain for Supabase storage

### Your Environment Variables:
When setting up in Vercel, use these values from your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://jujtjswxpeikaecbfvvn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1anRqc3d4cGVpa2FlY2JmdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Nzk0NjcsImV4cCI6MjA2NzU1NTQ2N30.KxxfenmRVz2SI9D0p3MRVqI08toG_kXIUGUhZ_sjzlM
```

## 🚀 Quick Deployment Steps

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your repository
   - Framework will auto-detect as Next.js

3. **Add Environment Variables in Vercel**
   - In project settings → Environment Variables
   - Add the two variables above (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)

4. **Configure Supabase**
   - Go to your Supabase project → Authentication → URL Configuration
   - Add your Vercel URL (will be something like `https://stuff-happens-xxxxx.vercel.app`)
   - Add to both "Site URL" and "Redirect URLs"

5. **Deploy!**
   - Vercel will automatically deploy
   - Check the deployment logs for any issues

## 📝 Important Notes

- Your `.env.local` file will NOT be uploaded (it's in .gitignore)
- Each push to `main` branch triggers a production deployment
- Other branches create preview deployments
- The build should take 1-3 minutes

## 🔍 Post-Deployment Testing

1. Visit your deployed URL
2. Test sign up / login
3. Create a household
4. Add some items
5. Test image uploads

## 🆘 If Something Goes Wrong

- Check Vercel deployment logs
- Verify environment variables are set correctly
- Ensure Supabase URLs are configured
- The DEPLOYMENT.md file has more detailed troubleshooting

Ready to deploy! 🎉