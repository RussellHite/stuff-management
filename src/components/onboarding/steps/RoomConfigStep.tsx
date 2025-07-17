'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Plus, Minus, Home } from 'lucide-react'
import { OnboardingData } from '../OnboardingWizard'

interface RoomConfigStepProps {
  onComplete: (data: Partial<OnboardingData>) => void
  onBack: () => void
  initialData: OnboardingData
}

export default function RoomConfigStep({ onComplete, onBack, initialData }: RoomConfigStepProps) {
  const [bedrooms, setBedrooms] = useState(2)
  const [fullBathrooms, setFullBathrooms] = useState(1)
  const [halfBathrooms, setHalfBathrooms] = useState(1)
  const [selectedRooms, setSelectedRooms] = useState<string[]>(['kitchen', 'living_room'])
  const [customRoom, setCustomRoom] = useState('')

  const additionalRooms = [
    'dining_room', 'basement', 'garage', 'mudroom', 'pantry', 
    'office', 'laundry_room', 'family_room', 'den', 'attic',
    'sunroom', 'porch', 'playroom'
  ]

  const formatRoomName = (room: string) => {
    return room.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const handleRoomToggle = (room: string) => {
    setSelectedRooms(prev => 
      prev.includes(room) 
        ? prev.filter(r => r !== room)
        : [...prev, room]
    )
  }

  const handleAddCustomRoom = () => {
    if (customRoom.trim() && !selectedRooms.includes(customRoom.trim().toLowerCase())) {
      setSelectedRooms(prev => [...prev, customRoom.trim().toLowerCase()])
      setCustomRoom('')
    }
  }

  const handleContinue = () => {
    // Build complete room list
    const allRooms = []
    
    // Add bedrooms
    for (let i = 1; i <= bedrooms; i++) {
      allRooms.push({
        id: `bedroom_${i}`,
        name: `Bedroom ${i}`,
        type: 'bedroom',
        hasPhoto: false
      })
    }
    
    // Add bathrooms
    for (let i = 1; i <= fullBathrooms; i++) {
      allRooms.push({
        id: `bathroom_${i}`,
        name: `Bathroom ${i}`,
        type: 'bathroom',
        hasPhoto: false
      })
    }
    
    for (let i = 1; i <= halfBathrooms; i++) {
      allRooms.push({
        id: `half_bath_${i}`,
        name: `Half Bath ${i}`,
        type: 'half_bathroom',
        hasPhoto: false
      })
    }
    
    // Add selected additional rooms
    selectedRooms.forEach(room => {
      allRooms.push({
        id: room,
        name: formatRoomName(room),
        type: room,
        hasPhoto: false
      })
    })
    
    onComplete({ rooms: allRooms })
  }

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Home className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Let&apos;s map out your home
          </h2>
          <p className="text-gray-600">
            This helps us organize your belongings by location
          </p>
        </div>

        <div className="space-y-8">
          {/* Bedrooms */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bedrooms</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">How many bedrooms?</span>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setBedrooms(Math.max(1, bedrooms - 1))}
                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-bold w-8 text-center">{bedrooms}</span>
                <button
                  onClick={() => setBedrooms(bedrooms + 1)}
                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bathrooms */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Bathrooms</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Full bathrooms</span>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setFullBathrooms(Math.max(1, fullBathrooms - 1))}
                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-bold w-8 text-center">{fullBathrooms}</span>
                <button
                  onClick={() => setFullBathrooms(fullBathrooms + 1)}
                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Half bathrooms</span>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setHalfBathrooms(Math.max(0, halfBathrooms - 1))}
                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-bold w-8 text-center">{halfBathrooms}</span>
                <button
                  onClick={() => setHalfBathrooms(halfBathrooms + 1)}
                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center hover:border-blue-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Additional Rooms */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Rooms</h3>
            <p className="text-sm text-gray-600 mb-4">Kitchen and Living Room are included by default</p>
            
            <div className="flex flex-wrap gap-3 mb-6">
              {additionalRooms.map(room => (
                <button
                  key={room}
                  onClick={() => handleRoomToggle(room)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium whitespace-nowrap ${
                    selectedRooms.includes(room)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {formatRoomName(room)}
                </button>
              ))}
            </div>

            {/* Custom Room Input */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-3">
                Any other rooms you don&apos;t see here?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomRoom()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Workshop, Gym, Guest Room"
                />
                <button
                  onClick={handleAddCustomRoom}
                  disabled={!customRoom.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
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
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  )
}