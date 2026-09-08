import { ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import router from '@/router'

/**
 * Navigation Stack Manager untuk Android back button.
 *
 * Mengelola stack navigasi berdasarkan layer (modal, sheet, dialog, page)
 * sehingga tombol back Android mengikuti urutan layer, bukan riwayat route.
 *
 * Urutan prioritas back:
 * 1. Modal yang terbuka
 * 2. Bottom sheet yang terbuka
 * 3. Dialog yang terbuka
 * 4. Page route (router.back())
 */

export type StackLayer = {
  id: string
  type: 'modal' | 'sheet' | 'dialog' | 'page'
  closeHandler?: () => void | Promise<void>
  meta?: Record<string, unknown>
}

class NavigationStackManager {
  private stack = ref<StackLayer[]>([])

  /**
   * Push layer ke stack
   */
  push(layer: StackLayer) {
    // Cek duplikat berdasarkan id
    const exists = this.stack.value.find(l => l.id === layer.id)
    if (exists) {
      console.warn(`Layer ${layer.id} sudah ada di stack`)
      return
    }

    this.stack.value.push(layer)
  }

  /**
   * Remove layer dari stack berdasarkan id
   */
  remove(id: string) {
    const index = this.stack.value.findIndex(l => l.id === id)
    if (index !== -1) {
      this.stack.value.splice(index, 1)
    }
  }

  /**
   * Pop layer terakhir dari stack
   */
  async pop(): Promise<boolean> {
    if (this.stack.value.length === 0) {
      return false
    }

    const layer = this.stack.value.pop()
    if (layer?.closeHandler) {
      await layer.closeHandler()
      return true
    }

    return false
  }

  /**
   * Clear semua layer
   */
  clear() {
    this.stack.value = []
  }

  /**
   * Get layer terakhir
   */
  peek(): StackLayer | undefined {
    return this.stack.value[this.stack.value.length - 1]
  }

  /**
   * Check apakah ada layer di stack
   */
  hasLayers(): boolean {
    return this.stack.value.length > 0
  }

  /**
   * Get semua layer
   */
  getLayers(): StackLayer[] {
    return [...this.stack.value]
  }

  /**
   * Handle Android back button
   * Return true jika back handled, false jika perlu fallback ke router
   */
  async handleBack(): Promise<boolean> {
    if (this.stack.value.length > 0) {
      await this.pop()
      return true
    }
    return false
  }
}

// Singleton instance
const navigationStack = new NavigationStackManager()

/**
 * Composable untuk mengelola navigation stack
 */
export function useNavigationStack() {
  /**
   * Register modal ke stack
   *
   * @example
   * const { registerModal, unregisterModal } = useNavigationStack()
   *
   * const showModal = ref(false)
   *
   * watch(showModal, (isOpen) => {
   *   if (isOpen) {
   *     registerModal('filter-modal', () => { showModal.value = false })
   *   } else {
   *     unregisterModal('filter-modal')
   *   }
   * })
   */
  const registerModal = (id: string, closeHandler: () => void | Promise<void>, meta?: Record<string, unknown>) => {
    navigationStack.push({
      id,
      type: 'modal',
      closeHandler,
      meta,
    })
  }

  /**
   * Unregister modal dari stack
   */
  const unregisterModal = (id: string) => {
    navigationStack.remove(id)
  }

  /**
   * Register bottom sheet ke stack
   */
  const registerSheet = (id: string, closeHandler: () => void | Promise<void>, meta?: Record<string, unknown>) => {
    navigationStack.push({
      id,
      type: 'sheet',
      closeHandler,
      meta,
    })
  }

  /**
   * Unregister bottom sheet dari stack
   */
  const unregisterSheet = (id: string) => {
    navigationStack.remove(id)
  }

  /**
   * Register dialog ke stack
   */
  const registerDialog = (id: string, closeHandler: () => void | Promise<void>, meta?: Record<string, unknown>) => {
    navigationStack.push({
      id,
      type: 'dialog',
      closeHandler,
      meta,
    })
  }

  /**
   * Unregister dialog dari stack
   */
  const unregisterDialog = (id: string) => {
    navigationStack.remove(id)
  }

  /**
   * Register page route ke stack (otomatis saat route change)
   */
  const registerPage = (route: RouteLocationNormalizedLoaded) => {
    // Page route tidak butuh close handler karena akan pakai router.back()
    navigationStack.push({
      id: `page-${route.path}`,
      type: 'page',
      meta: { path: route.path, name: route.name },
    })
  }

  /**
   * Unregister page route dari stack
   */
  const unregisterPage = (path: string) => {
    navigationStack.remove(`page-${path}`)
  }

  /**
   * Clear semua layer
   */
  const clearStack = () => {
    navigationStack.clear()
  }

  /**
   * Handle Android back button
   * Dipanggil dari main.ts saat Android back button ditekan
   */
  const handleBackButton = async (): Promise<boolean> => {
    const handled = await navigationStack.handleBack()

    // Jika tidak ada layer di stack, fallback ke router.back()
    if (!handled) {
      // state.back terisi oleh vue-router jika ada riwayat untuk dituju
      if (router.options.history.state.back) {
        router.back()
        return true
      }
      return false // Tidak bisa back lagi, keluar dari app
    }

    return true
  }

  return {
    registerModal,
    unregisterModal,
    registerSheet,
    unregisterSheet,
    registerDialog,
    unregisterDialog,
    registerPage,
    unregisterPage,
    clearStack,
    handleBackButton,
    hasLayers: () => navigationStack.hasLayers(),
    peek: () => navigationStack.peek(),
    getLayers: () => navigationStack.getLayers(),
  }
}
