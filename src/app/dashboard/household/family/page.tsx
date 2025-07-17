import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FamilyMemberManager from '@/components/household/FamilyMemberManager'
import PageHeader from '@/components/layout/PageHeader'

export default async function FamilyManagementPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: householdMembers } = await supabase
    .from('organization_members')
    .select(`
      *,
      organizations (
        id,
        name,
        slug,
        description
      )
    `)
    .eq('user_id', user.id)
    .limit(1)

  let household = householdMembers?.[0]

  // If no household found through membership, check if user created any organizations
  if (!household?.organizations) {
    const { data: userOrganizations } = await supabase
      .from('organizations')
      .select('id, name, slug, description')
      .eq('created_by', user.id)
      .limit(1)
    
    if (userOrganizations?.[0]) {
      // Try to add them to the members table
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: userOrganizations[0].id,
          user_id: user.id,
          role: 'admin'
        }])
      
      if (!memberError) {
        household = {
          organization_id: userOrganizations[0].id,
          user_id: user.id,
          role: 'admin',
          organizations: userOrganizations[0]
        }
      }
    }
  }

  if (!household?.organizations) {
    redirect('/dashboard/household')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user has permission to manage family members
  const canManageFamily = household.role === 'admin' || household.role === 'manager'

  if (!canManageFamily) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader 
          userName={profile?.first_name || 'Family Member'} 
          userRole={household.role} 
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to manage family members.</p>
            <a 
              href="/dashboard/household" 
              className="text-blue-600 hover:text-blue-700"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        userName={profile?.first_name || 'Family Member'} 
        userRole={household.role} 
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FamilyMemberManager
          householdId={household.organizations.id}
          userId={user.id}
          userRole={household.role}
          householdName={household.organizations.name}
        />
      </div>
    </div>
  )
}