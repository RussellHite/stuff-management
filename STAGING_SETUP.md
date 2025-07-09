# Staging Environment Setup

## Overview

This guide helps you set up a staging environment for Stuff Happens on Vercel.

## Deployment Strategy Options

### Option 1: Branch-Based Staging (Recommended)
- `main` branch → Production
- `staging` branch → Staging
- Feature branches → Preview deployments

### Option 2: Separate Vercel Project
- Create two separate Vercel projects
- One for production, one for staging
- Different environment variables for each

## Branch-Based Staging Setup (Recommended)

### 1. Create a Staging Branch

```bash
# Create and switch to staging branch
git checkout -b staging

# Push staging branch to remote
git push -u origin staging
```

### 2. Configure Vercel for Staging

1. Go to your Vercel project settings
2. Navigate to "Git" settings
3. Set up branch deployments:
   - Production Branch: `main`
   - Preview Branches: All other branches

### 3. Environment Variables in Vercel

Go to Settings → Environment Variables and configure:

#### For Production Environment:
- Select "Production" environment
- Add your production Supabase credentials

#### For Preview/Staging Environment:
- Select "Preview" environment  
- You have two options:

**Option A: Same Database (Simple)**
- Use the same Supabase credentials
- Data will be shared between staging and production
- Good for small teams

**Option B: Separate Staging Database (Recommended)**
- Create a new Supabase project for staging
- Use different credentials
- Complete data isolation
- Safer for testing

### 4. Add Environment Indicator (Optional)

To show which environment you're in:

1. Add to Vercel environment variables:
   - Production: `NEXT_PUBLIC_ENVIRONMENT=production`
   - Preview: `NEXT_PUBLIC_ENVIRONMENT=staging`

2. Create a component to display it:

```tsx
// src/components/layout/EnvironmentBadge.tsx
export default function EnvironmentBadge() {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT;
  
  if (env === 'production' || !env) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
        {env.toUpperCase()}
      </span>
    </div>
  );
}
```

## Separate Staging Database Setup

If you choose Option B (recommended for teams):

### 1. Create New Supabase Project

1. Go to https://supabase.com/dashboard
2. Create a new project named "stuff-happens-staging"
3. Run all your migrations in the new project:

```bash
# Copy all migrations to the new Supabase project
# Use Supabase CLI or dashboard SQL editor
```

### 2. Configure Staging URLs

In your staging Supabase project:
1. Go to Authentication → URL Configuration
2. Add your staging Vercel URL:
   - `https://stuff-happens-staging-xxxxx.vercel.app`
   - Or your custom staging domain

## Deployment Workflow

### For Staging Deployments:

```bash
# Make changes in feature branch
git checkout -b feature/new-feature

# Test locally
npm run dev

# Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create PR to staging branch
# This creates a preview deployment

# After testing, merge to staging
git checkout staging
git merge feature/new-feature
git push origin staging

# This deploys to staging environment
```

### For Production Deployments:

```bash
# After staging is tested and approved
git checkout main
git merge staging
git push origin main

# This deploys to production
```

## Vercel Domain Setup

1. Staging domain options:
   - Default: `stuff-happens-git-staging-yourusername.vercel.app`
   - Custom: `staging.yourdomain.com`

2. Production domain:
   - Default: `stuff-happens.vercel.app`
   - Custom: `app.yourdomain.com` or `yourdomain.com`

## Testing Checklist for Staging

- [ ] Authentication works
- [ ] Database operations succeed
- [ ] Image uploads function
- [ ] All features work as expected
- [ ] No console errors
- [ ] Performance is acceptable

## CI/CD Best Practices

1. **Protected Branches**: 
   - Protect `main` and `staging` branches
   - Require PR reviews

2. **Automated Testing**:
   - Add GitHub Actions for tests (optional)
   - Run builds on PRs

3. **Environment Separation**:
   - Never share production data in staging
   - Use different API keys when possible

## Quick Reference

| Branch | Environment | Vercel URL | Database |
|--------|------------|------------|----------|
| main | Production | stuff-happens.vercel.app | Production Supabase |
| staging | Staging | stuff-happens-staging.vercel.app | Staging Supabase (or shared) |
| feature/* | Preview | stuff-happens-pr-*.vercel.app | Staging Supabase |

## Troubleshooting

### Common Issues:

1. **"Staging uses production data"**
   - Check environment variables in Vercel
   - Ensure correct environment is selected

2. **"Can't login on staging"**
   - Verify staging URL is in Supabase allowed URLs
   - Check environment variables

3. **"Changes not showing"**
   - Clear cache
   - Check which branch was deployed
   - Verify build succeeded in Vercel