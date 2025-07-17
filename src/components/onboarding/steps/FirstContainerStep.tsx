'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Box, Camera, Plus } from 'lucide-react'
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
  is_primary_storage: boolean
  created_at: string
  updated_at: string
  location_photos?: LocationPhoto[]
}

interface LocationPhoto {
  id: string
  photo_url: string
  storage_path: string
  caption: string | null
  photo_type: string
  created_at: string
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
        .select(`
          *,
          location_photos (
            id,
            photo_url,
            storage_path,
            caption,
            photo_type,
            created_at
          )
        `)
        .eq('organization_id', householdId)
        .ilike('room_name', '%kitchen%')
        .limit(1)

      if (searchError) throw searchError

      if (existingKitchen && existingKitchen.length > 0) {
        let kitchen = existingKitchen[0]
        
        // Check if we need to add the photo from onboarding
        const kitchenRoom = initialData.rooms?.find(room => 
          room.name.toLowerCase().includes('kitchen') || 
          room.type === 'kitchen'
        )
        
        if (kitchenRoom?.photoUrl) {
          // Delete existing photos if any
          if (kitchen.location_photos && kitchen.location_photos.length > 0) {
            for (const photo of kitchen.location_photos) {
              if (photo.storage_path) {
                await supabase.storage
                  .from('household-photos')
                  .remove([photo.storage_path])
              }
            }
            await supabase
              .from('location_photos')
              .delete()
              .eq('location_id', kitchen.id)
          }
          
          // Upload the photo from onboarding to the existing kitchen location
          try {
            const base64Data = kitchenRoom.photoUrl.split(',')[1]
            const byteCharacters = atob(base64Data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: 'image/jpeg' })
            
            const fileName = `kitchen-${Date.now()}.jpg`
            const filePath = `${householdId}/location-photos/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('household-photos')
              .upload(filePath, blob)

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('household-photos')
                .getPublicUrl(filePath)

              await supabase
                .from('location_photos')
                .insert({
                  location_id: kitchen.id,
                  organization_id: householdId,
                  photo_url: publicUrl,
                  storage_path: filePath,
                  caption: 'Kitchen photo from onboarding',
                  photo_type: 'main'
                })

              kitchen.location_photos = [{
                id: '',
                photo_url: publicUrl,
                storage_path: filePath,
                caption: 'Kitchen photo from onboarding',
                photo_type: 'main',
                created_at: new Date().toISOString()
              }]
            }
          } catch (photoError) {
            console.error('Error uploading kitchen photo to existing location:', photoError)
          }
        }
        
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
            description: 'Your kitchen storage area',
            is_primary_storage: true
          }])
          .select()
          .single()

        if (createError) throw createError

        // If the kitchen room has a photo, upload it to the location
        if (kitchenRoom?.photoUrl && newKitchen) {
          try {
            // Convert base64 to file for upload
            const base64Data = kitchenRoom.photoUrl.split(',')[1]
            const byteCharacters = atob(base64Data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: 'image/jpeg' })
            
            // Create file path
            const fileName = `kitchen-${Date.now()}.jpg`
            const filePath = `${householdId}/location-photos/${fileName}`

            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('household-photos')
              .upload(filePath, blob)

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('household-photos')
                .getPublicUrl(filePath)

              // Store photo reference in database
              await supabase
                .from('location_photos')
                .insert({
                  location_id: newKitchen.id,
                  organization_id: householdId,
                  photo_url: publicUrl,
                  storage_path: filePath,
                  caption: 'Kitchen photo from onboarding',
                  photo_type: 'main'
                })

              // Update kitchen location with photo
              newKitchen.location_photos = [{
                id: '',
                photo_url: publicUrl,
                storage_path: filePath,
                caption: 'Kitchen photo from onboarding',
                photo_type: 'main',
                created_at: new Date().toISOString()
              }]
            }
          } catch (photoError) {
            console.error('Error uploading kitchen photo:', photoError)
            // Continue without photo if upload fails
          }
        }

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
      firstContainerLocation: kitchenLocation
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
            {/* Photo Area */}
            <div className="h-48 bg-gray-50 flex items-center justify-center">
              {kitchenLocation.location_photos?.[0] ? (
                <img 
                  src={kitchenLocation.location_photos[0].photo_url} 
                  alt={kitchenLocation.location_photos[0].caption || kitchenLocation.room_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {kitchenLocation.room_name} photo area
                  </p>
                </div>
              )}
            </div>

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

              {kitchenLocation.is_primary_storage && (
                <div className="text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Primary Storage Location
                  </span>
                </div>
              )}
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