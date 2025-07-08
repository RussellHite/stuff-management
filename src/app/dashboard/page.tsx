import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      *,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.first_name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's your inventory management dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Organizations</h3>
            {memberships && memberships.length > 0 ? (
              <ul className="space-y-2">
                {memberships.map((membership: any) => (
                  <li key={membership.id} className="flex justify-between items-center">
                    <span className="text-gray-700">{membership.organizations?.name}</span>
                    <span className="text-sm text-gray-500 capitalize">{membership.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No organizations found</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 text-blue-600 hover:bg-blue-50 rounded">
                Add New Product
              </button>
              <button className="w-full text-left p-2 text-blue-600 hover:bg-blue-50 rounded">
                Record Transaction
              </button>
              <button className="w-full text-left p-2 text-blue-600 hover:bg-blue-50 rounded">
                View Reports
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h3>
            <p className="text-gray-500">No recent activity</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">1. Set up your organization</h3>
                <p className="text-gray-600 text-sm">Create or join an organization to start managing inventory</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">2. Add locations</h3>
                <p className="text-gray-600 text-sm">Define warehouses, stores, or other locations</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">3. Create product categories</h3>
                <p className="text-gray-600 text-sm">Organize your products with categories</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">4. Add products</h3>
                <p className="text-gray-600 text-sm">Add products with QR codes and track inventory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}