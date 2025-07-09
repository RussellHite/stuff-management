'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const StorageContainerManager = dynamic(() => import('./StorageContainerManager'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </div>
  )
})

interface ClientOnlyStorageContainerManagerProps {
  locationId: string
  householdId: string
  userRole: string
  onClose: () => void
}

export default function ClientOnlyStorageContainerManager(props: ClientOnlyStorageContainerManagerProps) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    }>
      <StorageContainerManager {...props} />
    </Suspense>
  )
}