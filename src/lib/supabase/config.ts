const getBranch = () => {
  // Vercel provides the branch name in this environment variable
  return process.env.VERCEL_GIT_COMMIT_REF || 'local';
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  environment: 'production' | 'staging' | 'development';
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const branch = getBranch();
  
  console.log(`Current branch: ${branch}`); // For debugging
  
  if (branch === 'main') {
    // Production environment
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_PROD,
      environment: 'production'
    };
  } else if (branch === 'staging') {
    // Staging environment (uses production database)
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_PROD,
      environment: 'staging'
    };
  } else {
    // Development environment (dev branch, feature branches, local)
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_DEV,
      environment: 'development'
    };
  }
};

// Export the current environment for debugging
export const getCurrentEnvironment = () => getSupabaseConfig().environment;

// Export debug info
export const getDebugConfig = () => {
  const config = getSupabaseConfig();
  return {
    branch: getBranch(),
    environment: config.environment,
    hasUrl: !!config.url,
    hasAnonKey: !!config.anonKey,
    hasServiceKey: !!config.serviceRoleKey
  };
};