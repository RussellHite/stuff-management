import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import OrganizationMemberManager from '@/components/admin/OrganizationMemberManager'
import { Mail, Users, Home, Package, MapPin } from 'lucide-react'

interface OrganizationDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/admin-login')
  }

  // Double-check admin status
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('is_application_admin')
    .eq('id', user.id)
    .single()

  if (!userProfile?.is_application_admin) {
    redirect('/dashboard')
  }

  // Get organization details
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !organization) {
    redirect('/admin/organizations')
  }

  // Get organization members
  const { data: members } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      user_id,
      user_profiles!organization_members_user_id_fkey (
        first_name,
        last_name,
        email
      )
    `)
    .eq('organization_id', id)

  // Get organization analytics
  const { data: analytics } = await supabase
    .from('organization_analytics')
    .select('*')
    .eq('organization_id', id)
    .order('date', { ascending: false })
    .limit(1)

  const latestAnalytics = analytics?.[0]
  const adminMembers = members?.filter(m => m.role === 'admin') || []
  const ownerMember = adminMembers[0]

  return (
    <AdminLayout 
      adminUser={{
        id: user.id,
        email: user.email || '',
        name: 'Admin'
      }}
      currentPage="Organizations"
    >
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {organization.name}
            </h1>
            <div className="flex items-center space-x-2">
              {organization.tags && Object.entries(organization.tags).map(([category, value]) => (
                <span
                  key={category}
                  className={`px-2 py-1 text-xs rounded-full ${
                    category === 'account_status' ? 'bg-blue-100 text-blue-800' :
                    category === 'testing' && value === 'test_account' ? 'bg-red-100 text-red-800' :
                    category === 'testing' && value === 'beta_tester' ? 'bg-yellow-100 text-yellow-800' :
                    category === 'testing' && value === 'production_user' ? 'bg-green-100 text-green-800' :
                    category === 'program' ? 'bg-purple-100 text-purple-800' :
                    category === 'support' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {String(value)}
                </span>
              ))}
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
          {ownerMember?.user_profiles && (
            <div className="flex items-center text-gray-600">
              <Mail className="w-4 h-4 mr-1" />
              <span className="text-sm">{ownerMember.user_profiles?.email}</span>
              <span className="mx-2">•</span>
              <span className="text-sm">{ownerMember.user_profiles?.first_name} {ownerMember.user_profiles?.last_name}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Members</p>
                <p className="text-3xl font-bold text-gray-900">{members?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">
                  {((latestAnalytics?.total_consumables || 0) + (latestAnalytics?.total_non_consumables || 0)).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Locations</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(latestAnalytics?.total_locations || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Containers</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(latestAnalytics?.total_containers || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Home className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{organization.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Slug</label>
                <p className="mt-1 text-sm text-gray-900">{organization.slug}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{organization.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Plan</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{organization.plan_type}</p>
              </div>
            </div>
            <div className="space-y-4">
              {organization.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{organization.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(organization.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tags</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {organization.tags && Object.entries(organization.tags).map(([category, value]) => (
                    <span
                      key={category}
                      className={`px-2 py-1 text-xs rounded-full ${
                        category === 'account_status' ? 'bg-blue-100 text-blue-800' :
                        category === 'testing' && value === 'test_account' ? 'bg-red-100 text-red-800' :
                        category === 'testing' && value === 'beta_tester' ? 'bg-yellow-100 text-yellow-800' :
                        category === 'testing' && value === 'production_user' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {String(value)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Management Section */}
        <OrganizationMemberManager
          organizationId={id}
          organizationName={organization.name}
          maxMembers={organization.plan_type === 'free' ? 5 : organization.plan_type === 'premium' ? 10 : 50}
        />

        <div className="bg-white rounded-lg border shadow-sm p-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">🚧</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h4>
            <p className="text-gray-500">
              Additional organization management features will be available here, including:
            </p>
            <ul className="text-sm text-gray-500 mt-2 space-y-1">
              <li>• Activity logs and audit trail</li>
              <li>• Storage usage analytics</li>
              <li>• User permissions management</li>
              <li>• Organization settings</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}