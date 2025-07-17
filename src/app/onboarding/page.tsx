'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import OnboardingWizard, { OnboardingData } from '@/components/onboarding/OnboardingWizard'
import { toast } from 'react-hot-toast'

export default function OnboardingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in to continue')
        router.push('/auth/signin')
        return
      }

      setUserId(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
      toast.error('Authentication error')
      router.push('/auth/signin')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      // Mark organization as onboarding completed
      if (data.householdId) {
        const { error } = await supabase
          .from('organizations')
          .update({ onboarding_completed: true })
          .eq('id', data.householdId)

        if (error) {
          console.error('Error updating organization:', error)
        }
      }

      toast.success('Welcome to Stuff Happens! Your household is all set up.')
      router.push('/dashboard/household')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast.error('Error completing setup')
    }
  }

  const handleSkip = () => {
    toast.success('You can complete setup later from your dashboard')
    router.push('/dashboard/household')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <OnboardingWizard
      userId={userId}
      onComplete={handleOnboardingComplete}
      onSkip={handleSkip}
    />
  )
}