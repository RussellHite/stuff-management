'use client'

import { ArrowLeft, ArrowRight, Camera, CheckCircle2 } from 'lucide-react'
import { OnboardingData } from '../OnboardingWizard'

interface PhotoTourStepProps {
  onComplete: (data: Partial<OnboardingData>) => void
  onBack: () => void
  onSkip: () => void
  initialData: OnboardingData
}

export default function PhotoTourStep({ onComplete, onBack, onSkip, initialData }: PhotoTourStepProps) {
  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-2xl mx-auto text-center">
        <Camera className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Let&apos;s take a tour of your house
        </h2>
        <p className="text-gray-600 mb-8">
          Take photos of each room for easy visual navigation
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-yellow-800">
            📋 <strong>Photo Tour coming soon!</strong> This step will guide you through photographing each room.
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
          
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex items-center px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Skip Photos
            </button>
            
            <button
              onClick={() => onComplete({})}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}