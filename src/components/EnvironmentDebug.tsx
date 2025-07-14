'use client'

// Environment debug component for verifying Supabase configuration
import { useState, useEffect } from 'react'

export default function EnvironmentDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    const loadDebugInfo = async () => {
      const { currentEnvironment, debugConfig } = await import('@/lib/supabase/client')
      setDebugInfo({ currentEnvironment, debugConfig })
    }
    
    loadDebugInfo()
  }, [])

  if (!debugInfo) {
    return null // Don't render anything during SSR
  }

  const { currentEnvironment, debugConfig } = debugInfo

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      background: '#f0f0f0', 
      padding: '10px', 
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <strong>Environment Debug:</strong><br/>
      Environment: <span style={{ color: debugConfig.environment === 'production' ? 'red' : debugConfig.environment === 'staging' ? 'orange' : 'green' }}>
        {currentEnvironment}
      </span><br/>
      Branch: {debugConfig.branch}<br/>
      Has URL: {debugConfig.hasUrl ? '✅' : '❌'}<br/>
      Has Keys: {debugConfig.hasAnonKey ? '✅' : '❌'}<br/>
      Has Service Key: {debugConfig.hasServiceKey ? '✅' : '❌'}
    </div>
  );
}