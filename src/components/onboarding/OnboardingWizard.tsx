'use client'

import { useState } from 'react'
import WelcomeStep from './steps/WelcomeStep'
import RoomConfigStep from './steps/RoomConfigStep'
import PhotoTourStep from './steps/PhotoTourStep'
import FirstContainerStep from './steps/FirstContainerStep'
import FirstItemStep from './steps/FirstItemStep'
import CompletionStep from './steps/CompletionStep'
import ProgressIndicator from './components/ProgressIndicator'
import { useOnboardingState } from './hooks/useOnboardingState'

export interface OnboardingData {
  householdName: string
  householdId: string
  rooms: Array<{
    id: string
    name: string
    type: string
    hasPhoto: boolean
    photoUrl?: string
    customName?: string
  }>
  firstContainer?: {
    id: string
    name: string
    locationId: string
    photoUrl?: string
  }
  firstItem?: {
    id: string
    name: string
    category: string
    containerId: string
  }
}

interface OnboardingWizardProps {
  userId: string
  onComplete: (data: OnboardingData) => void
  onSkip?: () => void
}

const STEPS = [
  'Welcome',
  'Room Setup',
  'Photo Tour', 
  'First Container',
  'First Item',
  'Complete'
]

export default function OnboardingWizard({ userId, onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const { onboardingData, updateOnboardingData, saveProgress } = useOnboardingState(userId)

  const handleStepComplete = async (stepData: Partial<OnboardingData>) => {
    const updatedData = { ...onboardingData, ...stepData }
    updateOnboardingData(updatedData)
    
    // Save progress after each step
    await saveProgress(currentStep + 1, updatedData)
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete(updatedData)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeStep
            onComplete={(data) => handleStepComplete(data)}
            onSkip={handleSkip}
            initialData={onboardingData}
          />
        )
      case 1:
        return (
          <RoomConfigStep
            onComplete={(data) => handleStepComplete(data)}
            onBack={handleBack}
            initialData={onboardingData}
          />
        )
      case 2:
        return (
          <PhotoTourStep
            onComplete={(data) => handleStepComplete(data)}
            onBack={handleBack}
            onSkip={() => handleStepComplete({})}
            initialData={onboardingData}
          />
        )
      case 3:
        return (
          <FirstContainerStep
            onComplete={(data) => handleStepComplete(data)}
            onBack={handleBack}
            onSkip={() => handleStepComplete({})}
            initialData={onboardingData}
          />
        )
      case 4:
        return (
          <FirstItemStep
            onComplete={(data) => handleStepComplete(data)}
            onBack={handleBack}
            onSkip={() => handleStepComplete({})}
            initialData={onboardingData}
          />
        )
      case 5:
        return (
          <CompletionStep
            onComplete={() => onComplete(onboardingData)}
            onContinue={() => onComplete(onboardingData)}
            data={onboardingData}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto">
        {/* Header with Progress */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to Stuff Happens
              </h1>
              {currentStep > 0 && (
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              )}
            </div>
            
            <ProgressIndicator 
              currentStep={currentStep} 
              totalSteps={STEPS.length}
              stepLabels={STEPS}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white min-h-[calc(100vh-200px)]">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  )
}