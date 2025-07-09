'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Check, X, ShoppingCart, Edit2, Users, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface ShoppingList {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  shopping_list_items?: ShoppingListItem[]
  user_profiles?: {
    first_name: string
    last_name: string
  }
}

interface ShoppingListItem {
  id: string
  shopping_list_id: string
  item_name: string
  quantity: number
  notes: string | null
  is_purchased: boolean
  purchased_by: string | null
  purchased_at: string | null
  consumable_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  user_profiles?: {
    first_name: string
    last_name: string
  }
  purchased_by_profile?: {
    first_name: string
    last_name: string
  }
}

interface ShoppingListManagerProps {
  householdId: string
  userId: string
  userRole: string
}

export default function ShoppingListManager({ householdId, userId, userRole }: ShoppingListManagerProps) {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [activeList, setActiveList] = useState<ShoppingList | null>(null)
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShoppingLists()
    
    // Subscribe to real-time updates
    const listChannel = supabase
      .channel(`shopping-lists-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_lists',
          filter: `organization_id=eq.${householdId}`
        },
        () => {
          fetchShoppingLists()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(listChannel)
    }
  }, [householdId])

  useEffect(() => {
    if (!activeList) return

    // Subscribe to real-time updates for items in the active list
    const itemChannel = supabase
      .channel(`shopping-items-${activeList.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `shopping_list_id=eq.${activeList.id}`
        },
        () => {
          fetchListItems(activeList.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(itemChannel)
    }
  }, [activeList?.id])

  const fetchShoppingLists = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          user_profiles!shopping_lists_created_by_fkey (
            first_name,
            last_name
          ),
          shopping_list_items (
            id,
            is_purchased
          )
        `)
        .eq('organization_id', householdId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setLists(data || [])
      
      // Set the first list as active if none selected
      if (data && data.length > 0 && !activeList) {
        const firstList = data[0]
        fetchListItems(firstList.id)
      }
    } catch (error) {
      toast.error('Failed to fetch shopping lists')
    } finally {
      setLoading(false)
    }
  }

  const fetchListItems = async (listId: string) => {
    try {
      const { data: listData, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          user_profiles!shopping_lists_created_by_fkey (
            first_name,
            last_name
          ),
          shopping_list_items (
            *,
            user_profiles!shopping_list_items_created_by_fkey (
              first_name,
              last_name
            ),
            purchased_by_profile:user_profiles!shopping_list_items_purchased_by_fkey (
              first_name,
              last_name
            )
          )
        `)
        .eq('id', listId)
        .single()

      if (error) throw error
      
      setActiveList(listData)
    } catch (error) {
      toast.error('Failed to fetch list items')
    }
  }

  const createShoppingList = async (formData: FormData) => {
    const name = formData.get('name') as string
    const description = formData.get('description') as string

    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([{
          organization_id: householdId,
          name,
          description: description || null,
          created_by: userId
        }])
        .select()

      if (error) throw error
      
      await fetchShoppingLists()
      setIsCreatingList(false)
      toast.success('Shopping list created')
      
      // Log activity
      await logActivity('created_list', `Created shopping list "${name}"`)
    } catch (error) {
      toast.error('Failed to create list')
    }
  }

  const addItemToList = async (formData: FormData) => {
    if (!activeList) return

    const itemData = {
      shopping_list_id: activeList.id,
      item_name: formData.get('item_name') as string,
      quantity: parseInt(formData.get('quantity') as string) || 1,
      notes: formData.get('notes') as string || null,
      created_by: userId
    }

    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .insert([itemData])

      if (error) throw error
      
      setIsAddingItem(false)
      toast.success('Item added to list')
      
      // Log activity
      await logActivity('added_to_shopping_list', `Added "${itemData.item_name}" to shopping list`)
    } catch (error) {
      toast.error('Failed to add item')
    }
  }

  const updateItem = async (formData: FormData) => {
    if (!editingItem) return

    const itemData = {
      item_name: formData.get('item_name') as string,
      quantity: parseInt(formData.get('quantity') as string) || 1,
      notes: formData.get('notes') as string || null,
      updated_at: new Date().toISOString()
    }

    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update(itemData)
        .eq('id', editingItem.id)

      if (error) throw error
      
      setEditingItem(null)
      toast.success('Item updated')
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const toggleItemPurchased = async (item: ShoppingListItem) => {
    const isPurchasing = !item.is_purchased

    try {
      const updateData: any = {
        is_purchased: isPurchasing,
        updated_at: new Date().toISOString()
      }

      if (isPurchasing) {
        updateData.purchased_by = userId
        updateData.purchased_at = new Date().toISOString()
      } else {
        updateData.purchased_by = null
        updateData.purchased_at = null
      }

      const { error } = await supabase
        .from('shopping_list_items')
        .update(updateData)
        .eq('id', item.id)

      if (error) throw error
      
      // Log activity
      if (isPurchasing) {
        await logActivity('purchased_item', `Purchased "${item.item_name}"`)
      }
      
      toast.success(isPurchasing ? 'Item marked as purchased' : 'Item marked as unpurchased')
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const deleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Remove "${itemName}" from the list?`)) return

    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      
      toast.success('Item removed')
    } catch (error) {
      toast.error('Failed to remove item')
    }
  }

  const deleteList = async (listId: string, listName: string) => {
    if (!confirm(`Delete the "${listName}" shopping list? This will remove all items in the list.`)) return

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ is_active: false })
        .eq('id', listId)

      if (error) throw error
      
      await fetchShoppingLists()
      if (activeList?.id === listId) {
        setActiveList(null)
      }
      
      toast.success('List deleted')
    } catch (error) {
      toast.error('Failed to delete list')
    }
  }

  const logActivity = async (activityType: string, description: string) => {
    try {
      await supabase.rpc('log_family_activity', {
        org_id: householdId,
        user_id: userId,
        activity_type: activityType,
        description: description,
        metadata: {}
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  const ItemForm = ({ item, onSubmit }: { item?: ShoppingListItem, onSubmit: (formData: FormData) => void }) => (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <input
            type="text"
            name="item_name"
            defaultValue={item?.item_name}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Milk, Bread, Eggs"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            name="quantity"
            defaultValue={item?.quantity || 1}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <input
            type="text"
            name="notes"
            defaultValue={item?.notes || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Brand preference, size"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setIsAddingItem(false)
            setEditingItem(null)
          }}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {item ? 'Update' : 'Add'} Item
        </button>
      </div>
    </form>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">🛒 Shopping Lists</h2>
        <button
          onClick={() => setIsCreatingList(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New List
        </button>
      </div>

      {/* Create List Modal */}
      {isCreatingList && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-blue-500/75 to-purple-600/75 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreatingList(false)
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create New Shopping List</h3>
                <button
                  onClick={() => setIsCreatingList(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <form action={createShoppingList} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    List Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Weekly Groceries, Party Supplies"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingList(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create List
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lists Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Your Lists</h3>
            </div>
            <div className="p-2">
              {lists.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">No lists yet</p>
              ) : (
                <div className="space-y-1">
                  {lists.map((list) => {
                    const totalItems = list.shopping_list_items?.length || 0
                    const purchasedItems = list.shopping_list_items?.filter(i => i.is_purchased).length || 0
                    
                    return (
                      <button
                        key={list.id}
                        onClick={() => fetchListItems(list.id)}
                        className={`w-full text-left p-3 rounded-md transition-colors ${
                          activeList?.id === list.id
                            ? 'bg-blue-50 border-blue-200 border'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{list.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {purchasedItems}/{totalItems} items
                            </p>
                          </div>
                          <ShoppingCart className={`h-4 w-4 ${
                            activeList?.id === list.id ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active List */}
        <div className="lg:col-span-3">
          {activeList ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{activeList.name}</h3>
                    {activeList.description && (
                      <p className="text-sm text-gray-600 mt-1">{activeList.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Created by {activeList.user_profiles?.first_name || 'Unknown'} • 
                      {' '}{formatDistanceToNow(new Date(activeList.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsAddingItem(true)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      Add Item
                    </button>
                    <button
                      onClick={() => deleteList(activeList.id, activeList.name)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Add Item Form */}
                {isAddingItem && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Add Item</h4>
                    <ItemForm onSubmit={addItemToList} />
                  </div>
                )}

                {/* Edit Item Form */}
                {editingItem && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Edit Item</h4>
                    <ItemForm item={editingItem} onSubmit={updateItem} />
                  </div>
                )}

                {/* Items List */}
                {activeList.shopping_list_items && activeList.shopping_list_items.length > 0 ? (
                  <div className="space-y-2">
                    {/* Unpurchased Items */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">To Buy</h4>
                      {activeList.shopping_list_items
                        .filter(item => !item.is_purchased)
                        .map((item) => (
                          <ShoppingListItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => toggleItemPurchased(item)}
                            onEdit={() => setEditingItem(item)}
                            onDelete={() => deleteItem(item.id, item.item_name)}
                          />
                        ))}
                      {activeList.shopping_list_items.filter(i => !i.is_purchased).length === 0 && (
                        <p className="text-gray-500 text-sm py-2">All items purchased!</p>
                      )}
                    </div>

                    {/* Purchased Items */}
                    {activeList.shopping_list_items.some(i => i.is_purchased) && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Purchased</h4>
                        {activeList.shopping_list_items
                          .filter(item => item.is_purchased)
                          .map((item) => (
                            <ShoppingListItemRow
                              key={item.id}
                              item={item}
                              onToggle={() => toggleItemPurchased(item)}
                              onEdit={() => setEditingItem(item)}
                              onDelete={() => deleteItem(item.id, item.item_name)}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No items in this list yet</p>
                    <button
                      onClick={() => setIsAddingItem(true)}
                      className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Add your first item
                    </button>
                  </div>
                )}

                {/* List Summary */}
                {activeList.shopping_list_items && activeList.shopping_list_items.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Items:</span>
                      <span className="font-medium">{activeList.shopping_list_items.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No List Selected</h3>
              <p className="text-gray-500 mb-4">Create a new list or select an existing one to get started</p>
              <button
                onClick={() => setIsCreatingList(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Your First List
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ShoppingListItemRow({ 
  item, 
  onToggle, 
  onEdit, 
  onDelete 
}: {
  item: ShoppingListItem
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
      item.is_purchased 
        ? 'bg-gray-50 border-gray-200' 
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
          item.is_purchased
            ? 'bg-green-600 border-green-600'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {item.is_purchased && <Check className="h-3 w-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-medium ${item.is_purchased ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
          {item.item_name}
          {item.quantity > 1 && <span className="text-gray-500 ml-1">×{item.quantity}</span>}
        </p>
        <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
          {item.notes && <span>{item.notes}</span>}
          {item.is_purchased && item.purchased_by_profile && (
            <span className="flex items-center">
              <Check className="h-3 w-3 mr-1" />
              by {item.purchased_by_profile.first_name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {!item.is_purchased && (
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-blue-600"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}