import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function POST(request: NextRequest) {
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

    const { organizationIds } = await request.json()

    if (!organizationIds || !Array.isArray(organizationIds)) {
      return NextResponse.json({ error: 'Invalid organization IDs' }, { status: 400 })
    }

    // Safety check: Only allow deletion of test accounts
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, tags')
      .in('id', organizationIds)

    if (!organizations) {
      return NextResponse.json({ error: 'Organizations not found' }, { status: 404 })
    }

    // Filter to only test accounts
    const testOrganizations = organizations.filter(org => 
      org.tags && typeof org.tags === 'object' && 
      (org.tags as any).testing === 'test_account'
    )

    if (testOrganizations.length === 0) {
      return NextResponse.json({ error: 'No test organizations found to delete' }, { status: 400 })
    }

    const testOrgIds = testOrganizations.map(org => org.id)

    // Delete organizations (cascade will handle related data)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .in('id', testOrgIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log admin action
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: user.id,
        action: 'bulk_delete_organizations',
        target_type: 'organization',
        details: {
          deleted_count: testOrgIds.length,
          organization_ids: testOrgIds
        }
      })

    return NextResponse.json({ 
      success: true, 
      deleted_count: testOrgIds.length 
    })
  } catch (error) {
    console.error('Error bulk deleting organizations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}