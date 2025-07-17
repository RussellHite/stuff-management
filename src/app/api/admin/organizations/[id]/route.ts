import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function DELETE(
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

    // Get organization to check if it's a test account
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, tags')
      .eq('id', params.id)
      .single()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Safety check: Only allow deletion of test accounts
    const isTestAccount = organization.tags && 
      typeof organization.tags === 'object' && 
      (organization.tags as any).testing === 'test_account'

    if (!isTestAccount) {
      return NextResponse.json({ 
        error: 'Only test organizations can be deleted' 
      }, { status: 403 })
    }

    // Delete organization (cascade will handle related data)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log admin action
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: user.id,
        action: 'delete_organization',
        target_type: 'organization',
        target_id: params.id,
        details: {
          organization_name: organization.name,
          was_test_account: true
        }
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}