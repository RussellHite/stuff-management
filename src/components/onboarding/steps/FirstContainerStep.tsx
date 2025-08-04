'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Box, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { OnboardingData } from '../OnboardingWizard'
import ClientOnlyStorageContainerManager from '@/components/household/ClientOnlyStorageContainerManager'

interface FirstContainerStepProps {
  onComplete: (data: Partial<OnboardingData>) => void
  onBack: () => void
  onSkip: () => void
  initialData: OnboardingData
}

interface Location {
  id: string
  room_name: string
  description: string | null
  created_at: string
  updated_at: string
}

export default function FirstContainerStep({ onComplete, onBack, onSkip, initialData }: FirstContainerStepProps) {
  const [kitchenLocation, setKitchenLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(true)
  const [managingContainers, setManagingContainers] = useState(false)
  const [householdId, setHouseholdId] = useState<string>('')

  useEffect(() => {
    if (initialData.householdId) {
      setHouseholdId(initialData.householdId)
      findOrCreateKitchenLocation(initialData.householdId)
    }
  }, [initialData.householdId])

  const findOrCreateKitchenLocation = async (householdId: string) => {
    try {
      setLoading(true)
      
      // First, try to find existing kitchen location
      const { data: existingKitchen, error: searchError } = await supabase
        .from('household_locations')
        .select('*')
        .eq('organization_id', householdId)
        .ilike('room_name', '%kitchen%')
        .limit(1)

      if (searchError) throw searchError

      if (existingKitchen && existingKitchen.length > 0) {
        let kitchen = existingKitchen[0]
        setKitchenLocation(kitchen)
      } else {
        // Create kitchen location if it doesn't exist
        const kitchenRoom = initialData.rooms?.find(room => 
          room.name.toLowerCase().includes('kitchen') || 
          room.type === 'kitchen'
        )

        const { data: newKitchen, error: createError } = await supabase
          .from('household_locations')
          .insert([{
            organization_id: householdId,
            room_name: kitchenRoom?.name || 'Kitchen',
            description: 'Your kitchen storage area'
          }])
          .select()
          .single()

        if (createError) throw createError

        setKitchenLocation(newKitchen)
      }
    } catch (error) {
      console.error('Error finding/creating kitchen location:', error)
      toast.error('Failed to set up kitchen location')
    } finally {
      setLoading(false)
    }
  }

  const handleManageContainers = () => {
    setManagingContainers(true)
  }

  const handleContinue = () => {
    onComplete({
      firstContainerLocation: kitchenLocation ? {
        id: kitchenLocation.id,
        room_name: kitchenLocation.room_name,
        description: kitchenLocation.description || undefined
      } : undefined
    })
  }

  if (loading) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your kitchen location...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Box className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Let&apos;s organize your kitchen
          </h2>
          <p className="text-gray-600">
            Document your first storage container to learn how the system works
          </p>
        </div>

        {/* Kitchen Location Card */}
        {kitchenLocation && (
          <div className="bg-white rounded-lg shadow-md border overflow-hidden mb-8 max-w-2xl mx-auto">
            <div className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {kitchenLocation.room_name}
                </h3>
                {kitchenLocation.description && (
                  <p className="text-gray-600 mb-4">{kitchenLocation.description}</p>
                )}
              </div>

              {/* Getting Started Guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">📦 Getting Started with Storage Containers</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Add cabinets, drawers, shelves, and other storage areas</li>
                  <li>• Take photos to identify containers easily</li>
                  <li>• Track what items are stored in each container</li>
                </ul>
              </div>

              {/* Manage Storage Button */}
              <button
                onClick={handleManageContainers}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all mb-4"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Storage Container
              </button>

            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Skip Container Setup
            </button>
            
            <button
              onClick={handleContinue}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Storage Container Manager Modal */}
      {managingContainers && kitchenLocation && (
        <ClientOnlyStorageContainerManager
          locationId={kitchenLocation.id}
          householdId={householdId}
          userRole="admin"
          onClose={() => setManagingContainers(false)}
        />
      )}
    </div>
  )
}