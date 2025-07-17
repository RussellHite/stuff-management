'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Upload } from 'lucide-react'
import { OnboardingData } from '../OnboardingWizard'

interface PhotoTourStepProps {
  onComplete: (data: Partial<OnboardingData>) => void
  onBack: () => void
  onSkip: () => void
  initialData: OnboardingData
}

export default function PhotoTourStep({ onComplete, onBack, onSkip, initialData }: PhotoTourStepProps) {
  const [roomPhotos, setRoomPhotos] = useState<Record<string, string>>({})
  
  const rooms = initialData.rooms || []

  const handlePhotoUpload = (roomId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, file.type) // Debug log
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        console.log('File read result:', result.substring(0, 50) + '...') // Debug log
        setRoomPhotos(prev => {
          const updated = {
            ...prev,
            [roomId]: result
          }
          console.log('Updated room photos:', updated) // Debug log
          return updated
        })
      }
      reader.onerror = (e) => {
        console.error('File read error:', e) // Debug log
      }
      reader.readAsDataURL(file)
    }
  }

  const handleContinue = () => {
    // Update room data with photo status
    const updatedRooms = rooms.map(room => ({
      ...room,
      hasPhoto: !!roomPhotos[room.id],
      photoUrl: roomPhotos[room.id]
    }))

    onComplete({ 
      rooms: updatedRooms
    })
  }

  const completedPhotos = Object.keys(roomPhotos).length
  const totalRooms = rooms.length

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Camera className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Let&apos;s take a photo tour of your home
          </h2>
          <p className="text-gray-600 mb-4">
            Add photos to each room for easy visual navigation and organization
          </p>
          
          {/* Progress */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-blue-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">
                {completedPhotos} of {totalRooms} rooms photographed
              </span>
            </div>
            <div className="mt-2 bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalRooms > 0 ? (completedPhotos / totalRooms) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors">
              {/* Photo Area */}
              <div 
                className="aspect-video bg-gray-50 relative"
                style={{
                  backgroundImage: roomPhotos[room.id] ? `url("${roomPhotos[room.id]}")` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* Use img element instead of background for reliability */}
                {roomPhotos[room.id] && (
                  <img 
                    src={roomPhotos[room.id]} 
                    alt={room.name}
                    className="w-full h-full object-cover"
                    onLoad={() => console.log('Image loaded successfully for', room.name)}
                    onError={() => console.error('Image failed to load for', room.name)}
                  />
                )}
                
                {/* Debug info */}
                {roomPhotos[room.id] && (
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    Photo loaded
                  </div>
                )}
                {!roomPhotos[room.id] && (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* Upload Overlay - only show when no photo */}
                {!roomPhotos[room.id] && (
                  <label className="absolute inset-0 cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(room.id, e)}
                      className="hidden"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </label>
                )}

                {/* Status Badge */}
                {roomPhotos[room.id] && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-6 h-6 text-green-500 bg-white rounded-full" />
                  </div>
                )}
              </div>

              {/* Room Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{room.name}</h3>
                <p className="text-sm text-gray-500 capitalize">
                  {room.type.replace('_', ' ')}
                </p>
                
                <label className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(room.id, e)}
                    className="hidden"
                  />
                  <Camera className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {roomPhotos[room.id] ? 'Change Photo' : 'Add Photo'}
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>

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
              Skip Photos
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
    </div>
  )
}