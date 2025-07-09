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