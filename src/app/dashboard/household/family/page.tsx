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

  const { data: household } = await supabase
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
    .single()

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