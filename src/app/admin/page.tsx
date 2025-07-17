import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/admin-login')
  }

  // Double-check admin status
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_application_admin, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile error:', profileError)
    redirect('/dashboard')
  }

  if (!userProfile?.is_application_admin) {
    console.log('User is not admin:', userProfile)
    redirect('/dashboard')
  }

  // Get application-wide stats
  const today = new Date().toISOString().split('T')[0]
  
  // Get latest usage stats
  const { data: usageStatsArray } = await supabase
    .from('application_usage_stats')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
  
  const usageStats = usageStatsArray?.[0]

  // Get organization count
  const { count: totalOrganizations } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })

  // Get user count
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  // Get recent organizations
  const { data: recentOrganizations } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  // Get top organizations by activity
  const { data: topOrganizations } = await supabase
    .from('organization_analytics')
    .select(`
      *,
      organizations (
        name,
        created_at
      )
    `)
    .order('items_added_today', { ascending: false })
    .limit(10)

  const stats = usageStats || {
    total_organizations: totalOrganizations || 0,
    total_users: totalUsers || 0,
    total_items: 0,
    total_locations: 0,
    active_organizations: 0,
    active_users: 0,
    new_organizations_today: 0,
    new_users_today: 0,
    items_created_today: 0,
    logins_today: 0
  }

  return (
    <AdminDashboard
      adminUser={{
        id: user.id,
        email: user.email || '',
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Admin'
      }}
      stats={stats}
      recentOrganizations={recentOrganizations || []}
      topOrganizations={topOrganizations || []}
    />
  )
}