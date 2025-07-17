import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminOrganizations from '@/components/admin/AdminOrganizations'
import AdminLayout from '@/components/admin/AdminLayout'

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

  // Get all organizations first (simple query)
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('Organizations query error:', error)
  console.log('Organizations data:', organizations)
  console.log('Organizations count:', organizations?.length)

  // Get organization members separately 
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select(`
      id,
      organization_id,
      role,
      user_profiles (
        first_name,
        last_name,
        email
      )
    `)

  console.log('Members query error:', membersError)
  console.log('Members data:', members)

  // Group members by organization
  const membersByOrg = members?.reduce((acc, member) => {
    if (!acc[member.organization_id]) {
      acc[member.organization_id] = []
    }
    acc[member.organization_id].push(member)
    return acc
  }, {} as Record<string, any[]>) || {}

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
    // Get members for this organization
    const orgMembers = membersByOrg[org.id] || []
    const adminMembers = orgMembers.filter((m: any) => m.role === 'admin')
    const ownerMember = adminMembers[0] // First admin is considered owner
    
    return {
      ...org,
      type: 'household', // Default type since we don't have organization_type
      memberCount: orgMembers.length,
      adminCount: adminMembers.length,
      latestAnalytics: analyticsMap[org.id]?.[0] || null,
      tags: org.tags || null,
      ownerEmail: ownerMember?.user_profiles?.email || null,
      ownerName: ownerMember?.user_profiles ? `${ownerMember.user_profiles.first_name} ${ownerMember.user_profiles.last_name}`.trim() : null,
      adminEmails: adminMembers.map((m: any) => m.user_profiles?.email).filter(Boolean) || []
    }
  }) || []

  console.log('Enriched organizations:', enrichedOrganizations)

  return (
    <AdminLayout 
      adminUser={{
        id: user.id,
        email: user.email || '',
        name: 'Admin'
      }}
      currentPage="Organizations"
    >
      <AdminOrganizations 
        organizations={enrichedOrganizations}
        adminUser={{
          id: user.id,
          email: user.email || '',
          name: 'Admin'
        }}
      />
    </AdminLayout>
  )
}