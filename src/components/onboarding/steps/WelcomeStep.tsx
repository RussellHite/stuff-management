'use client'

import { useState } from 'react'
import { Home, ArrowRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { OnboardingData } from '../OnboardingWizard'

interface WelcomeStepProps {
  onComplete: (data: Partial<OnboardingData>) => void
  onSkip: () => void
  initialData: OnboardingData
}

export default function WelcomeStep({ onComplete, onSkip, initialData }: WelcomeStepProps) {
  const [householdName, setHouseholdName] = useState(initialData.householdName || '')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!householdName.trim()) {
      toast.error('Please enter a household name')
      return
    }

    setIsCreating(true)
    
    try {
      // Create the household organization
      const { data: household, error: householdError } = await supabase
        .from('organizations')
        .insert([{
          name: householdName.trim(),
          type: 'household',
          onboarding_completed: false
        }])
        .select()
        .single()

      if (householdError) throw householdError

      // Add the current user as admin of the household
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert([{
            organization_id: household.id,
            user_id: user.id,
            role: 'admin',
            status: 'active'
          }])

        if (memberError) throw memberError
      }

      toast.success(`Welcome to ${householdName}!`)
      
      onComplete({
        householdName: householdName.trim(),
        householdId: household.id
      })
      
    } catch (error: any) {
      console.error('Failed to create household:', error)
      toast.error('Failed to create household. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Stuff Happens!
          </h2>
          
          <p className="text-lg text-gray-600 mb-2">
            Let&apos;s get your household organized and set up your inventory system.
          </p>
          
          <p className="text-gray-500">
            We&apos;ll guide you through setting up your rooms, taking photos, and adding your first items.
          </p>
        </div>

        {/* Household Name Form */}
        <form onSubmit={handleCreateHousehold} className="space-y-6">
          <div className="text-left">
            <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 mb-2">
              What should we call your household?
            </label>
            <input
              type="text"
              id="householdName"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="e.g., The Smith Family, Johnson Household"
              disabled={isCreating}
              autoFocus
            />
            <p className="text-sm text-gray-500 mt-2">
              This helps identify your household when sharing with family members.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={onSkip}
              className="flex items-center justify-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isCreating}
            >
              <X className="w-4 h-4 mr-2" />
              Skip Setup
            </button>
            
            <button
              type="submit"
              disabled={!householdName.trim() || isCreating}
              className="flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Benefits Preview */}
        <div className="mt-12 text-left">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What we&apos;ll help you set up:
          </h3>
          
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Map your rooms</p>
                <p className="text-gray-600">Configure bedrooms, bathrooms, and common areas</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Take photos</p>
                <p className="text-gray-600">Visual tour of your house for easy navigation</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Organize storage</p>
                <p className="text-gray-600">Document your first cabinet or storage area</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Add first items</p>
                <p className="text-gray-600">Learn to catalog and categorize your belongings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}