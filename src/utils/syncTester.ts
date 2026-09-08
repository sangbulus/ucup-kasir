import { downloadAllFromSupabase, uploadChangesToSupabase, getLastSyncInfo } from '@/services/sync/syncEngine'
import { query, getSyncQueue } from '@/lib/sqlite'
import type { SyncResult } from '@/services/sync/syncEngine'

// ============================================================
// Sync Tester Utility
// Tool untuk testing dan debugging sistem sinkronisasi
// ============================================================

export interface SyncTestResult {
  testName: string
  success: boolean
  duration: number
  details: any
  errors?: string[]
}

export interface SyncHealthCheck {
  timestamp: string
  queueSize: number
  lastSyncAt: string | null
  lastDownloadAt: string | null
  tableCounts: Record<string, number>
  issues: string[]
}

/**
 * Test download semua data dari Supabase ke SQLite
 */
export async function testDownloadFlow(): Promise<SyncTestResult> {
  const startTime = Date.now()
  const errors: string[] = []

  try {
    console.log('[TEST] Memulai download dari Supabase...')

    // 1. Ambil snapshot queue sebelum download
    const queueBefore = await getSyncQueue()
    console.log(`[TEST] Queue sebelum download: ${queueBefore.length} items`)

    // 2. Jalankan download
    const result: SyncResult = await downloadAllFromSupabase()

    if (!result.success) {
      errors.push(`Download gagal: ${result.message}`)
    }

    // 3. Verifikasi queue sudah dibersihkan
    const queueAfter = await getSyncQueue()
    if (queueAfter.length > 0) {
      errors.push(`Queue tidak dibersihkan: masih ada ${queueAfter.length} items`)
    }

    // 4. Verifikasi metadata
    const syncInfo = await getLastSyncInfo()
    if (!syncInfo.lastDownloadAt) {
      errors.push('Metadata last_download_at tidak terupdate')
    }

    // 5. Cek jumlah data per tabel
    const tableCounts = await getTableCounts()
    console.log('[TEST] Jumlah data per tabel:', tableCounts)

    const duration = Date.now() - startTime

    return {
      testName: 'Download Flow Test',
      success: errors.length === 0 && result.success,
      duration,
      details: {
        downloadResult: result,
        queueBefore: queueBefore.length,
        queueAfter: queueAfter.length,
        tableCounts,
        syncInfo,
      },
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (e: any) {
    return {
      testName: 'Download Flow Test',
      success: false,
      duration: Date.now() - startTime,
      details: {},
      errors: [e.message || 'Unknown error'],
    }
  }
}

/**
 * Test upload perubahan dari SQLite ke Supabase
 */
export async function testUploadFlow(): Promise<SyncTestResult> {
  const startTime = Date.now()
  const errors: string[] = []

  try {
    console.log('[TEST] Memulai upload ke Supabase...')

    // 1. Ambil snapshot queue sebelum upload
    const queueBefore = await getSyncQueue()
    console.log(`[TEST] Queue sebelum upload: ${queueBefore.length} items`)

    if (queueBefore.length === 0) {
      console.log('[TEST] Queue kosong, tidak ada yang perlu diupload')
    }

    // 2. Jalankan upload
    const result: SyncResult = await uploadChangesToSupabase()

    if (!result.success && result.message) {
      errors.push(`Upload gagal: ${result.message}`)
    }

    // 3. Verifikasi queue
    const queueAfter = await getSyncQueue()
    console.log(`[TEST] Queue setelah upload: ${queueAfter.length} items`)

    // 4. Cek item yang gagal (retry_count > 0)
    const failedItems = queueAfter.filter(item => item.retry_count > 0)
    if (failedItems.length > 0) {
      errors.push(`Ada ${failedItems.length} items gagal upload`)
      console.log('[TEST] Failed items:', failedItems)
    }

    // 5. Verifikasi metadata
    const syncInfo = await getLastSyncInfo()
    if (result.uploaded && result.uploaded > 0 && !syncInfo.lastSyncAt) {
      errors.push('Metadata last_sync_at tidak terupdate')
    }

    const duration = Date.now() - startTime

    return {
      testName: 'Upload Flow Test',
      success: errors.length === 0 && result.success,
      duration,
      details: {
        uploadResult: result,
        queueBefore: queueBefore.length,
        queueAfter: queueAfter.length,
        failedItems: failedItems.length,
        syncInfo,
      },
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (e: any) {
    return {
      testName: 'Upload Flow Test',
      success: false,
      duration: Date.now() - startTime,
      details: {},
      errors: [e.message || 'Unknown error'],
    }
  }
}

/**
 * Health check sistem sinkronisasi
 */
export async function syncHealthCheck(): Promise<SyncHealthCheck> {
  const issues: string[] = []

  try {
    // 1. Cek queue size
    const queue = await getSyncQueue()
    const queueSize = queue.length

    // 2. Cek last sync info
    const syncInfo = await getLastSyncInfo()

    // 3. Cek jumlah data per tabel
    const tableCounts = await getTableCounts()

    // 4. Deteksi masalah

    // Queue terlalu besar
    if (queueSize > 100) {
      issues.push(`Queue terlalu besar: ${queueSize} items (mungkin gagal upload berulang)`)
    }

    // Ada item dengan retry count tinggi
    const highRetryItems = queue.filter(item => item.retry_count > 3)
    if (highRetryItems.length > 0) {
      issues.push(`Ada ${highRetryItems.length} items dengan retry > 3 (perlu investigasi)`)
    }

    // Tidak pernah sync
    if (!syncInfo.lastSyncAt && !syncInfo.lastDownloadAt) {
      issues.push('Belum pernah melakukan sinkronisasi')
    }

    // Data kosong di tabel penting
    const criticalTables = ['products', 'customers', 'transactions']
    for (const table of criticalTables) {
      if (tableCounts[table] === 0) {
        issues.push(`Tabel ${table} kosong (normal untuk database baru)`)
      }
    }

    return {
      timestamp: new Date().toISOString(),
      queueSize,
      lastSyncAt: syncInfo.lastSyncAt,
      lastDownloadAt: syncInfo.lastDownloadAt,
      tableCounts,
      issues,
    }
  } catch (e: any) {
    return {
      timestamp: new Date().toISOString(),
      queueSize: 0,
      lastSyncAt: null,
      lastDownloadAt: null,
      tableCounts: {},
      issues: [`Error saat health check: ${e.message}`],
    }
  }
}

/**
 * Hitung jumlah record per tabel
 */
async function getTableCounts(): Promise<Record<string, number>> {
  const tables = [
    'categories', 'products', 'customers', 'transactions', 'transaction_items',
    'returns', 'stock_movements', 'notifications', 'suppliers', 'purchase_orders',
    'employees', 'payrolls', 'vehicles', 'delivery_orders',
  ]

  const counts: Record<string, number> = {}

  for (const table of tables) {
    try {
      const result = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table}`
      )
      counts[table] = result[0]?.count || 0
    } catch (e) {
      counts[table] = -1 // Error
    }
  }

  return counts
}

/**
 * Format hasil test untuk display
 */
export function formatTestResult(result: SyncTestResult): string {
  const status = result.success ? '✅ PASS' : '❌ FAIL'
  const duration = `${result.duration}ms`

  let output = `\n${status} ${result.testName} (${duration})\n`
  output += `─────────────────────────────────────────\n`

  if (result.errors && result.errors.length > 0) {
    output += `\nErrors:\n`
    result.errors.forEach(err => {
      output += `  • ${err}\n`
    })
  }

  output += `\nDetails:\n`
  output += JSON.stringify(result.details, null, 2)

  return output
}

/**
 * Format health check untuk display
 */
export function formatHealthCheck(health: SyncHealthCheck): string {
  let output = `\n📊 SYNC HEALTH CHECK\n`
  output += `─────────────────────────────────────────\n`
  output += `Timestamp: ${health.timestamp}\n`
  output += `Queue Size: ${health.queueSize}\n`
  output += `Last Sync: ${health.lastSyncAt || 'Never'}\n`
  output += `Last Download: ${health.lastDownloadAt || 'Never'}\n\n`

  output += `Table Counts:\n`
  Object.entries(health.tableCounts).forEach(([table, count]) => {
    const status = count === -1 ? '❌' : count > 0 ? '✓' : '○'
    output += `  ${status} ${table}: ${count === -1 ? 'ERROR' : count}\n`
  })

  if (health.issues.length > 0) {
    output += `\n⚠️  Issues Found:\n`
    health.issues.forEach(issue => {
      output += `  • ${issue}\n`
    })
  } else {
    output += `\n✅ No issues detected\n`
  }

  return output
}

/**
 * Run all tests
 */
export async function runAllSyncTests(): Promise<{
  download: SyncTestResult
  upload: SyncTestResult
  health: SyncHealthCheck
}> {
  console.log('\n🧪 Menjalankan semua test sinkronisasi...\n')

  const health = await syncHealthCheck()
  console.log(formatHealthCheck(health))

  const download = await testDownloadFlow()
  console.log(formatTestResult(download))

  const upload = await testUploadFlow()
  console.log(formatTestResult(upload))

  return { download, upload, health }
}
