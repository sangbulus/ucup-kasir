import { supabase } from '@/lib/supabase'
import type {
  PriceTier,
  CustomerPriceMatrix,
  CustomerGroup,
  CustomerGroupWithMembers,
} from '@/types/priceMatrix'

export const priceMatrixService = {
  // Price Tiers
  async getPriceTiers(productId?: string) {
    let query = supabase
      .from('price_tiers')
      .select(`
        *,
        product:products(id, name, sku, price_sell)
      `)
      .order('created_at', { ascending: false })

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data, error } = await query

    if (error) throw error
    return data as PriceTier[]
  },

  async getPriceTier(id: string) {
    const { data, error } = await supabase
      .from('price_tiers')
      .select(`
        *,
        product:products(id, name, sku, price_sell)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as PriceTier
  },

  async createPriceTier(data: Partial<PriceTier>) {
    const { data: result, error } = await supabase
      .from('price_tiers')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result as PriceTier
  },

  async updatePriceTier(id: string, data: Partial<PriceTier>) {
    const { data: result, error } = await supabase
      .from('price_tiers')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return result as PriceTier
  },

  async deletePriceTier(id: string) {
    const { error } = await supabase.from('price_tiers').delete().eq('id', id)

    if (error) throw error
  },

  // Customer Price Matrix
  async getCustomerPrices(customerId?: string, productId?: string, groupId?: string) {
    let query = supabase
      .from('customer_price_matrix')
      .select(`
        *,
        customer:customers(id, name),
        group:customer_groups(id, name),
        product:products(id, name, sku, price_sell)
      `)
      .order('created_at', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }
    if (groupId) {
      query = query.eq('group_id', groupId)
    }
    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data, error } = await query

    if (error) throw error
    return data as CustomerPriceMatrix[]
  },

  // Hanya harga yang ditujukan ke pelanggan individual (bukan grup)
  async getIndividualPrices(productId?: string) {
    let query = supabase
      .from('customer_price_matrix')
      .select(`
        *,
        customer:customers(id, name),
        product:products(id, name, sku, price_sell)
      `)
      .not('customer_id', 'is', null)
      .order('created_at', { ascending: false })
    if (productId) query = query.eq('product_id', productId)
    const { data, error } = await query
    if (error) throw error
    return data as CustomerPriceMatrix[]
  },

  // Hanya harga yang ditujukan ke grup
  async getGroupPrices(productId?: string) {
    let query = supabase
      .from('customer_price_matrix')
      .select(`
        *,
        group:customer_groups(id, name),
        product:products(id, name, sku, price_sell)
      `)
      .not('group_id', 'is', null)
      .order('created_at', { ascending: false })
    if (productId) query = query.eq('product_id', productId)
    const { data, error } = await query
    if (error) throw error
    return data as CustomerPriceMatrix[]
  },

  async getCustomerPrice(id: string) {
    const { data, error } = await supabase
      .from('customer_price_matrix')
      .select(`
        *,
        customer:customers(id, name),
        group:customer_groups(id, name),
        product:products(id, name, sku, price_sell)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as CustomerPriceMatrix
  },

  async createCustomerPrice(data: Partial<CustomerPriceMatrix>) {
    const { data: result, error } = await supabase
      .from('customer_price_matrix')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result as CustomerPriceMatrix
  },

  async createCustomerPrices(list: Array<Partial<CustomerPriceMatrix>>) {
    const { data, error } = await supabase
      .from('customer_price_matrix')
      .insert(list)
      .select()

    if (error) throw error
    return data as CustomerPriceMatrix[]
  },

  async updateCustomerPrice(id: string, data: Partial<CustomerPriceMatrix>) {
    const { data: result, error } = await supabase
      .from('customer_price_matrix')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return result as CustomerPriceMatrix
  },

  async deleteCustomerPrice(id: string) {
    const { error } = await supabase.from('customer_price_matrix').delete().eq('id', id)

    if (error) throw error
  },

  // Get Applicable Price
  async getApplicablePrice(
    productId: string,
    customerId?: string,
    quantity: number = 1,
    date: string = new Date().toISOString().split('T')[0]
  ) {
    const { data, error } = await supabase.rpc('get_applicable_price', {
      p_product_id: productId,
      p_customer_id: customerId || null,
      p_quantity: quantity,
      p_date: date,
    })

    if (error) throw error
    return data as number
  },

  // Customer Groups
  async getGroups() {
    const { data, error } = await supabase
      .from('customer_groups')
      .select(`
        *,
        members:customer_group_members(customer_id, customer:customers(id, name))
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as CustomerGroupWithMembers[]
  },

  async getGroup(id: string) {
    const { data, error } = await supabase
      .from('customer_groups')
      .select(`
        *,
        members:customer_group_members(customer_id, customer:customers(id, name))
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as CustomerGroupWithMembers
  },

  async createGroup(data: Partial<CustomerGroup>, memberIds: string[] = []) {
    const { data: group, error } = await supabase
      .from('customer_groups')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    if (memberIds.length) {
      const { error: mErr } = await supabase
        .from('customer_group_members')
        .insert(memberIds.map((customer_id) => ({ group_id: group.id, customer_id })))
      if (mErr) throw mErr
    }
    return group as CustomerGroup
  },

  // Ganti seluruh anggota grup sesuai daftar baru (append & remove)
  async updateGroup(id: string, data: Partial<CustomerGroup>, memberIds?: string[]) {
    const { data: group, error } = await supabase
      .from('customer_groups')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (memberIds) {
      const { data: existing, error: exErr } = await supabase
        .from('customer_group_members')
        .select('customer_id')
        .eq('group_id', id)
      if (exErr) throw exErr

      const current = new Set((existing || []).map((r: any) => r.customer_id))
      const wanted = new Set(memberIds)
      const toAdd = [...wanted].filter((c) => !current.has(c))
      const toRemove = [...current].filter((c) => !wanted.has(c))

      if (toRemove.length) {
        const { error: rmErr } = await supabase
          .from('customer_group_members')
          .delete()
          .eq('group_id', id)
          .in('customer_id', toRemove)
        if (rmErr) throw rmErr
      }
      if (toAdd.length) {
        const { error: addErr } = await supabase
          .from('customer_group_members')
          .insert(toAdd.map((customer_id) => ({ group_id: id, customer_id })))
        if (addErr) throw addErr
      }
    }
    return group as CustomerGroup
  },

  async deleteGroup(id: string) {
    const { error } = await supabase.from('customer_groups').delete().eq('id', id)
    if (error) throw error
  },
}
