import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Optional filters
    const locationId = searchParams.get('location_id')
    const organizationId = searchParams.get('organization_id')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('storage_containers')
      .select(`
        id,
        organization_id,
        location_id,
        name,
        description,
        photo_url,
        storage_path,
        capacity_info,
        container_type,
        is_active,
        created_at,
        updated_at,
        household_locations!storage_containers_location_id_fkey (
          id,
          room_name,
          description
        )
      `)

    // Apply filters
    if (locationId) {
      query = query.eq('location_id', locationId)
    }
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }
    if (isActive) {
      query = query.eq('is_active', isActive === 'true')
    } else {
      // Default to active containers only
      query = query.eq('is_active', true)
    }

    query = query.order('name', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching storage containers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('storage_containers')
      .insert([body])
      .select()

    if (error) {
      console.error('Error creating storage container:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}