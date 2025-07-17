import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminOrganizations from '@/components/admin/AdminOrganizations'

export default async function AdminOrganizationsPage() {
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

  // Get all organizations with member counts and analytics
  const { data: organizations } = await supabase
    .from('organizations')
    .select(`
      *,
      organization_members (
        id,
        role,
        user_profiles (
          first_name,
          last_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false })

  // Get organization analytics for each org
  const orgIds = organizations?.map(org => org.id) || []
  const { data: analytics } = await supabase
    .from('organization_analytics')
    .select('*')
    .in('organization_id', orgIds)
    .order('date', { ascending: false })

  // Group analytics by organization
  const analyticsMap = analytics?.reduce((acc, stat) => {
    if (!acc[stat.organization_id]) {
      acc[stat.organization_id] = []
    }
    acc[stat.organization_id].push(stat)
    return acc
  }, {} as Record<string, any[]>) || {}

  const enrichedOrganizations = organizations?.map(org => ({
    ...org,
    memberCount: org.organization_members?.length || 0,
    adminCount: org.organization_members?.filter((m: any) => m.role === 'admin').length || 0,
    latestAnalytics: analyticsMap[org.id]?.[0] || null,
    tags: org.tags || null
  })) || []

  return (
    <AdminOrganizations 
      organizations={enrichedOrganizations}
      adminUser={{
        id: user.id,
        email: user.email || '',
        name: 'Admin'
      }}
    />
  )
}