import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })
    
    // Check if user is authenticated and admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_application_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_application_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { category, value } = await request.json()

    if (!category || !value) {
      return NextResponse.json({ error: 'Category and value are required' }, { status: 400 })
    }

    // Get current tags
    const { data: org } = await supabase
      .from('organizations')
      .select('tags')
      .eq('id', params.id)
      .single()

    const currentTags = org?.tags || {}
    const updatedTags = { ...currentTags, [category]: value }

    // Update organization with new tags
    const { error } = await supabase
      .from('organizations')
      .update({ tags: updatedTags })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating organization tags:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}