'use client'

import { useState } from 'react'
import LocationManager from './LocationManager'
import ConsumablesManager from './ConsumablesManager'
import FamilyMemberManager from './FamilyMemberManager'
import { Home, Package, Settings, Users } from 'lucide-react'

interface HouseholdManagerClientProps {
  householdId: string
  userId: string
  userRole: string
  householdName: string
}

export default function HouseholdManagerClient({ 
  householdId, 
  userId, 
  userRole,
  householdName 
}: HouseholdManagerClientProps) {
  const [activeTab, setActiveTab] = useState<'locations' | 'consumables' | 'non-consumables' | 'family'>('locations')

  const canManageFamily = userRole === 'admin' || userRole === 'manager'
  
  const tabs = [
    { id: 'locations', label: 'Locations', icon: Home },
    { id: 'consumables', label: 'Consumables', icon: Package },
    { id: 'non-consumables', label: 'Household Items', icon: Settings },
    ...(canManageFamily ? [{ id: 'family', label: 'Family', icon: Users }] : [])
  ]

  const canEdit = userRole === 'admin' || userRole === 'manager' || userRole === 'employee'

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'locations' && (
          <LocationManager
            householdId={householdId}
            userRole={userRole}
          />
        )}
        
        {activeTab === 'consumables' && (
          <ConsumablesManager
            householdId={householdId}
            userRole={userRole}
            userId={userId}
          />
        )}
        
        {activeTab === 'non-consumables' && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏠</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Household Items Coming Soon
            </h3>
            <p className="text-gray-500 mb-4">
              Manage appliances, furniture, and other household items
            </p>
          </div>
        )}
        
        {activeTab === 'family' && (
          <FamilyMemberManager
            householdId={householdId}
            userId={userId}
            userRole={userRole}
            householdName={householdName}
          />
        )}
      </div>
    </div>
  )
}