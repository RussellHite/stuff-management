import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TestDataPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Test products query
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      categories (
        name,
        color
      )
    `)
    .eq('organization_id', '550e8400-e29b-41d4-a716-446655440000')

  // Test inventory query
  const { data: inventory } = await supabase
    .from('inventory')
    .select(`
      *,
      products (
        name,
        sku
      ),
      locations (
        name,
        type
      )
    `)
    .eq('organization_id', '550e8400-e29b-41d4-a716-446655440000')

  // Test locations query
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', '550e8400-e29b-41d4-a716-446655440000')

  // Test transactions query
  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      products (
        name,
        sku
      ),
      locations (
        name
      )
    `)
    .eq('organization_id', '550e8400-e29b-41d4-a716-446655440000')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Data Access</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Products ({products?.length || 0})</h2>
            <div className="space-y-2">
              {products?.map((product: any) => (
                <div key={product.id} className="border-b pb-2">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-600">
                    SKU: {product.sku} | Category: {product.categories?.name || 'None'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Cost: ${product.cost_price} | Selling: ${product.selling_price}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Inventory ({inventory?.length || 0})</h2>
            <div className="space-y-2">
              {inventory?.map((item: any) => (
                <div key={item.id} className="border-b pb-2">
                  <div className="font-medium">{item.products?.name}</div>
                  <div className="text-sm text-gray-600">
                    Location: {item.locations?.name} | Quantity: {item.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Locations ({locations?.length || 0})</h2>
            <div className="space-y-2">
              {locations?.map((location: any) => (
                <div key={location.id} className="border-b pb-2">
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-gray-600">
                    Type: {location.type} | {location.city}, {location.state}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Transactions ({transactions?.length || 0})</h2>
            <div className="space-y-2">
              {transactions?.map((transaction: any) => (
                <div key={transaction.id} className="border-b pb-2">
                  <div className="font-medium">{transaction.products?.name}</div>
                  <div className="text-sm text-gray-600">
                    {transaction.type.toUpperCase()}: {transaction.quantity} units
                  </div>
                  <div className="text-sm text-gray-600">
                    {transaction.reference_number} | {transaction.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}