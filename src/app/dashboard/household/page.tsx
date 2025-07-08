import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.first_name || 'Family Member'}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            {household.organizations.name} - Family inventory dashboard
          </p>
          <div className="mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {familyRole === 'household_admin' ? '🏠 Household Admin' : 
               familyRole === 'family_member' ? '👨‍👩‍👧‍👦 Family Member' : '👶 Limited Access'}
            </span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  🥫
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Consumables</p>
                <p className="text-2xl font-bold text-gray-900">{totalConsumables || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  🏠
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Household Items</p>
                <p className="text-2xl font-bold text-gray-900">{totalNonConsumables || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  🛒
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Shopping List</p>
                <p className="text-2xl font-bold text-gray-900">{shoppingItems?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  ⚠️
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Need Reorder</p>
                <p className="text-2xl font-bold text-gray-900">{lowConsumables?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items Needing Reorder */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">🛒 Need to Reorder</h3>
            </div>
            <div className="p-6">
              {lowConsumables && lowConsumables.length > 0 ? (
                <ul className="space-y-3">
                  {lowConsumables.map((item: any) => (
                    <li key={item.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.household_locations?.room_name} • {item.current_quantity} left
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Low Stock
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">All items are well stocked! 🎉</p>
              )}
            </div>
          </div>

          {/* Recent Family Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">👨‍👩‍👧‍👦 Recent Activity</h3>
            </div>
            <div className="p-6">
              {recentActivity && recentActivity.length > 0 ? (
                <ul className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity: any) => (
                    <li key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">
                            {activity.user_profiles?.first_name || 'Someone'}
                          </span>{' '}
                          {activity.description.toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Shopping List Preview */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">📝 Shopping List</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
              </div>
            </div>
            <div className="p-6">
              {shoppingItems && shoppingItems.length > 0 ? (
                <ul className="space-y-3">
                  {shoppingItems.slice(0, 5).map((item: any) => (
                    <li key={item.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{item.item_name}</div>
                        <div className="text-sm text-gray-500">
                          Qty: {item.quantity} {item.notes && `• ${item.notes}`}
                        </div>
                      </div>
                      {item.estimated_cost && (
                        <span className="text-sm text-gray-600">
                          ${item.estimated_cost.toFixed(2)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">Shopping list is empty</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🚀 Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-2xl mb-2">➕</div>
                <div className="font-medium">Add Item</div>
                <div className="text-sm text-gray-500">Add new household item</div>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-2xl mb-2">📱</div>
                <div className="font-medium">Scan QR</div>
                <div className="text-sm text-gray-500">Quick item lookup</div>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-2xl mb-2">🛒</div>
                <div className="font-medium">Shopping List</div>
                <div className="text-sm text-gray-500">Manage shopping</div>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium">Family</div>
                <div className="text-sm text-gray-500">Manage members</div>
              </button>
            </div>
          </div>
        </div>

        {/* Household Locations */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🏠 Household Locations</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations?.map((location: any) => (
                <div key={location.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{location.room_name}</div>
                      {location.description && (
                        <div className="text-sm text-gray-500">{location.description}</div>
                      )}
                    </div>
                    {location.is_primary_storage && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Storage
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}