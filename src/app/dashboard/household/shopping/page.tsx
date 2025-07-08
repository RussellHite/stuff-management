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