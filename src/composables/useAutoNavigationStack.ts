import { watch, onUnmounted, type Ref } from 'vue'
import { useNavigationStack } from './useNavigationStack'

/**
 * Helper composable untuk auto-register modal/sheet/dialog ke navigation stack
 *
 * Secara otomatis mendeteksi jenis layer (modal/sheet/dialog) berdasarkan nama variable
 * dan register/unregister saat layer dibuka/ditutup.
 *
 * @example
 * const showFilterModal = ref(false)
 * useAutoNavigationStack(showFilterModal, 'filter-modal')
 *
 * @example Multiple layers
 * const showEditDialog = ref(false)
 * const showDeleteSheet = ref(false)
 * useAutoNavigationStack(showEditDialog, 'edit-dialog')
 * useAutoNavigationStack(showDeleteSheet, 'delete-sheet')
 */
export function useAutoNavigationStack(
  showRef: Ref<boolean>,
  id: string,
  options?: {
    type?: 'modal' | 'sheet' | 'dialog'
    onClose?: () => void | Promise<void>
  }
) {
  const { registerModal, unregisterModal, registerSheet, unregisterSheet, registerDialog, unregisterDialog } =
    useNavigationStack()

  // Auto-detect type dari id jika tidak diberikan
  const type = options?.type || detectType(id)

  // Default close handler
  const defaultCloseHandler = () => {
    showRef.value = false
    options?.onClose?.()
  }

  // Watch dan auto register/unregister
  watch(
    showRef,
    (isOpen) => {
      if (isOpen) {
        switch (type) {
          case 'sheet':
            registerSheet(id, defaultCloseHandler)
            break
          case 'dialog':
            registerDialog(id, defaultCloseHandler)
            break
          default:
            registerModal(id, defaultCloseHandler)
        }
      } else {
        switch (type) {
          case 'sheet':
            unregisterSheet(id)
            break
          case 'dialog':
            unregisterDialog(id)
            break
          default:
            unregisterModal(id)
        }
      }
    },
    { immediate: false }
  )

  // Kalau komponen dimount saat layer masih terbuka (mis. navigasi pindah
  // halaman), bersihkan stack supaya tidak ada handler menggantung.
  onUnmounted(() => {
    switch (type) {
      case 'sheet':
        unregisterSheet(id)
        break
      case 'dialog':
        unregisterDialog(id)
        break
      default:
        unregisterModal(id)
    }
  })
}

/**
 * Helper untuk multiple layers sekaligus
 *
 * @example
 * const layers = {
 *   showFilterModal: ref(false),
 *   showDeleteDialog: ref(false),
 *   showOptionsSheet: ref(false),
 * }
 *
 * useAutoNavigationStackMultiple({
 *   'filter-modal': layers.showFilterModal,
 *   'delete-dialog': layers.showDeleteDialog,
 *   'options-sheet': layers.showOptionsSheet,
 * })
 */
export function useAutoNavigationStackMultiple(layers: Record<string, Ref<boolean>>) {
  Object.entries(layers).forEach(([id, ref]) => {
    useAutoNavigationStack(ref, id)
  })
}

// Helper: deteksi type dari id
function detectType(id: string): 'modal' | 'sheet' | 'dialog' {
  const lowerCaseId = id.toLowerCase()

  if (lowerCaseId.includes('sheet') || lowerCaseId.includes('bottom')) {
    return 'sheet'
  }

  if (lowerCaseId.includes('dialog') || lowerCaseId.includes('confirm') || lowerCaseId.includes('alert')) {
    return 'dialog'
  }

  return 'modal'
}
