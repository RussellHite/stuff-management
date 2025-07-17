'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Upload, Trash2 } from 'lucide-react'
import { OnboardingData } from '../OnboardingWizard'

interface PhotoTourStepProps {
  onComplete: (data: Partial<OnboardingData>) => void
  onBack: () => void
  onSkip: () => void
  initialData: OnboardingData
}

export default function PhotoTourStep({ onComplete, onBack, onSkip, initialData }: PhotoTourStepProps) {
  const [roomPhotos, setRoomPhotos] = useState<Record<string, string>>(
    (initialData.rooms || []).reduce((acc, room) => ({
      ...acc,
      ...(room.photoUrl ? { [room.id]: room.photoUrl } : {})
    }), {})
  )
  const [roomNames, setRoomNames] = useState<Record<string, string>>(
    (initialData.rooms || []).reduce((acc, room) => ({
      ...acc,
      [room.id]: room.name
    }), {})
  )
  const [deletedRooms, setDeletedRooms] = useState<Set<string>>(new Set())
  
  const rooms = (initialData.rooms || []).filter(room => !deletedRooms.has(room.id))

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

  const handleDeleteRoom = (roomId: string) => {
    setDeletedRooms(prev => new Set([...prev, roomId]))
    // Clean up photos and names for deleted room
    setRoomPhotos(prev => {
      const updated = { ...prev }
      delete updated[roomId]
      return updated
    })
    setRoomNames(prev => {
      const updated = { ...prev }
      delete updated[roomId]
      return updated
    })
  }

  const handleContinue = () => {
    // Update room data with photo status and custom names
    const updatedRooms = rooms.map(room => ({
      ...room,
      name: roomNames[room.id] || room.name,
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
            <div key={room.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors relative">
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
                
                {/* Change Photo button overlaid on photo */}
                {roomPhotos[room.id] && (
                  <label className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer hover:bg-blue-100 transition-colors text-xs">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(room.id, e)}
                      className="hidden"
                    />
                    Change Photo
                  </label>
                )}
                {!roomPhotos[room.id] && (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(room.id, e)}
                        className="hidden"
                      />
                      <Camera className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Add Photo
                      </span>
                    </label>
                  </div>
                )}

              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDeleteRoom(room.id)}
                className="absolute top-2 right-2 w-8 h-8 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center"
                title="Delete room"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Room Info */}
              <div className="p-4">
                <input
                  type="text"
                  value={roomNames[room.id] || room.name}
                  onChange={(e) => setRoomNames(prev => ({
                    ...prev,
                    [room.id]: e.target.value
                  }))}
                  className="w-full font-semibold text-gray-900 bg-transparent border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white rounded px-2 py-1"
                  placeholder={room.name}
                />
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