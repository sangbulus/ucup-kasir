import { ref, computed } from 'vue'
import { priceMatrixServiceAdapter as priceMatrixService } from '@/services'
import type { PriceTier, CustomerPriceMatrix } from '@/types/priceMatrix'

export function usePriceMatrix() {
  const loading = ref(false)
  const priceTiers = ref<PriceTier[]>([])
  const customerPrices = ref<CustomerPriceMatrix[]>([])

  // Load price tiers untuk produk tertentu
  const loadPriceTiers = async (productId?: string) => {
    loading.value = true
    try {
      priceTiers.value = await priceMatrixService.getPriceTiers(productId)
    } catch (error) {
      console.error('Error loading price tiers:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Load customer prices
  const loadCustomerPrices = async (customerId?: string, productId?: string) => {
    loading.value = true
    try {
      customerPrices.value = await priceMatrixService.getCustomerPrices(customerId, productId)
    } catch (error) {
      console.error('Error loading customer prices:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Get applicable price untuk produk dan pelanggan
  const getApplicablePrice = async (
    productId: string,
    quantity: number,
    customerId?: string,
    defaultPrice?: number
  ): Promise<number> => {
    try {
      const price = await priceMatrixService.getApplicablePrice(
        productId,
        customerId,
        quantity,
        new Date().toISOString().split('T')[0]
      )
      return price
    } catch (error) {
      console.error('Error getting applicable price:', error)
      // Fallback ke harga default jika ada error
      return defaultPrice || 0
    }
  }

  // Create price tier
  const createPriceTier = async (data: Partial<PriceTier>) => {
    loading.value = true
    try {
      const result = await priceMatrixService.createPriceTier(data)
      priceTiers.value.unshift(result)
      return result
    } catch (error) {
      console.error('Error creating price tier:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Update price tier
  const updatePriceTier = async (id: string, data: Partial<PriceTier>) => {
    loading.value = true
    try {
      const result = await priceMatrixService.updatePriceTier(id, data)
      const index = priceTiers.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        priceTiers.value[index] = result
      }
      return result
    } catch (error) {
      console.error('Error updating price tier:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Delete price tier
  const deletePriceTier = async (id: string) => {
    loading.value = true
    try {
      await priceMatrixService.deletePriceTier(id)
      priceTiers.value = priceTiers.value.filter((t) => t.id !== id)
    } catch (error) {
      console.error('Error deleting price tier:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Create customer price
  const createCustomerPrice = async (data: Partial<CustomerPriceMatrix>) => {
    loading.value = true
    try {
      const result = await priceMatrixService.createCustomerPrice(data)
      customerPrices.value.unshift(result)
      return result
    } catch (error) {
      console.error('Error creating customer price:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Update customer price
  const updateCustomerPrice = async (id: string, data: Partial<CustomerPriceMatrix>) => {
    loading.value = true
    try {
      const result = await priceMatrixService.updateCustomerPrice(id, data)
      const index = customerPrices.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        customerPrices.value[index] = result
      }
      return result
    } catch (error) {
      console.error('Error updating customer price:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Delete customer price
  const deleteCustomerPrice = async (id: string) => {
    loading.value = true
    try {
      await priceMatrixService.deleteCustomerPrice(id)
      customerPrices.value = customerPrices.value.filter((p) => p.id !== id)
    } catch (error) {
      console.error('Error deleting customer price:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Get active tiers untuk produk
  const getActiveTiers = computed(() => {
    return priceTiers.value.filter((tier) => tier.is_active)
  })

  // Get active customer prices
  const getActiveCustomerPrices = computed(() => {
    return customerPrices.value.filter((price) => price.is_active)
  })

  return {
    loading,
    priceTiers,
    customerPrices,
    getActiveTiers,
    getActiveCustomerPrices,
    loadPriceTiers,
    loadCustomerPrices,
    getApplicablePrice,
    createPriceTier,
    updatePriceTier,
    deletePriceTier,
    createCustomerPrice,
    updateCustomerPrice,
    deleteCustomerPrice,
  }
}
