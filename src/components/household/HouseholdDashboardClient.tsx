'use client'

import ActivityFeed from './ActivityFeed'
import InventoryStatus from './InventoryStatus'
import PageHeader from '../layout/PageHeader'
import GlobalSearch from './GlobalSearch'
import { Toaster } from 'react-hot-toast'

interface HouseholdDashboardClientProps {
  householdId: string
  householdName: string
  userName: string
  familyRole: string
  userRole: string
  stats: {
    totalConsumables: number
    totalNonConsumables: number
    shoppingListCount: number
    lowStockCount: number
    itemsNeedingAttention: number
  }
  locations: any[]
  shoppingItems: any[]
  nonConsumablesNeedingAttention: any[]
}

export default function HouseholdDashboardClient({
  householdId,
  householdName,
  userName,
  familyRole,
  userRole,
  stats,
  locations,
  shoppingItems,
  nonConsumablesNeedingAttention
}: HouseholdDashboardClientProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader userName={userName} userRole={userRole} />
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Search */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {userName}! 👋
              </h1>
              <p className="text-gray-600 mt-2">
                {householdName} - Family inventory dashboard
              </p>
            </div>
            <div className="flex-1 max-w-md">
              <GlobalSearch 
                householdId={householdId}
                onItemSelect={(item) => {
                  // Navigate to item detail based on type
                  if (item.type === 'consumable') {
                    window.location.href = `/dashboard/household/manage?tab=consumables&item=${item.id}`
                  } else {
                    window.location.href = `/dashboard/household/manage?tab=non-consumables&item=${item.id}`
                  }
                }}
              />
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Real-time Inventory Status */}
          <div className="lg:col-span-1">
            <InventoryStatus householdId={householdId} />
          </div>

          {/* Real-time Activity Feed */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">👨‍👩‍👧‍👦 Live Activity Feed</h3>
              <p className="text-sm text-gray-500 mt-1">Real-time family activity</p>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <ActivityFeed householdId={householdId} limit={15} />
            </div>
          </div>

          {/* Shopping List Preview */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">📝 Shopping List</h3>
                <a href="/dashboard/household/shopping" className="text-sm text-blue-600 hover:text-blue-700">View All</a>
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
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">Shopping list is empty</p>
              )}
            </div>
          </div>
        </div>

        {/* Items Needing Attention */}
        {nonConsumablesNeedingAttention && nonConsumablesNeedingAttention.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">🛠️ Items Needing Attention</h3>
                <a href="/dashboard/household/manage" className="text-sm text-blue-600 hover:text-blue-700">Manage Items</a>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nonConsumablesNeedingAttention.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.current_condition === 'broken' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {item.current_condition === 'broken' ? '🛠️ Broken' : '🔧 Poor'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      📍 {item.household_locations?.room_name || 'Unknown location'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}