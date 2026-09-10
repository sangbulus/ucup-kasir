<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="isEdit ? 'Edit Grup' : 'Tambah Grup'" class="hidden md:block" />
    <MobilePageHeader :title="isEdit ? 'Edit Grup' : 'Tambah Grup'" :subtitle="isEdit ? 'Perbarui grup & anggotanya' : 'Buat grup lalu isi beberapa pelanggan'" @back="handleBack" />

    <div class="mx-auto max-w-3xl">
      <div v-if="loadingEdit" class="flex items-center justify-center py-16">
        <div class="text-center">
          <svg class="mx-auto h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <p class="mt-3 text-sm text-gray-500">Memuat data…</p>
        </div>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Identitas grup -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Grup</h3>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama grup <span class="text-error-500">*</span></label>
              <input v-model.trim="form.name" type="text" required maxlength="100" placeholder="mis. Reseller Bandung" class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
              <textarea v-model="form.notes" rows="2" placeholder="Keterangan grup…" class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"></textarea>
            </div>
          </div>
        </div>

        <!-- Anggota -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Anggota</h3>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{{ members.length }} pelanggan</span>
          </div>

          <p v-if="members.length===0" class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/50">Belum ada anggota. Satu grup bisa berisi beberapa pelanggan — mereka semua akan mendapat harga khusus grup.</p>

          <div class="space-y-2">
            <div v-for="(m, idx) in members" :key="m.customer_id" class="flex items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-800">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{{ (m.name||'?').charAt(0).toUpperCase() }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ m.name }}</p>
                <p v-if="m.store_name || m.kecamatan" class="truncate text-[11px] text-gray-500">{{ [m.store_name, m.kecamatan].filter(Boolean).join(' · ') }}</p>
              </div>
              <button type="button" class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10" :aria-label="`Keluarkan ${m.name}`" @click="members.splice(idx,1)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <button type="button" class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-300 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50/50 active:scale-[0.99] dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10" @click="showMemberPicker=true">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Tambah Pelanggan
          </button>
        </div>

        <div class="sticky bottom-4 z-10 flex gap-2 md:static md:justify-end">
          <button type="button" class="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.99] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 md:flex-none md:px-6" @click="handleBack">Batal</button>
          <button type="submit" :disabled="!canSubmit || saving" class="flex-1 rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 md:flex-none md:px-6">{{ saving ? 'Menyimpan…' : (isEdit ? 'Simpan Perubahan' : 'Simpan') }}</button>
        </div>
      </form>
    </div>

    <CustomerPickerModal
      v-if="showMemberPicker"
      v-model="showMemberPicker"
      :customers="allCustomers"
      multi
      :initial-selected-ids="members.map(m=>m.customer_id)"
      @add="onAddMembers"
    />

    <ConfirmDialog v-model="confirmLeaveOpen" title="Batalkan perubahan?" message="Perubahan yang belum disimpan akan hilang." confirm-text="Ya, Batalkan" cancel-text="Lanjut Edit" @confirm="doLeave" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import CustomerPickerModal from '@/components/common/CustomerPickerModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useToast } from '@/composables/useToast'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { priceMatrixServiceAdapter as priceMatrixService, customersServiceAdapter as customersService } from '@/services'
import { usePriceMatrixStore } from '@/stores/priceMatrix'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const priceMatrixStore = usePriceMatrixStore()
const isEdit = computed(()=> !!route.params.id)
const id = computed(()=> route.params.id as string | undefined)

const showMemberPicker = ref(false)
const loadingEdit = ref(false)
const saving = ref(false)
const allCustomers = ref<any[]>([])

const form = ref({ name: '', notes: '' })
type Member = { customer_id: string; name: string; store_name?: string; kecamatan?: string }
const members = ref<Member[]>([])

const canSubmit = computed(()=> !!form.value.name)

const onAddMembers = (picked:any[])=>{
  const existing = new Set(members.value.map(m=>m.customer_id))
  for(const c of picked){
    if(existing.has(c.id)) continue
    members.value.push({ customer_id: c.id, name: c.name, store_name: c.store_name, kecamatan: c.kecamatan })
  }
  showMemberPicker.value=false
}

const handleSubmit = async()=>{
  if(!canSubmit.value || saving.value) return
  saving.value=true
  try{
    const payload = { name: form.value.name, notes: form.value.notes || undefined }
    const memberIds = members.value.map(m=>m.customer_id)
    if(isEdit.value && id.value) await priceMatrixService.updateGroup(id.value, payload, memberIds)
    else await priceMatrixService.createGroup(payload, memberIds)
    priceMatrixStore.invalidate()
    toast.success('Berhasil', isEdit.value ? 'Grup diperbarui' : 'Grup ditambahkan')
    router.push('/price-matrix/groups')
  }catch(e:any){
    if(e?.code==='23505') toast.error('Gagal', 'Nama grup sudah dipakai')
    else toast.error('Gagal', e.message||'Gagal menyimpan')
  }
  finally{ saving.value=false }
}

const confirmLeaveOpen = ref(false)
useAutoNavigationStack(confirmLeaveOpen, 'customer-group-form-leave')
const handleBack=()=>{ if(form.value.name || members.value.length) confirmLeaveOpen.value=true; else doLeave() }
const doLeave=()=>{ confirmLeaveOpen.value=false; router.push('/price-matrix/groups') }

const loadEdit = async()=>{
  if(!id.value) return
  loadingEdit.value=true
  try{
    const d:any = await priceMatrixService.getGroup(id.value)
    form.value = { name: d.name || '', notes: d.notes || '' }
    members.value = (d.members || []).map((m:any)=>({
      customer_id: m.customer_id,
      name: m.customer?.name || allCustomers.value.find((c:any)=>c.id===m.customer_id)?.name || '-',
      store_name: allCustomers.value.find((c:any)=>c.id===m.customer_id)?.store_name,
      kecamatan: allCustomers.value.find((c:any)=>c.id===m.customer_id)?.kecamatan,
    }))
  }catch(e:any){ toast.error('Gagal', e.message||'Gagal memuat'); router.replace('/price-matrix/groups') }
  finally{ loadingEdit.value=false }
}

onMounted(async()=>{
  try{ allCustomers.value = await customersService.getAll() }catch{}
  if(isEdit.value) await loadEdit()
})
</script>
