<template>
  <ConfirmDialog
    v-model="confirmState.isOpen"
    :title="confirmState.title"
    :message="confirmState.message"
    :confirm-text="confirmState.confirmText"
    :cancel-text="confirmState.cancelText"
    :variant="confirmState.variant"
    @confirm="resolveConfirm(true)"
    @cancel="resolveConfirm(false)"
  />
</template>

<script setup lang="ts">
import { watch } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { confirmState, resolveConfirm } from '@/composables/useConfirm'
import { useNavigationStack } from '@/composables/useNavigationStack'

const { registerDialog, unregisterDialog } = useNavigationStack()

// Daftarkan dialog konfirmasi global ke navigation stack supaya
// tombol back Android menutup dialog (batal) alih-alih pindah halaman.
watch(
  () => confirmState.isOpen,
  (isOpen) => {
    if (isOpen) {
      registerDialog('global-confirm-dialog', () => resolveConfirm(false))
    } else {
      unregisterDialog('global-confirm-dialog')
    }
  }
)
</script>
