<template>
  <div class="sync-debugger">
    <div class="page-header">
      <button @click="$router.back()" class="btn-back">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div>
        <h1 class="page-title">Sync Debugger</h1>
        <p class="page-subtitle">Testing & monitoring sistem sinkronisasi</p>
      </div>
    </div>

    <!-- Health Check Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Health Check</h2>
        <button @click="runHealthCheck" :disabled="loading" class="btn-primary-small">
          {{ loading && activeTest === 'health' ? 'Checking...' : 'Run Check' }}
        </button>
      </div>

      <div v-if="healthResult" class="health-result">
        <div class="health-summary">
          <div class="health-item">
            <span class="label">Queue Size:</span>
            <span class="value" :class="{ warning: healthResult.queueSize > 50 }">
              {{ healthResult.queueSize }}
            </span>
          </div>
          <div class="health-item">
            <span class="label">Last Sync:</span>
            <span class="value">{{ formatDate(healthResult.lastSyncAt) }}</span>
          </div>
          <div class="health-item">
            <span class="label">Last Download:</span>
            <span class="value">{{ formatDate(healthResult.lastDownloadAt) }}</span>
          </div>
        </div>

        <div v-if="healthResult.issues.length > 0" class="issues-list">
          <h3 class="section-label">Issues:</h3>
          <div v-for="(issue, idx) in healthResult.issues" :key="idx" class="issue-item">
            ⚠️ {{ issue }}
          </div>
        </div>
        <div v-else class="no-issues">
          ✅ Tidak ada masalah terdeteksi
        </div>

        <div class="table-counts">
          <h3 class="section-label">Jumlah Data per Tabel:</h3>
          <div class="counts-grid">
            <div v-for="(count, table) in healthResult.tableCounts" :key="table" class="count-item">
              <span class="table-name">{{ table }}:</span>
              <span class="count-value" :class="getCountClass(count)">
                {{ count === -1 ? 'ERROR' : count }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Download Test Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Test Download</h2>
        <button @click="runDownloadTest" :disabled="loading" class="btn-primary-small">
          {{ loading && activeTest === 'download' ? 'Testing...' : 'Run Test' }}
        </button>
      </div>

      <div v-if="downloadResult" class="test-result">
        <div class="result-header" :class="{ success: downloadResult.success, error: !downloadResult.success }">
          {{ downloadResult.success ? '✅ PASS' : '❌ FAIL' }} - {{ downloadResult.duration }}ms
        </div>

        <div v-if="downloadResult.errors && downloadResult.errors.length > 0" class="errors-list">
          <h3 class="section-label">Errors:</h3>
          <div v-for="(error, idx) in downloadResult.errors" :key="idx" class="error-item">
            • {{ error }}
          </div>
        </div>

        <div class="details">
          <h3 class="section-label">Details:</h3>
          <pre class="json-output">{{ JSON.stringify(downloadResult.details, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Upload Test Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Test Upload</h2>
        <button @click="runUploadTest" :disabled="loading" class="btn-primary-small">
          {{ loading && activeTest === 'upload' ? 'Testing...' : 'Run Test' }}
        </button>
      </div>

      <div v-if="uploadResult" class="test-result">
        <div class="result-header" :class="{ success: uploadResult.success, error: !uploadResult.success }">
          {{ uploadResult.success ? '✅ PASS' : '❌ FAIL' }} - {{ uploadResult.duration }}ms
        </div>

        <div v-if="uploadResult.errors && uploadResult.errors.length > 0" class="errors-list">
          <h3 class="section-label">Errors:</h3>
          <div v-for="(error, idx) in uploadResult.errors" :key="idx" class="error-item">
            • {{ error }}
          </div>
        </div>

        <div class="details">
          <h3 class="section-label">Details:</h3>
          <pre class="json-output">{{ JSON.stringify(uploadResult.details, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Run All Tests -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Run All Tests</h2>
        <button @click="runAllTests" :disabled="loading" class="btn-primary-large">
          {{ loading && activeTest === 'all' ? 'Running All Tests...' : 'Run All Tests' }}
        </button>
      </div>
      <p class="card-note">
        Akan menjalankan health check, download test, dan upload test secara berurutan
      </p>
    </div>

    <!-- Queue Inspector -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Sync Queue</h2>
        <button @click="loadQueue" :disabled="loading" class="btn-primary-small">
          {{ loading && activeTest === 'queue' ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="queueItems.length > 0" class="queue-list">
        <div v-for="item in queueItems" :key="item.id" class="queue-item">
          <div class="queue-header">
            <span class="operation-badge" :class="item.operation.toLowerCase()">
              {{ item.operation }}
            </span>
            <span class="table-badge">{{ item.table_name }}</span>
            <span class="retry-badge" :class="{ warning: item.retry_count > 0 }">
              Retry: {{ item.retry_count }}
            </span>
          </div>
          <div class="queue-details">
            <div><strong>Record ID:</strong> {{ item.record_id }}</div>
            <div><strong>Created:</strong> {{ formatDate(item.created_at) }}</div>
            <div v-if="item.last_error" class="error-text">
              <strong>Last Error:</strong> {{ item.last_error }}
            </div>
          </div>
          <details class="queue-payload">
            <summary>Payload</summary>
            <pre>{{ JSON.stringify(JSON.parse(item.payload), null, 2) }}</pre>
          </details>
        </div>
      </div>
      <div v-else-if="queueItems.length === 0 && !loading" class="empty-state">
        Queue kosong - tidak ada perubahan yang perlu diupload
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import {
  testDownloadFlow,
  testUploadFlow,
  syncHealthCheck,
  runAllSyncTests,
  type SyncTestResult,
  type SyncHealthCheck
} from '@/utils/syncTester'
import { getSyncQueue, type SyncQueueItem } from '@/lib/sqlite'

const toast = useToast()

const loading = ref(false)
const activeTest = ref<'health' | 'download' | 'upload' | 'all' | 'queue' | null>(null)

const healthResult = ref<SyncHealthCheck | null>(null)
const downloadResult = ref<SyncTestResult | null>(null)
const uploadResult = ref<SyncTestResult | null>(null)
const queueItems = ref<SyncQueueItem[]>([])

const runHealthCheck = async () => {
  loading.value = true
  activeTest.value = 'health'
  try {
    healthResult.value = await syncHealthCheck()
    toast.success('Health check selesai', 'Semua pemeriksaan kesehatan sinkronisasi telah dijalankan')
  } catch (e: any) {
    toast.error('Gagal health check', e.message || 'Terjadi kesalahan saat health check')
  } finally {
    loading.value = false
    activeTest.value = null
  }
}

const runDownloadTest = async () => {
  loading.value = true
  activeTest.value = 'download'
  try {
    downloadResult.value = await testDownloadFlow()
    if (downloadResult.value.success) {
      toast.success('Download test berhasil', 'Alur download data berjalan sesuai harapan')
    } else {
      toast.error('Download test gagal', downloadResult.value.errors?.[0] || 'Alur download data gagal')
    }
  } catch (e: any) {
    toast.error('Gagal download test', e.message || 'Terjadi kesalahan saat download test')
  } finally {
    loading.value = false
    activeTest.value = null
  }
}

const runUploadTest = async () => {
  loading.value = true
  activeTest.value = 'upload'
  try {
    uploadResult.value = await testUploadFlow()
    if (uploadResult.value.success) {
      toast.success('Upload test berhasil', 'Alur upload data berjalan sesuai harapan')
    } else {
      toast.error('Upload test gagal', uploadResult.value.errors?.[0] || 'Alur upload data gagal')
    }
  } catch (e: any) {
    toast.error('Gagal upload test', e.message || 'Terjadi kesalahan saat upload test')
  } finally {
    loading.value = false
    activeTest.value = null
  }
}

const runAllTests = async () => {
  loading.value = true
  activeTest.value = 'all'
  try {
    const results = await runAllSyncTests()
    healthResult.value = results.health
    downloadResult.value = results.download
    uploadResult.value = results.upload
    toast.success('Semua test selesai', 'Seluruh test sinkronisasi telah dijalankan')
  } catch (e: any) {
    toast.error('Gagal menjalankan test', e.message || 'Terjadi kesalahan saat menjalankan test')
  } finally {
    loading.value = false
    activeTest.value = null
  }
}

const loadQueue = async () => {
  loading.value = true
  activeTest.value = 'queue'
  try {
    queueItems.value = await getSyncQueue()
    toast.success('Queue dimuat', `${queueItems.value.length} items dalam sync queue`)
  } catch (e: any) {
    toast.error('Gagal memuat queue', e.message || 'Terjadi kesalahan saat memuat queue')
  } finally {
    loading.value = false
    activeTest.value = null
  }
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID')
}

const getCountClass = (count: number): string => {
  if (count === -1) return 'error'
  if (count === 0) return 'empty'
  return 'ok'
}

onMounted(() => {
  runHealthCheck()
  loadQueue()
})

</script>

<style scoped>
.sync-debugger {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-back {
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-back:hover {
  background: var(--color-bg-secondary);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.page-subtitle {
  color: var(--color-text-secondary);
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.card-note {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
}

.btn-primary-small,
.btn-primary-large {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}

.btn-primary-large {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}

.btn-primary-small:hover:not(:disabled),
.btn-primary-large:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary-small:disabled,
.btn-primary-large:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.health-result,
.test-result {
  margin-top: 1rem;
}

.health-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.health-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.health-item .label {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.health-item .value {
  font-weight: 600;
  font-size: 1.125rem;
}

.health-item .value.warning {
  color: var(--color-warning);
}

.section-label {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: var(--color-text-secondary);
}

.issues-list {
  margin-top: 1rem;
}

.issue-item {
  padding: 0.75rem;
  background: var(--color-warning-bg, #fff3cd);
  border-left: 3px solid var(--color-warning, #ffc107);
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.no-issues {
  padding: 0.75rem;
  background: var(--color-success-bg, #d4edda);
  border-left: 3px solid var(--color-success, #28a745);
  border-radius: 4px;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.table-counts {
  margin-top: 1rem;
}

.counts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.count-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  font-size: 0.875rem;
}

.table-name {
  color: var(--color-text-secondary);
}

.count-value {
  font-weight: 600;
}

.count-value.ok {
  color: var(--color-success, #28a745);
}

.count-value.empty {
  color: var(--color-text-secondary);
}

.count-value.error {
  color: var(--color-danger, #dc3545);
}

.result-header {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  margin-bottom: 1rem;
}

.result-header.success {
  background: var(--color-success-bg, #d4edda);
  color: var(--color-success, #28a745);
  border: 1px solid var(--color-success, #28a745);
}

.result-header.error {
  background: var(--color-danger-bg, #f8d7da);
  color: var(--color-danger, #dc3545);
  border: 1px solid var(--color-danger, #dc3545);
}

.errors-list {
  margin-bottom: 1rem;
}

.error-item {
  padding: 0.5rem;
  background: var(--color-danger-bg, #f8d7da);
  border-left: 3px solid var(--color-danger, #dc3545);
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.details {
  margin-top: 1rem;
}

.json-output {
  background: var(--color-bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.75rem;
  line-height: 1.4;
  max-height: 400px;
  overflow-y: auto;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.queue-item {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.queue-header {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.operation-badge,
.table-badge,
.retry-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.operation-badge.insert {
  background: var(--color-success-bg, #d4edda);
  color: var(--color-success, #28a745);
}

.operation-badge.update {
  background: var(--color-info-bg, #d1ecf1);
  color: var(--color-info, #0dcaf0);
}

.operation-badge.delete {
  background: var(--color-danger-bg, #f8d7da);
  color: var(--color-danger, #dc3545);
}

.table-badge {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.retry-badge {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.retry-badge.warning {
  background: var(--color-warning-bg, #fff3cd);
  color: var(--color-warning, #ffc107);
}

.queue-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.error-text {
  color: var(--color-danger, #dc3545);
  font-weight: 500;
}

.queue-payload {
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

.queue-payload summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--color-primary);
  user-select: none;
}

.queue-payload pre {
  background: var(--color-bg-secondary);
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  line-height: 1.4;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .sync-debugger {
    padding: 0.75rem;
  }

  .card {
    padding: 1rem;
  }

  .health-summary {
    grid-template-columns: 1fr;
  }

  .counts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
