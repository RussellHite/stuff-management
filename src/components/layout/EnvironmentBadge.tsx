'use client'

export default function EnvironmentBadge() {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT;
  
  // Don't show badge in production or if environment is not set
  if (!env || env === 'production') return null;
  
  const getEnvColor = () => {
    switch (env) {
      case 'staging':
        return 'bg-yellow-500 text-black';
      case 'development':
        return 'bg-blue-500 text-white';
      case 'preview':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <span className={`${getEnvColor()} px-3 py-1 rounded-full text-xs font-bold shadow-lg uppercase`}>
        {env}
      </span>
    </div>
  );
}