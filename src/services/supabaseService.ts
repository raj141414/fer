import { createClient } from '@supabase/supabase-js'

// You'll need to set up a Supabase project and get these values
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Order service functions
export const orderService = {
  // Save order to Supabase instead of localStorage
  async saveOrder(orderData: any) {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
    
    if (error) {
      console.error('Error saving order:', error)
      throw error
    }
    
    return data[0]
  },

  // Get all orders from Supabase
  async getAllOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching orders:', error)
      throw error
    }
    
    return data || []
  },

  // Get order by ID
  async getOrderById(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single()
    
    if (error) {
      console.error('Error fetching order:', error)
      throw error
    }
    
    return data
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('order_id', orderId)
      .select()
    
    if (error) {
      console.error('Error updating order:', error)
      throw error
    }
    
    return data[0]
  }
}