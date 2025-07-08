import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HouseholdDashboardClient from '@/components/household/HouseholdDashboardClient'

export default async function HouseholdDashboard() {
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Household Found</h1>
          <p className="text-gray-600 mb-4">You need to be part of a household to access the inventory system.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Create Household
          </button>
        </div>
      </div>
    )
  }

  // Get household statistics
  const householdId = household.organizations.id

  // Get consumables needing reorder
  const { data: allConsumables } = await supabase
    .from('consumables')
    .select('id, name, current_quantity, reorder_threshold, primary_location_id, household_locations(room_name)')
    .eq('organization_id', householdId)
    .eq('is_active', true)
  
  // Filter for low stock items
  const lowConsumables = allConsumables?.filter(item => 
    item.current_quantity <= item.reorder_threshold
  )

  // Get recent family activity
  const { data: recentActivity } = await supabase
    .from('family_activity_log')
    .select(`
      *,
      user_profiles (
        first_name,
        last_name
      )
    `)
    .eq('organization_id', householdId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get household locations
  const { data: locations } = await supabase
    .from('household_locations')
    .select('*')
    .eq('organization_id', householdId)

  // Get shopping list items
  const { data: shoppingItems } = await supabase
    .from('shopping_list_items')
    .select(`
      *,
      shopping_lists!inner (
        name,
        organization_id
      )
    `)
    .eq('shopping_lists.organization_id', householdId)
    .eq('is_purchased', false)
    .limit(10)

  // Get household stats
  const { count: totalConsumables } = await supabase
    .from('consumables')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', householdId)
    .eq('is_active', true)

  const { count: totalNonConsumables } = await supabase
    .from('non_consumables')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', householdId)
    .eq('is_active', true)

  const familyRole = household.role === 'admin' ? 'household_admin' : 
                    household.role === 'manager' || household.role === 'employee' ? 'family_member' : 'kids_limited'

  return (
    <HouseholdDashboardClient
      householdId={householdId}
      householdName={household.organizations.name}
      userName={profile?.first_name || 'Family Member'}
      familyRole={familyRole}
      userRole={household.role}
      stats={{
        totalConsumables: totalConsumables || 0,
        totalNonConsumables: totalNonConsumables || 0,
        shoppingListCount: shoppingItems?.length || 0,
        lowStockCount: lowConsumables?.length || 0
      }}
      locations={locations || []}
      shoppingItems={shoppingItems || []}
    />
  )
}