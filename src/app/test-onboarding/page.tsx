'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingData } from '@/components/onboarding/OnboardingWizard'

export default function TestOnboardingPage() {
  const [completedData, setCompletedData] = useState<OnboardingData | null>(null)
  const router = useRouter()

  const handleOnboardingComplete = (data: OnboardingData) => {
    console.log('Onboarding completed with data:', data)
    setCompletedData(data)
  }

  const handleSkip = () => {
    console.log('Onboarding skipped')
  }

  const startOnboarding = () => {
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Test Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">🧪 Onboarding Test Page</h1>
          <p className="text-gray-600 mt-2">
            This is a test page to demo the household onboarding wizard
          </p>
        </div>
      </div>

      {/* Test Controls */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Controls</h2>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={startOnboarding}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Start Onboarding
            </button>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>

        {/* Completion Summary */}
        {completedData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ✅ Onboarding Completed!
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Household Name:</h3>
                <p className="text-gray-600">{completedData.householdName || 'Not provided'}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Household ID:</h3>
                <p className="text-gray-600 font-mono text-sm">{completedData.householdId || 'Not created'}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Rooms Configured:</h3>
                <div className="mt-2">
                  {completedData.rooms && completedData.rooms.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {completedData.rooms.map((room, index) => (
                        <div key={index} className="bg-gray-50 px-3 py-2 rounded text-sm">
                          {room.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No rooms configured</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">First Container:</h3>
                <p className="text-gray-600">
                  {completedData.firstContainer ? completedData.firstContainer.name : 'Not documented'}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">First Item:</h3>
                <p className="text-gray-600">
                  {completedData.firstItem ? completedData.firstItem.name : 'Not added'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How to Test Onboarding
          </h3>
          <div className="text-blue-800 space-y-2">
            <p>1. Click "Start Onboarding" to navigate to the full onboarding flow</p>
            <p>2. Complete the steps to create a household and set up your inventory</p>
            <p>3. The onboarding is now a full page experience, not a popup</p>
            <p>4. You can navigate back here or to the dashboard at any time</p>
          </div>
        </div>
      </div>
    </div>
  )
}