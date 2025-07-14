'use client'

import { CheckCircle2, Circle } from 'lucide-react'

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  stepLabels: string[]
}

export default function ProgressIndicator({ currentStep, totalSteps, stepLabels }: ProgressIndicatorProps) {
  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative mb-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
        
        {/* Step Indicators */}
        <div className="absolute top-[-6px] flex justify-between w-full">
          {stepLabels.map((label, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isUpcoming = index > currentStep
            
            return (
              <div key={label} className="flex flex-col items-center">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300
                  ${isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isCurrent 
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300'
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Circle className={`w-2 h-2 ${isCurrent ? 'fill-white' : 'fill-gray-300'}`} />
                  )}
                </div>
                
                {/* Step Label - only show for larger screens */}
                <span className={`
                  hidden sm:block text-xs mt-2 text-center font-medium
                  ${isCompleted 
                    ? 'text-green-600' 
                    : isCurrent 
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  }
                `}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Current Step Label - for mobile */}
      <div className="sm:hidden text-center">
        <span className="text-sm font-medium text-blue-600">
          {stepLabels[currentStep]}
        </span>
      </div>
    </div>
  )
}