'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Package, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { OnboardingData } from '../OnboardingWizard'
import StorageSelector from '@/components/household/StorageSelector'

interface FirstItemStepProps {
  onComplete: (data: Partial<OnboardingData>) => void
  onBack: () => void
  onSkip: () => void
  initialData: OnboardingData
}

interface ValidationErrors {
  name?: string
  location?: string
  container?: string
}

export default function FirstItemStep({ onComplete, onBack, onSkip, initialData }: FirstItemStepProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedContainerId, setSelectedContainerId] = useState<string>('')
  const [itemAdded, setItemAdded] = useState(false)
  const [addedItem, setAddedItem] = useState<any>(null)
  
  const householdId = initialData.householdId || ''

  // Pre-select kitchen location if available
  useEffect(() => {
    if (initialData.firstContainerLocation?.id) {
      setSelectedLocationId(initialData.firstContainerLocation.id)
    }
  }, [initialData.firstContainerLocation])

  const validateForm = (formData: FormData): ValidationErrors => {
    const errors: ValidationErrors = {}
    
    const name = formData.get('name') as string
    if (!name?.trim()) {
      errors.name = 'Item name is required'
    }
    
    if (!selectedLocationId) {
      errors.location = 'Please select a location'
    }
    
    if (!selectedContainerId) {
      errors.container = 'Please select a storage container'
    }
    
    return errors
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const formData = new FormData(e.target as HTMLFormElement)
    const errors = validateForm(formData)
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setIsAdding(true)
    setValidationErrors({})

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const itemData = {
        organization_id: householdId,
        primary_location_id: selectedLocationId,
        storage_container_id: selectedContainerId,
        name: (formData.get('name') as string).trim(),
        brand: (formData.get('brand') as string)?.trim() || null,
        model: (formData.get('model') as string)?.trim() || null,
        current_quality_rating: (formData.get('condition') as string) || 'good'
      }

      const { data, error } = await supabase
        .from('non_consumables')
        .insert([itemData])
        .select()
        .single()

      if (error) throw error

      setAddedItem(data)
      setItemAdded(true)
      toast.success('Item added successfully!')

    } catch (error: any) {
      console.error('Error adding item:', error)
      toast.error(error.message || 'Failed to add item')
    } finally {
      setIsAdding(false)
    }
  }

  const handleContinue = () => {
    onComplete({
      firstItem: addedItem ? {
        id: addedItem.id,
        name: addedItem.name,
        category: 'non_consumable',
        containerId: addedItem.container_id
      } : undefined
    })
  }

  if (itemAdded) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Great! Your first item has been added
          </h2>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-green-800">
              <strong>✅ {addedItem.name}</strong> has been added to your inventory
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h4 className="font-semibold text-blue-900 mb-2">🎉 You're getting the hang of it!</h4>
            <p className="text-sm text-blue-800">
              You can now add more items to your containers, take photos, and keep track of everything in your home.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={onBack}
              className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            
            <button
              onClick={handleContinue}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Complete Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Package className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Add your first item
          </h2>
          <p className="text-gray-600">
            Learn how to catalog and categorize your belongings
          </p>
        </div>

        {/* Getting Started Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h4 className="font-semibold text-blue-900 mb-2">📝 Adding Your First Item</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Choose a location and storage container</li>
            <li>• Add the item name and any details you want to track</li>
            <li>• Start simple - you can always add more details later</li>
          </ul>
        </div>

        {/* Add Item Form */}
        <form onSubmit={handleAddItem} className="space-y-6">
          {/* Storage Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Where is this item located?</h3>
            <StorageSelector
              householdId={householdId}
              selectedLocationId={selectedLocationId}
              selectedContainerId={selectedContainerId}
              onLocationChange={setSelectedLocationId}
              onContainerChange={(containerId) => setSelectedContainerId(containerId || '')}
              required={true}
            />
            {validationErrors.location && (
              <p className="text-sm text-red-600">{validationErrors.location}</p>
            )}
            {validationErrors.container && (
              <p className="text-sm text-red-600">{validationErrors.container}</p>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Item Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={validationErrors.name ? 'has-error' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Coffee Maker, Screwdriver Set"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Cuisinart, DeWalt"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DCC-3200, DCD771C2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <select
                  name="condition"
                  defaultValue="good"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding Item...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </>
              )}
            </button>
          </div>
        </form>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={onBack}
            className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <button
            onClick={onSkip}
            className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Skip Item Setup
          </button>
        </div>
      </div>
    </div>
  )
}