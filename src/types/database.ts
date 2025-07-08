export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer'
export type TransactionType = 'in' | 'out' | 'transfer' | 'adjustment'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: UserRole
          permissions: Json
          invited_by: string | null
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role?: UserRole
          permissions?: Json
          invited_by?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: UserRole
          permissions?: Json
          invited_by?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          organization_id: string
          name: string
          type: string
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          postal_code: string | null
          coordinates: unknown | null
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          type?: string
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          coordinates?: unknown | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          type?: string
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          coordinates?: unknown | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          parent_id: string | null
          color: string | null
          icon: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          parent_id?: string | null
          color?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          color?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          organization_id: string
          sku: string
          name: string
          description: string | null
          category_id: string | null
          brand: string | null
          model: string | null
          specifications: Json
          unit_of_measure: string
          weight: number | null
          dimensions: Json | null
          cost_price: number | null
          selling_price: number | null
          min_stock_level: number
          max_stock_level: number | null
          reorder_point: number
          barcode: string | null
          qr_code: string | null
          images: string[] | null
          tags: string[] | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sku: string
          name: string
          description?: string | null
          category_id?: string | null
          brand?: string | null
          model?: string | null
          specifications?: Json
          unit_of_measure?: string
          weight?: number | null
          dimensions?: Json | null
          cost_price?: number | null
          selling_price?: number | null
          min_stock_level?: number
          max_stock_level?: number | null
          reorder_point?: number
          barcode?: string | null
          qr_code?: string | null
          images?: string[] | null
          tags?: string[] | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          sku?: string
          name?: string
          description?: string | null
          category_id?: string | null
          brand?: string | null
          model?: string | null
          specifications?: Json
          unit_of_measure?: string
          weight?: number | null
          dimensions?: Json | null
          cost_price?: number | null
          selling_price?: number | null
          min_stock_level?: number
          max_stock_level?: number | null
          reorder_point?: number
          barcode?: string | null
          qr_code?: string | null
          images?: string[] | null
          tags?: string[] | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          location_id: string
          quantity: number
          reserved_quantity: number
          last_counted_at: string | null
          last_counted_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          location_id: string
          quantity?: number
          reserved_quantity?: number
          last_counted_at?: string | null
          last_counted_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          location_id?: string
          quantity?: number
          reserved_quantity?: number
          last_counted_at?: string | null
          last_counted_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_transactions: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          location_id: string
          type: TransactionType
          quantity: number
          quantity_before: number
          quantity_after: number
          cost_per_unit: number | null
          total_cost: number | null
          reference_number: string | null
          notes: string | null
          metadata: Json
          created_by: string
          created_at: string
          to_location_id: string | null
          reason: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          location_id: string
          type: TransactionType
          quantity: number
          quantity_before: number
          quantity_after: number
          cost_per_unit?: number | null
          total_cost?: number | null
          reference_number?: string | null
          notes?: string | null
          metadata?: Json
          created_by: string
          created_at?: string
          to_location_id?: string | null
          reason?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          location_id?: string
          type?: TransactionType
          quantity?: number
          quantity_before?: number
          quantity_after?: number
          cost_per_unit?: number | null
          total_cost?: number | null
          reference_number?: string | null
          notes?: string | null
          metadata?: Json
          created_by?: string
          created_at?: string
          to_location_id?: string | null
          reason?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organizations: {
        Args: {
          user_uuid: string
        }
        Returns: {
          organization_id: string
          role: UserRole
        }[]
      }
      user_has_role_in_org: {
        Args: {
          user_uuid: string
          org_uuid: string
          required_role: UserRole
        }
        Returns: boolean
      }
      create_sample_transactions: {
        Args: {
          user_uuid: string
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: UserRole
      transaction_type: TransactionType
    }
  }
}