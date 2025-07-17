import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminTestPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Check admin status
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_application_admin, first_name, last_name, email')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Test Page</h1>
      
      <div className="bg-white p-4 rounded border mb-4">
        <h2 className="text-lg font-semibold mb-2">User Info</h2>
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>

      <div className="bg-white p-4 rounded border mb-4">
        <h2 className="text-lg font-semibold mb-2">Profile Info</h2>
        {profileError ? (
          <p className="text-red-600">Error: {profileError.message}</p>
        ) : (
          <>
            <p><strong>First Name:</strong> {userProfile?.first_name || 'N/A'}</p>
            <p><strong>Last Name:</strong> {userProfile?.last_name || 'N/A'}</p>
            <p><strong>Email:</strong> {userProfile?.email || 'N/A'}</p>
            <p><strong>Is Admin:</strong> {userProfile?.is_application_admin ? 'YES' : 'NO'}</p>
          </>
        )}
      </div>

      <div className="bg-white p-4 rounded border">
        <h2 className="text-lg font-semibold mb-2">Next Steps</h2>
        {userProfile?.is_application_admin ? (
          <p className="text-green-600">✅ You have admin access!</p>
        ) : (
          <div>
            <p className="text-red-600">❌ You don't have admin access.</p>
            <p className="text-sm text-gray-600 mt-2">
              To grant admin access, run this SQL in your Supabase dashboard:
            </p>
            <code className="block bg-gray-100 p-2 mt-2 text-sm">
              UPDATE user_profiles SET is_application_admin = TRUE WHERE id = '{user.id}';
            </code>
          </div>
        )}
      </div>
    </div>
  )
}