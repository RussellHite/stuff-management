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
  const { data: organizations, error } = await supabase
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

  console.log('Organizations query error:', error)
  console.log('Organizations data:', organizations)

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

  const enrichedOrganizations = organizations?.map(org => {
    // Get the first admin as the "owner" since there's no created_by field
    const adminMembers = org.organization_members?.filter((m: any) => m.role === 'admin') || []
    const ownerMember = adminMembers[0] // First admin is considered owner
    
    return {
      ...org,
      memberCount: org.organization_members?.length || 0,
      adminCount: adminMembers.length,
      latestAnalytics: analyticsMap[org.id]?.[0] || null,
      tags: org.tags || null,
      ownerEmail: ownerMember?.user_profiles?.email || null,
      ownerName: ownerMember?.user_profiles ? `${ownerMember.user_profiles.first_name} ${ownerMember.user_profiles.last_name}`.trim() : null,
      adminEmails: adminMembers.map((m: any) => m.user_profiles?.email).filter(Boolean) || []
    }
  }) || []

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