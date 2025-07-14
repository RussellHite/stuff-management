'use client'

import { currentEnvironment, debugConfig } from '@/lib/supabase/client'

export default function EnvironmentDebug() {
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