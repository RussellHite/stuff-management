import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: organizationId, memberId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member of this organization
    const { data: requesterMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!requesterMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get member details
    const { data: member, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        permissions,
        joined_at,
        created_at,
        updated_at,
        user_profiles!organization_members_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          created_at
        )
      `)
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Transform response
    const memberData = {
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      permissions: member.permissions,
      joined_at: member.joined_at,
      profile: member.user_profiles ? {
        id: (member.user_profiles as any).id,
        email: (member.user_profiles as any).email,
        first_name: (member.user_profiles as any).first_name,
        last_name: (member.user_profiles as any).last_name,
        full_name: (member.user_profiles as any).first_name && (member.user_profiles as any).last_name 
          ? `${(member.user_profiles as any).first_name} ${(member.user_profiles as any).last_name}`.trim()
          : (member.user_profiles as any).email,
        avatar_url: (member.user_profiles as any).avatar_url,
        member_since: (member.user_profiles as any).created_at
      } : null
    }

    return NextResponse.json({ member: memberData })

  } catch (error) {
    console.error('Error fetching member details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: organizationId, memberId } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update members
    const { data: requesterMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!requesterMember || !['admin', 'manager'].includes(requesterMember.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current member details
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .single()

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent users from modifying themselves unless they're an admin
    if (currentMember.user_id === user.id && requesterMember.role !== 'admin') {
      return NextResponse.json({ 
        error: 'You cannot modify your own member record' 
      }, { status: 403 })
    }

    // Validate role if provided
    if (body.role && !['admin', 'manager', 'member'].includes(body.role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin, manager, or member' 
      }, { status: 400 })
    }

    // Prevent managers from promoting to admin or demoting admins
    if (requesterMember.role === 'manager') {
      if (body.role === 'admin' || currentMember.role === 'admin') {
        return NextResponse.json({ 
          error: 'Managers cannot modify admin roles' 
        }, { status: 403 })
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.role) {
      updateData.role = body.role
    }

    if (body.permissions) {
      updateData.permissions = body.permissions
    }

    // Update member
    const { data: updatedMember, error: updateError } = await supabase
      .from('organization_members')
      .update(updateData)
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .select(`
        id,
        user_id,
        role,
        permissions,
        joined_at,
        updated_at,
        user_profiles!organization_members_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating member:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log admin activity
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: user.id,
        action: 'update_member',
        target_type: 'user',
        target_id: currentMember.user_id,
        organization_id: organizationId,
        details: {
          member_id: memberId,
          changes: body,
          previous_role: currentMember.role,
          new_role: body.role || currentMember.role
        }
      })

    return NextResponse.json({
      member: updatedMember,
      message: 'Member updated successfully'
    })

  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: organizationId, memberId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to remove members
    const { data: requesterMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!requesterMember || !['admin', 'manager'].includes(requesterMember.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get member to be removed
    const { data: memberToRemove } = await supabase
      .from('organization_members')
      .select(`
        user_id, 
        role,
        user_profiles!organization_members_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .single()

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent self-removal
    if (memberToRemove.user_id === user.id) {
      return NextResponse.json({ 
        error: 'You cannot remove yourself from the organization' 
      }, { status: 403 })
    }

    // Prevent managers from removing admins
    if (requesterMember.role === 'manager' && memberToRemove.role === 'admin') {
      return NextResponse.json({ 
        error: 'Managers cannot remove admin members' 
      }, { status: 403 })
    }

    // Check if this is the last admin
    if (memberToRemove.role === 'admin') {
      const { count: adminCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'admin')

      if ((adminCount || 0) <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last admin from the organization' 
        }, { status: 400 })
      }
    }

    // Remove member from organization
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', organizationId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Log admin activity
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: user.id,
        action: 'remove_member',
        target_type: 'user',
        target_id: memberToRemove.user_id,
        organization_id: organizationId,
        details: {
          removed_user_email: memberToRemove.user_profiles?.email,
          removed_user_role: memberToRemove.role,
          member_id: memberId
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
      removed_member: {
        user_id: memberToRemove.user_id,
        email: memberToRemove.user_profiles?.email,
        role: memberToRemove.role
      }
    })

  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}