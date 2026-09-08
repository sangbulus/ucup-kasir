<template>
  <div class="relative">
    <button
      type="button"
      @click="!disabled && (open = true)"
      :class="buttonClass"
      :disabled="disabled"
    >
      <span class="min-w-0 flex-1 truncate text-left" :class="{ 'text-gray-400 dark:text-gray-500': !hasValue }">
        {{ displayLabel }}
      </span>
      <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <SelectPickerModal
      v-model="open"
      :model-value2="modelValue"
      :title="title"
      :subtitle="subtitle"
      :options="options"
      :searchable="searchable"
      :search-placeholder="searchPlaceholder"
      @update:modelValue2="onSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SelectPickerModal, { type SelectOption } from './SelectPickerModal.vue'

interface Props {
  /** Nilai terpilih */
  modelValue?: string | number | boolean | null
  /** Daftar opsi */
  options: SelectOption[]
  /** Judul header modal, mis. "Pilih Status" */
  title?: string
  /** Subtitle opsional di header modal */
  subtitle?: string
  /** Teks saat belum ada pilihan */
  placeholder?: string
  /** Kelas tombol (padding/width sesuai konteks) */
  buttonClass?: string
  /** Tampilkan kolom pencarian di modal */
  searchable?: boolean
  searchPlaceholder?: string
  /** Nonaktifkan tombol */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  title: 'Pilih',
  subtitle: '',
  placeholder: '- Pilih -',
  buttonClass: '',
  searchable: false,
  searchPlaceholder: 'Cari...',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean | null]
  change: []
}>()

const open = ref(false)

const hasValue = computed(() => {
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ''
})

const displayLabel = computed(() => {
  if (!hasValue.value) return props.placeholder
  const found = props.options.find((o) => String(o.value) === String(props.modelValue))
  return found ? found.label : props.placeholder
})

const onSelect = (value: string | number | boolean | null) => {
  emit('update:modelValue', value)
  emit('change')
}
</script>
