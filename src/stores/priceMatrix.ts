import { defineStore } from 'pinia'
import { ref } from 'vue'
import { priceMatrixServiceAdapter } from '@/services'
import type { PriceTier, CustomerPriceMatrix } from '@/types/priceMatrix'

// ============================================================
// Store Matriks Harga — cache data harga khusus + resolusi lokal.
//
// Data dimuat sekali per sesi (tier, harga customer/grup, keanggotaan
// grup), lalu resolvePrice() bekerja SINKRON di klien — tanpa network
// call per item. Konsisten untuk mode web (Supabase) maupun native
// (SQLite), karena dua-duanya lewat priceMatrixServiceAdapter.
//
// Prioritas (sama dengan RPC get_applicable_price di Supabase):
//   1. harga khusus per pelanggan
//   2. harga khusus per grup (termurah bila beberapa grup cocok)
//   3. tier harga berdasarkan kuantitas (min_quantity tertinggi yang cocok)
//   4. harga default produk (price_sell)
// ============================================================

export type PriceSource = 'custom' | 'group' | 'tier' | 'default'

export interface ResolvedPrice {
  price: number
  source: PriceSource
  tier_name?: string
}

interface CachedCustomerPrice {
  customer_id: string | null
  group_id: string | null
  product_id: string
  custom_price: number
  min_quantity: number
  start_date?: string | null
  end_date?: string | null
}

const todayStr = () => new Date().toISOString().split('T')[0]

/** Dalam rentang tanggal? (bandingkan string YYYY-MM-DD, aman secara leksikografis) */
function inDateRange(start: string | null | undefined, end: string | null | undefined, date: string): boolean {
  if (start && date < start.slice(0, 10)) return false
  if (end && date > end.slice(0, 10)) return false
  return true
}

export const usePriceMatrixStore = defineStore('priceMatrix', () => {
  const tiers = ref<PriceTier[]>([])
  const customerPrices = ref<CachedCustomerPrice[]>([])
  /** customer_id → daftar group_id yang diikutinya */
  const customerGroupIds = ref<Map<string, string[]>>(new Map())
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let loadPromise: Promise<void> | null = null

  async function load(force = false): Promise<void> {
    if (loaded.value && !force) return
    if (loadPromise && !force) return loadPromise
    loading.value = true
    error.value = null
    loadPromise = (async () => {
      try {
        const [tierRows, priceRows, groups] = await Promise.all([
          priceMatrixServiceAdapter.getPriceTiers(),
          priceMatrixServiceAdapter.getCustomerPrices(),
          priceMatrixServiceAdapter.getGroups(),
        ])
        tiers.value = (tierRows as PriceTier[]).filter((t) => t.is_active)
        customerPrices.value = (priceRows as CustomerPriceMatrix[])
          .filter((p) => p.is_active)
          .map((p) => ({
            customer_id: p.customer_id ?? null,
            group_id: (p as any).group_id ?? null,
            product_id: p.product_id,
            custom_price: p.custom_price,
            min_quantity: p.min_quantity ?? 1,
            start_date: p.start_date ?? null,
            end_date: p.end_date ?? null,
          }))
        const map = new Map<string, string[]>()
        for (const g of groups as any[]) {
          if (!g.is_active) continue
          for (const m of g.members || []) {
            if (!map.has(m.customer_id)) map.set(m.customer_id, [])
            map.get(m.customer_id)!.push(g.id)
          }
        }
        customerGroupIds.value = map
        loaded.value = true
      } catch (e: any) {
        error.value = e.message || 'Gagal memuat matriks harga'
        console.error('priceMatrix store load:', e)
        // Jangan blok alur transaksi — fallback ke harga default terjadi sendiri.
      } finally {
        loading.value = false
        loadPromise = null
      }
    })()
    return loadPromise
  }

  function invalidate(): void {
    loaded.value = false
    loadPromise = null
  }

  /**
   * Resolve harga untuk satu baris keranjang. SINKRON — pakai cache.
   * @param defaultPrice harga normal produk (price_sell), dipakai bila tak ada aturan cocok.
   */
  function resolvePrice(
    productId: string,
    quantity: number,
    customerId?: string | null,
    defaultPrice = 0,
    date: string = todayStr()
  ): ResolvedPrice {
    const qty = Math.max(1, Math.floor(quantity || 1))

    if (customerId && loaded.value) {
      // 1. harga khusus per pelanggan — min_quantity tertinggi yang lolos
      const individual = pickBestPrice(
        customerPrices.value.filter((p) => p.customer_id === customerId),
        productId,
        qty,
        date
      )
      if (individual) return { price: individual.custom_price, source: 'custom' }

      // 2. harga khusus per grup — termurah di antara semua grup yang cocok
      const groupIds = new Set(customerGroupIds.value.get(customerId) || [])
      if (groupIds.size) {
        const candidates = customerPrices.value.filter(
          (p) => p.group_id && groupIds.has(p.group_id)
        )
        const matches = candidates.filter(
          (p) =>
            p.product_id === productId &&
            qty >= p.min_quantity &&
            inDateRange(p.start_date, p.end_date, date)
        )
        if (matches.length) {
          const best = matches.reduce((a, b) => (b.custom_price < a.custom_price ? b : a))
          return { price: best.custom_price, source: 'group' }
        }
      }
    }

    // 3. tier kuantitas — min_quantity tertinggi yang cocok
    if (loaded.value) {
      const tierMatches = tiers.value
        .filter(
          (t) =>
            t.product_id === productId &&
            qty >= t.min_quantity &&
            (t.max_quantity == null || qty <= t.max_quantity) &&
            inDateRange(t.start_date, t.end_date, date)
        )
        .sort((a, b) => b.min_quantity - a.min_quantity)
      if (tierMatches.length) {
        return { price: tierMatches[0].tier_price, source: 'tier', tier_name: tierMatches[0].tier_name }
      }
    }

    // 4. default
    return { price: defaultPrice, source: 'default' }
  }

  function pickBestPrice(
    rows: CachedCustomerPrice[],
    productId: string,
    qty: number,
    date: string
  ): CachedCustomerPrice | null {
    const matches = rows.filter(
      (p) =>
        p.product_id === productId &&
        qty >= p.min_quantity &&
        inDateRange(p.start_date, p.end_date, date)
    )
    if (!matches.length) return null
    return matches.reduce((a, b) => (b.min_quantity > a.min_quantity ? b : a))
  }

  return {
    tiers,
    customerPrices,
    customerGroupIds,
    loaded,
    loading,
    error,
    load,
    invalidate,
    resolvePrice,
  }
})
