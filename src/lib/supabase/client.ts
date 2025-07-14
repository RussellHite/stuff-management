import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { getSupabaseConfig, getCurrentEnvironment, getDebugConfig } from './config'

const config = getSupabaseConfig()

export const supabase = createBrowserClient<Database>(
  config.url,
  config.anonKey
)

// Export the environment for debugging
export const currentEnvironment = getCurrentEnvironment()

// Export config for debugging
export const debugConfig = getDebugConfig()