import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AcceptInvitationRequest {
  email?: string
  password?: string
  first_name?: string
  last_name?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const body: AcceptInvitationRequest = await request.json()

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select(`
        id,
        organization_id,
        email,
        role,
        permissions,
        status,
        expires_at,
        organizations!inner (
          id,
          name,
          max_members
        )
      `)
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found' 
      }, { status: 404 })
    }

    // Check invitation status
    if (invitation.status !== 'pending') {
      const statusMessages = {
        accepted: 'This invitation has already been accepted',
        expired: 'This invitation has expired',
        cancelled: 'This invitation has been cancelled'
      }
      return NextResponse.json({ 
        error: statusMessages[invitation.status as keyof typeof statusMessages] || 'Invalid invitation' 
      }, { status: 400 })
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return NextResponse.json({ 
        error: 'This invitation has expired' 
      }, { status: 400 })
    }

    // Check if organization has reached member limit
    const { count: currentMembers } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', invitation.organization_id)

    if ((currentMembers || 0) >= invitation.organizations.max_members) {
      return NextResponse.json({ 
        error: 'Organization has reached maximum member limit' 
      }, { status: 400 })
    }

    // Check if user is authenticated
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    let acceptingUser = currentUser

    // If no authenticated user, we need to create or authenticate
    if (!acceptingUser) {
      if (!body.email || !body.password) {
        return NextResponse.json({ 
          error: 'Email and password are required' 
        }, { status: 400 })
      }

      // Verify the email matches the invitation
      if (body.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return NextResponse.json({ 
          error: 'Email does not match invitation' 
        }, { status: 400 })
      }

      // Try to sign in first (user might already exist)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password
      })

      if (signInError) {
        // User doesn't exist or wrong password, try to create account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: body.email,
          password: body.password,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
          }
        })

        if (signUpError) {
          return NextResponse.json({ 
            error: `Failed to create account: ${signUpError.message}` 
          }, { status: 400 })
        }

        acceptingUser = signUpData.user
        
        // Create user profile
        if (acceptingUser) {
          await supabase
            .from('user_profiles')
            .insert({
              id: acceptingUser.id,
              email: body.email.toLowerCase(),
              first_name: body.first_name || body.email.split('@')[0],
              last_name: body.last_name || ''
            })
        }
      } else {
        acceptingUser = signInData.user
      }
    } else {
      // If user is authenticated, verify they have the right to accept this invitation
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', acceptingUser.id)
        .single()

      if (userProfile?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return NextResponse.json({ 
          error: 'You must be signed in with the invited email address' 
        }, { status: 400 })
      }
    }

    if (!acceptingUser) {
      return NextResponse.json({ 
        error: 'Failed to authenticate user' 
      }, { status: 500 })
    }

    // Check if user is already a member of this organization
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('user_id', acceptingUser.id)
      .eq('organization_id', invitation.organization_id)
      .single()

    if (existingMember) {
      // Mark invitation as accepted anyway
      await supabase
        .from('invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: acceptingUser.id
        })
        .eq('id', invitation.id)

      return NextResponse.json({ 
        error: 'You are already a member of this organization',
        organization: {
          id: invitation.organization_id,
          name: invitation.organizations.name
        }
      }, { status: 400 })
    }

    // Add user to organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: acceptingUser.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
        permissions: invitation.permissions,
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Error adding member to organization:', memberError)
      return NextResponse.json({ 
        error: `Failed to join organization: ${memberError.message}` 
      }, { status: 500 })
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: acceptingUser.id
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Error updating invitation status:', updateError)
      // Don't fail the request since the user was successfully added
    }

    // Log the activity
    await supabase
      .from('admin_activity_log')
      .insert({
        admin_user_id: acceptingUser.id,
        action: 'accept_invitation',
        target_type: 'invitation',
        target_id: invitation.id,
        organization_id: invitation.organization_id,
        details: {
          email: invitation.email,
          role: invitation.role,
          invitation_token: token.slice(-8) // Last 8 chars for tracking
        }
      })

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Successfully joined organization',
      organization: {
        id: invitation.organization_id,
        name: invitation.organizations.name
      },
      member: {
        id: acceptingUser.id,
        email: acceptingUser.email,
        role: invitation.role,
        joined_at: new Date().toISOString()
      },
      redirect_url: '/dashboard/household'
    }, { status: 200 })

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Get invitation details (without accepting)
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        personal_message,
        created_at,
        organizations!inner (
          id,
          name,
          type,
          description
        ),
        user_profiles!invitations_created_by_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found' 
      }, { status: 404 })
    }

    // Check if invitation is still valid
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    const isExpired = expiresAt < now

    if (isExpired && invitation.status === 'pending') {
      // Mark as expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)
      
      invitation.status = 'expired'
    }

    // Calculate time until expiration
    const timeUntilExpiry = isExpired ? 0 : expiresAt.getTime() - now.getTime()
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60))

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expires_at: invitation.expires_at,
        hours_until_expiry: hoursUntilExpiry,
        personal_message: invitation.personal_message,
        organization: invitation.organizations,
        invited_by: invitation.user_profiles ? {
          name: invitation.user_profiles.first_name && invitation.user_profiles.last_name
            ? `${invitation.user_profiles.first_name} ${invitation.user_profiles.last_name}`
            : invitation.user_profiles.email,
          email: invitation.user_profiles.email
        } : null
      },
      is_valid: invitation.status === 'pending' && !isExpired
    })

  } catch (error) {
    console.error('Error fetching invitation details:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}