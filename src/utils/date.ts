/**
 * Helper tanggal zona-waktu lokal.
 *
 * PENTING: jangan pakai `new Date().toISOString().split('T')[0]` untuk
 * mendapatkan "tanggal hari ini" — ISO string memakai UTC, sehingga di WIB
 * (UTC+7) hasilnya masih kemarin sebelum jam 07:00 pagi.
 * Gunakan fungsi di bawah ini.
 */

/** Format Date -> 'YYYY-MM-DD' berdasarkan zona waktu lokal device. */
export function localDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' hari ini (lokal). */
export function localTodayStr(): string {
  return localDateStr(new Date())
}

/** 'YYYY-MM-DD' hari ini digeser `offsetDays` (lokal). Negatif = ke belakang. */
export function localDateOffsetStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return localDateStr(d)
}

/**
 * Ekstrak 'YYYY-MM-DD' (lokal) dari string timestamp ISO apa pun.
 * Bedakan dari `iso.split('T')[0]` yang mengambil bagian UTC-nya.
 */
export function localDateFromIso(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso.slice(0, 10) : localDateStr(d)
}
