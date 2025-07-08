'use client'

import ActivityFeed from './ActivityFeed'
import InventoryStatus from './InventoryStatus'
import PageHeader from '../layout/PageHeader'
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
  }
  locations: any[]
  shoppingItems: any[]
}

export default function HouseholdDashboardClient({
  householdId,
  householdName,
  userName,
  familyRole,
  userRole,
  stats,
  locations,
  shoppingItems
}: HouseholdDashboardClientProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader userName={userName} userRole={userRole} />
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            {householdName} - Family inventory dashboard
          </p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalConsumables}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalNonConsumables}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.shoppingListCount}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount}</p>
              </div>
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

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🚀 Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="/dashboard/household/manage" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center block">
                <div className="text-2xl mb-2">➕</div>
                <div className="font-medium">Manage Inventory</div>
                <div className="text-sm text-gray-500">Add & organize items</div>
              </a>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
                <div className="text-2xl mb-2">📱</div>
                <div className="font-medium">Scan QR</div>
                <div className="text-sm text-gray-500">Quick item lookup</div>
              </button>
              
              <a href="/dashboard/household/shopping" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center block">
                <div className="text-2xl mb-2">🛒</div>
                <div className="font-medium">Shopping List</div>
                <div className="text-sm text-gray-500">Manage shopping</div>
              </a>
              
              <a href="/dashboard/household/family" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center block">
                <div className="text-2xl mb-2">👥</div>
                <div className="font-medium">Family</div>
                <div className="text-sm text-gray-500">Manage members</div>
              </a>
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