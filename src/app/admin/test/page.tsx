import { createClient } from '@/lib/supabase/server'

export default async function AdminTestPage() {
  const supabase = await createClient()
  
  // Simple organizations query
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Test Page</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error.message}
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold">Organizations Count: {organizations?.length || 0}</h2>
      </div>
      
      {organizations && organizations.length > 0 ? (
        <div className="space-y-4">
          {organizations.map((org) => (
            <div key={org.id} className="border rounded p-4 bg-white">
              <h3 className="font-semibold">{org.name}</h3>
              <p className="text-sm text-gray-600">{org.slug}</p>
              <p className="text-sm text-gray-500">Tags: {JSON.stringify(org.tags)}</p>
              <p className="text-sm text-gray-500">Created: {org.created_at}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>No organizations found</p>
      )}
    </div>
  )
}