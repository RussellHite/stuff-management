import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get consumables in this container
    const { data: consumables, error: consumablesError } = await supabase
      .from('consumables')
      .select(`
        id,
        name,
        current_quantity,
        reorder_threshold,
        category,
        brand,
        size_per_unit,
        unit_type,
        created_at,
        updated_at
      `)
      .eq('storage_container_id', id)
      .eq('is_active', true)

    if (consumablesError) {
      console.error('Error fetching consumables:', consumablesError)
      return NextResponse.json({ error: consumablesError.message }, { status: 500 })
    }

    // Get non-consumables in this container
    const { data: nonConsumables, error: nonConsumablesError } = await supabase
      .from('non_consumables')
      .select(`
        id,
        name,
        category,
        brand,
        model,
        condition,
        quantity,
        created_at,
        updated_at
      `)
      .eq('storage_container_id', id)
      .eq('is_active', true)

    if (nonConsumablesError) {
      console.error('Error fetching non-consumables:', nonConsumablesError)
      return NextResponse.json({ error: nonConsumablesError.message }, { status: 500 })
    }

    const response = {
      consumables: consumables || [],
      non_consumables: nonConsumables || [],
      summary: {
        consumables_count: consumables?.length || 0,
        non_consumables_count: nonConsumables?.length || 0,
        total_items: (consumables?.length || 0) + (nonConsumables?.length || 0)
      }
    }

    return NextResponse.json({ data: response })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}