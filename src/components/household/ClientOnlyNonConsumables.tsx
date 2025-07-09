'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const NonConsumablesManager = dynamic(() => import('./NonConsumablesManager'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
})

interface ClientOnlyNonConsumablesProps {
  householdId: string
  userId: string
  userRole: string
}

export default function ClientOnlyNonConsumables(props: ClientOnlyNonConsumablesProps) {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NonConsumablesManager {...props} />
    </Suspense>
  )
}