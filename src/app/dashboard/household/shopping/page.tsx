import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShoppingListManager from '@/components/household/ShoppingListManager'
import PageHeader from '@/components/layout/PageHeader'

export default async function ShoppingListPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        userName={profile?.first_name || 'Family Member'} 
        userRole={household.role} 
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ShoppingListManager
          householdId={household.organizations.id}
          userId={user.id}
          userRole={household.role}
        />
      </div>
    </div>
  )
}