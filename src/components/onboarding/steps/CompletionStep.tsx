'use client'

import { CheckCircle2, Users, ArrowRight } from 'lucide-react'
import { OnboardingData } from '../OnboardingWizard'

interface CompletionStepProps {
  onComplete: () => void
  onContinue: () => void
  data: OnboardingData
}

export default function CompletionStep({ onComplete, onContinue, data }: CompletionStepProps) {
  const accomplishments = [
    { text: `Created "${data.householdName}" household`, completed: !!data.householdName },
    { text: `Mapped ${data.rooms?.length || 0} rooms`, completed: (data.rooms?.length || 0) > 0 },
    { text: 'Documented first container', completed: !!data.firstContainer },
    { text: 'Added first item', completed: !!data.firstItem }
  ]

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Great work!
        </h2>
        
        <p className="text-lg text-gray-600 mb-8">
          You&apos;ve successfully set up your household inventory system.
        </p>

        {/* Accomplishments Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What you&apos;ve accomplished:</h3>
          <div className="space-y-3">
            {accomplishments.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle2 className={`w-5 h-5 ${item.completed ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={item.completed ? 'text-gray-900' : 'text-gray-500'}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Ready to continue?
          </h3>
          <p className="text-blue-800 mb-4">
            You can now explore the full app and continue documenting your belongings at your own pace.
          </p>
          
          <div className="flex items-center justify-center space-x-2 text-sm text-blue-700">
            <Users className="w-4 h-4" />
            <span>Want to invite family members to help? You can do that from the Family tab.</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onContinue}
          className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all text-lg font-medium"
        >
          Enter Your Household
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
        
        <p className="text-sm text-gray-500 mt-4">
          You can always access these setup steps again from the settings menu.
        </p>
      </div>
    </div>
  )
}