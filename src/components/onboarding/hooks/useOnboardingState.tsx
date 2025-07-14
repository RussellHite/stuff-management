'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { OnboardingData } from '../OnboardingWizard'

const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  householdName: '',
  householdId: '',
  rooms: [],
  firstContainer: undefined,
  firstItem: undefined
}

export function useOnboardingState(userId: string) {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA)
  const [isLoading, setIsLoading] = useState(true)

  // Load existing progress on mount
  useEffect(() => {
    loadProgress()
  }, [userId])

  const loadProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data && !error) {
        // Reconstruct onboarding data from saved progress
        const savedData: OnboardingData = {
          householdName: data.household_name || '',
          householdId: data.household_id || '',
          rooms: data.rooms_data || [],
          firstContainer: data.first_container_data,
          firstItem: data.first_item_data
        }
        setOnboardingData(savedData)
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveProgress = async (currentStep: number, data: OnboardingData) => {
    try {
      const progressData = {
        user_id: userId,
        household_id: data.householdId,
        current_step: currentStep,
        completed_steps: Array.from({ length: currentStep }, (_, i) => i + 1),
        household_name: data.householdName,
        rooms_data: data.rooms,
        first_container_data: data.firstContainer,
        first_item_data: data.firstItem,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('onboarding_progress')
        .upsert(progressData, { onConflict: 'user_id' })

      if (error) throw error
    } catch (error) {
      console.error('Failed to save onboarding progress:', error)
    }
  }

  const updateOnboardingData = (newData: Partial<OnboardingData>) => {
    setOnboardingData(current => ({ ...current, ...newData }))
  }

  const clearProgress = async () => {
    try {
      await supabase
        .from('onboarding_progress')
        .delete()
        .eq('user_id', userId)
      
      setOnboardingData(DEFAULT_ONBOARDING_DATA)
    } catch (error) {
      console.error('Failed to clear onboarding progress:', error)
    }
  }

  return {
    onboardingData,
    updateOnboardingData,
    saveProgress,
    clearProgress,
    isLoading
  }
}