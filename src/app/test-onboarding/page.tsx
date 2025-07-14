'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingWizard, { OnboardingData } from '@/components/onboarding/OnboardingWizard'

export default function TestOnboardingPage() {
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [completedData, setCompletedData] = useState<OnboardingData | null>(null)
  const router = useRouter()

  const handleOnboardingComplete = (data: OnboardingData) => {
    console.log('Onboarding completed with data:', data)
    setCompletedData(data)
    setShowOnboarding(false)
  }

  const handleSkip = () => {
    console.log('Onboarding skipped')
    setShowOnboarding(false)
  }

  const handleRestart = () => {
    setCompletedData(null)
    setShowOnboarding(true)
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
              onClick={handleRestart}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {showOnboarding ? 'Restart' : 'Start'} Onboarding
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
        {completedData && !showOnboarding && (
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

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          userId="test-user-id"
          onComplete={handleOnboardingComplete}
          onSkip={handleSkip}
        />
      )}
    </div>
  )
}