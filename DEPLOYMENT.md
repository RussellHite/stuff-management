# Deployment Guide for Stuff Happens

This guide will help you deploy the Stuff Happens application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/docs/cli) installed (optional but recommended)
3. Your Supabase project credentials

## Deployment Steps

### 1. Prepare Your Repository

Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Import to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Configure your project:
   - **Framework Preset**: Next.js (should be auto-detected)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy
vercel

# Follow the prompts to link your project
```

### 3. Configure Environment Variables

In the Vercel dashboard, go to your project settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

⚠️ **Important**: Do NOT commit your actual `.env.local` file to version control. The `.gitignore` file already excludes it.

### 4. Configure Supabase

1. In your Supabase project dashboard, go to Settings → API
2. Add your Vercel deployment URL to the allowed URLs:
   - Go to Authentication → URL Configuration
   - Add your Vercel URL (e.g., `https://your-app.vercel.app`) to:
     - Site URL
     - Redirect URLs

### 5. Deploy

If using the dashboard, Vercel will automatically deploy your project. For subsequent deployments:

- **Production**: Push to your main branch
- **Preview**: Push to any other branch

### 6. Post-Deployment Setup

1. **Test Authentication**: 
   - Visit your deployed app
   - Try signing up and logging in
   - Ensure the redirect works properly

2. **Verify Database Connection**:
   - Create a test household
   - Add some items
   - Ensure data persists

## Production Considerations

### Performance Optimizations

1. **Image Optimization**: The app uses Next.js Image component for optimized loading
2. **Static Generation**: Dashboard pages use dynamic rendering as they require authentication
3. **API Routes**: Currently not used, but can be added for server-side operations

### Security

1. **Environment Variables**: Never expose your service role key in client-side code
2. **Row Level Security**: Already configured in Supabase
3. **CORS**: Supabase handles CORS automatically for allowed URLs

### Monitoring

1. **Vercel Analytics**: Enable in your Vercel dashboard
2. **Error Tracking**: Consider adding Sentry or similar
3. **Supabase Logs**: Monitor via Supabase dashboard

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**:
   - Double-check your environment variables in Vercel
   - Ensure you're using the anon key, not the service role key

2. **Authentication redirects not working**:
   - Verify your Vercel URL is added to Supabase's allowed URLs
   - Check that the URL includes the protocol (https://)

3. **Build failures**:
   - Check the build logs in Vercel
   - Ensure all dependencies are in `package.json`
   - Run `npm run build` locally to test

### Getting Help

- Check the [Vercel documentation](https://vercel.com/docs)
- Review [Supabase guides](https://supabase.com/docs)
- Check build logs in your Vercel dashboard

## Continuous Deployment

Your project is now set up for continuous deployment:

- Push to `main` branch → Production deployment
- Push to other branches → Preview deployments
- Each PR gets its own preview URL

## Custom Domain (Optional)

To add a custom domain:

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your domain and follow the DNS configuration steps
4. Update your Supabase allowed URLs to include the custom domain

## Environment-Specific Configuration

The app automatically handles different environments:

- **Development**: Uses `.env.local`
- **Production**: Uses Vercel environment variables
- **Preview**: Uses the same environment variables as production

No code changes needed for different environments!