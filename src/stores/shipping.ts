import { defineStore } from 'pinia'
import { ref } from 'vue'
import { shippingServiceAdapter, transactionsServiceAdapter } from '@/services'
import type {
  Vehicle,
  VehicleInsert,
  VehicleUpdate,
  DeliveryOrder,
  DeliveryOrderInsert,
  DeliveryOrderUpdate,
  DeliveryItemInsert,
  DeliveryTracking,
  DeliveryLoaderInput,
  DeliveryLoadItemInput,
} from '@/types/database'

// ============================================================
// Store: Shipping / Pengiriman — Surat Jalan
// - Master Kendaraan
// - Surat Jalan (Delivery Order) + items + tracking
// - Anak DO: transaksi, tim muat, barang dimuat (insentif bongkar muat)
// ============================================================

export const useShippingStore = defineStore('shipping', () => {
  // ============================================================
  // State
  // ============================================================
  const vehicles = ref<Vehicle[]>([])
  const deliveryOrders = ref<DeliveryOrder[]>([])
  const currentOrder = ref<DeliveryOrder | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ============================================================
  // VEHICLES
  // ============================================================

  async function fetchVehicles() {
    loading.value = true
    error.value = null
    try {
      vehicles.value = await shippingServiceAdapter.fetchVehicles()
      return vehicles.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createVehicle(input: VehicleInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await shippingServiceAdapter.createVehicle(input)
      vehicles.value.push(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateVehicle(id: string, updates: VehicleUpdate) {
    loading.value = true
    error.value = null
    const index = vehicles.value.findIndex((v) => v.id === id)
    const old = index !== -1 ? { ...vehicles.value[index] } : null
    try {
      const updated = await shippingServiceAdapter.updateVehicle(id, updates)
      if (index !== -1) vehicles.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) vehicles.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteVehicle(id: string) {
    loading.value = true
    error.value = null
    const index = vehicles.value.findIndex((v) => v.id === id)
    const old = index !== -1 ? { ...vehicles.value[index] } : null
    try {
      await shippingServiceAdapter.deleteVehicle(id)
      vehicles.value = vehicles.value.filter((v) => v.id !== id)
    } catch (e: any) {
      if (old && index !== -1) vehicles.value.splice(index, 0, old)
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // DELIVERY ORDERS
  // ============================================================

  async function fetchDeliveryOrders() {
    loading.value = true
    error.value = null
    try {
      deliveryOrders.value = await shippingServiceAdapter.fetchDeliveryOrders()
      return deliveryOrders.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getDeliveryOrder(id: string): Promise<DeliveryOrder | null> {
    loading.value = true
    error.value = null
    try {
      currentOrder.value = await shippingServiceAdapter.getDeliveryOrder(id)
      return currentOrder.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createDeliveryOrder(input: DeliveryOrderInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await shippingServiceAdapter.createDeliveryOrder(input)
      deliveryOrders.value.unshift(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateDeliveryOrder(id: string, updates: DeliveryOrderUpdate) {
    loading.value = true
    error.value = null
    const index = deliveryOrders.value.findIndex((d) => d.id === id)
    const old = index !== -1 ? { ...deliveryOrders.value[index] } : null
    try {
      const updated = await shippingServiceAdapter.updateDeliveryOrder(id, updates)
      if (index !== -1) deliveryOrders.value[index] = updated
      if (currentOrder.value?.id === id) currentOrder.value = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) deliveryOrders.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateDeliveryStatus(id: string, status: DeliveryOrder['status'], note?: string) {
    loading.value = true
    error.value = null
    const index = deliveryOrders.value.findIndex((d) => d.id === id)
    const old = index !== -1 ? { ...deliveryOrders.value[index] } : null
    try {
      const updated = await shippingServiceAdapter.updateDeliveryStatus(id, status, note)
      if (index !== -1) deliveryOrders.value[index] = updated
      if (currentOrder.value?.id === id) currentOrder.value = updated

      // Kirim selesai → status pengiriman transaksi dirujuk ikut "selesai" (terkunci)
      if (status === 'selesai') {
        let txIds = updated?.transaction_ids
        if (!txIds || txIds.length === 0) {
          const fresh = await shippingServiceAdapter.getDeliveryOrder(id)
          txIds = fresh?.transaction_ids || []
        }
        for (const txId of txIds) {
          try {
            await transactionsServiceAdapter.updateStatus(txId, 'selesai')
          } catch {
            /* satu gagal, lanjut transaksi lainnya */
          }
        }
      }
      return updated
    } catch (e: any) {
      if (old && index !== -1) deliveryOrders.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteDeliveryOrder(id: string) {
    loading.value = true
    error.value = null
    const index = deliveryOrders.value.findIndex((d) => d.id === id)
    const old = index !== -1 ? { ...deliveryOrders.value[index] } : null
    try {
      await shippingServiceAdapter.deleteDeliveryOrder(id)
      deliveryOrders.value = deliveryOrders.value.filter((d) => d.id !== id)
      if (currentOrder.value?.id === id) currentOrder.value = null
    } catch (e: any) {
      if (old && index !== -1) deliveryOrders.value.splice(index, 0, old)
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // DELIVERY ITEMS
  // ============================================================

  async function saveDeliveryItems(doId: string, items: DeliveryItemInsert[]) {
    loading.value = true
    error.value = null
    try {
      const saved = await shippingServiceAdapter.saveDeliveryItems(doId, items)
      if (currentOrder.value?.id === doId) {
        currentOrder.value = { ...currentOrder.value, items: saved }
      }
      return saved
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // TRACKING
  // ============================================================

  async function fetchDeliveryTracking(doId: string): Promise<DeliveryTracking[]> {
    loading.value = true
    error.value = null
    try {
      return await shippingServiceAdapter.fetchDeliveryTracking(doId)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // ANAK SURAT JALAN: transaksi, tim muat, barang dimuat
  // ============================================================

  async function saveDeliveryOrderTransactions(doId: string, transactionIds: string[]) {
    loading.value = true
    error.value = null
    try {
      await shippingServiceAdapter.saveDeliveryOrderTransactions(doId, transactionIds)
      if (currentOrder.value?.id === doId) {
        currentOrder.value = { ...currentOrder.value, transaction_ids: transactionIds }
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function saveDeliveryLoaders(doId: string, loaders: DeliveryLoaderInput[]) {
    loading.value = true
    error.value = null
    try {
      const saved = await shippingServiceAdapter.saveDeliveryLoaders(doId, loaders)
      if (currentOrder.value?.id === doId) {
        currentOrder.value = { ...currentOrder.value, loaders: saved }
      }
      return saved
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function saveDeliveryLoadItems(doId: string, items: DeliveryLoadItemInput[]) {
    loading.value = true
    error.value = null
    try {
      const saved = await shippingServiceAdapter.saveDeliveryLoadItems(doId, items)
      if (currentOrder.value?.id === doId) {
        currentOrder.value = { ...currentOrder.value, load_items: saved }
      }
      return saved
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    vehicles,
    deliveryOrders,
    currentOrder,
    loading,
    error,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    fetchDeliveryOrders,
    getDeliveryOrder,
    createDeliveryOrder,
    updateDeliveryOrder,
    updateDeliveryStatus,
    deleteDeliveryOrder,
    saveDeliveryItems,
    fetchDeliveryTracking,
    saveDeliveryOrderTransactions,
    saveDeliveryLoaders,
    saveDeliveryLoadItems,
  }
})
