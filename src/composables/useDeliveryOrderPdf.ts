import jsPDF from 'jspdf'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { useToast } from '@/composables/useToast'

// ============================================================
// Export PDF Surat Jalan + share (WhatsApp / share sheet)
// Mengikuti pola usePdfExport.ts (invoice): jsPDF → Blob →
// native: Filesystem.Cache → Share.share | web: Web Share API.
// ============================================================

export interface DeliveryOrderPdfRow {
  code: string
  name: string
  qty: number
}

export interface DeliveryOrderPdfDrop {
  name: string
  kecamatan: string
  rows: DeliveryOrderPdfRow[]
}

export interface DeliveryOrderPdfData {
  storeName: string
  storeAddress: string
  storePhone: string
  doNumber: string
  doDate: string
  plate: string
  driverName: string
  isMulti: boolean
  route: string
  notes?: string
  truckRows: DeliveryOrderPdfRow[]
  truckTotalQty: number
  drops: DeliveryOrderPdfDrop[]
}

const formatDate = (d: string): string => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function useDeliveryOrderPdf() {
  const toast = useToast()

  const generatePdf = (data: DeliveryOrderPdfData): jsPDF => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const margin = 15
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = pageWidth - 2 * margin
    const maxY = pageHeight - margin
    let yPos = margin

    const ensureSpace = (needed: number) => {
      if (yPos + needed > maxY) {
        doc.addPage()
        yPos = margin
      }
    }

    // Kolom tabel barang: No | Kode | Nama | Qty (kanan)
    const colNo = margin + 8
    const colCode = margin + 14
    const colName = margin + 42
    const colQty = pageWidth - margin - 4

    const clipLine = (text: string, width: number): string => {
      const lines = doc.splitTextToSize(text || '-', width)
      return lines[0] || '-'
    }

    // ---- Kop ----
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(
      data.isMulti ? 'SURAT JALAN GABUNGAN (MULTI-DROP)' : 'SURAT JALAN',
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )
    yPos += 7
    doc.setFontSize(16)
    doc.setTextColor(13, 134, 255)
    doc.text(data.storeName, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    if (data.storeAddress) {
      doc.text(data.storeAddress, pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
    }
    if (data.storePhone) {
      doc.text(`Phone: ${data.storePhone}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
    }
    yPos += 2

    // Garis pemisah ganda
    doc.setLineWidth(0.6)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    doc.setLineWidth(0.2)
    doc.line(margin, yPos + 1.3, pageWidth - margin, yPos + 1.3)
    yPos += 6

    // ---- Info umum ----
    const half = margin + contentWidth / 2
    const infoRow = (l1: string, v1: string, l2: string, v2: string) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`${l1}:`, margin, yPos)
      doc.text(`${l2}:`, half, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(v1, margin + 32, yPos)
      doc.text(v2, half + 26, yPos)
      yPos += 6
    }
    infoRow('No. Surat Jalan', data.doNumber || '-', 'Tanggal Kirim', formatDate(data.doDate))
    infoRow('No. Polisi', data.plate || '-', 'Nama Sopir', data.driverName || '-')
    if (data.isMulti && data.route) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Rute Pengiriman:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(clipLine(data.route, contentWidth - 36), margin + 36, yPos)
      yPos += 6
    }
    yPos += 2

    // ---- Helper tabel barang ----
    const drawTableHeader = () => {
      ensureSpace(14)
      doc.setFillColor(0, 0, 0)
      doc.rect(margin, yPos, contentWidth, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('NO', colNo, yPos + 5)
      doc.text('KODE BARANG', colCode, yPos + 5)
      doc.text('NAMA / DESKRIPSI BARANG', colName, yPos + 5)
      doc.text('QTY', colQty, yPos + 5, { align: 'right' })
      yPos += 7
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
    }

    const drawGoodsTable = (rows: DeliveryOrderPdfRow[]) => {
      drawTableHeader()
      rows.forEach((r, i) => {
        if (yPos + 7 > maxY) {
          doc.addPage()
          yPos = margin
          drawTableHeader()
        }
        doc.text(String(i + 1), colNo, yPos + 4.5)
        doc.text(clipLine(r.code, colName - colCode - 4), colCode, yPos + 4.5)
        doc.text(clipLine(r.name, colQty - colName - 10), colName, yPos + 4.5)
        doc.text(String(r.qty), colQty, yPos + 4.5, { align: 'right' })
        yPos += 6.5
        doc.setDrawColor(170, 170, 170)
        doc.setLineWidth(0.1)
        doc.line(margin, yPos, pageWidth - margin, yPos)
      })
    }

    // ---- Daftar muat truk ----
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('DAFTAR MUAT TRUK', margin, yPos)
    yPos += 2
    drawGoodsTable(data.truckRows)
    ensureSpace(8)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('TOTAL DIMUAT', colQty - 4, yPos, { align: 'right' })
    doc.text(String(data.truckTotalQty), colQty + 8, yPos, { align: 'right' })
    yPos += 8

    // ---- Rincian per transaksi (penerima + tabel) ----
    for (const d of data.drops) {
      ensureSpace(24)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(`Pelanggan : `, margin, yPos)
      doc.text(d.name, margin + 22, yPos)
      yPos += 5
      doc.text('Alamat : ', margin, yPos)
      doc.text(d.kecamatan || '-', margin + 22, yPos)
      yPos += 2.5
      drawGoodsTable(d.rows)
      yPos += 6
    }

    // ---- Catatan kaki ----
    ensureSpace(26)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(data.isMulti ? 'CATATAN PENGIRIMAN MULTI-DROP:' : 'CATATAN PENGIRIMAN:', margin, yPos)
    yPos += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const noteLines = doc.splitTextToSize(
      'Dokumen ini diproses secara otomatis oleh sistem manajemen logistik terintegrasi dan sah tanpa memerlukan tanda tangan basah. Mohon periksa kesesuaian fisik barang saat penerimaan.',
      contentWidth
    )
    doc.text(noteLines, margin, yPos)
    yPos += noteLines.length * 4
    if (data.notes) {
      doc.setFont('helvetica', 'bold')
      const extra = doc.splitTextToSize(`Catatan: ${data.notes}`, contentWidth)
      doc.text(extra, margin, yPos)
      yPos += extra.length * 4
    }
    yPos += 1
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)

    return doc
  }

  const generatePdfBlob = (data: DeliveryOrderPdfData): Blob => {
    return generatePdf(data).output('blob')
  }

  /** Share PDF — Android: share sheet (WhatsApp), Web: Web Share API / unduh. */
  const sharePdf = async (pdfBlob: Blob, filename: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = await blobToBase64(pdfBlob)
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        })
        await Share.share({
          title: 'Surat Jalan',
          text: 'Surat Jalan',
          url: savedFile.uri,
          dialogTitle: 'Kirim Surat Jalan',
        })
      } catch (error) {
        console.error('Error sharing surat jalan:', error)
        throw error
      }
    } else {
      try {
        if (navigator.share && navigator.canShare) {
          const file = new File([pdfBlob], filename, { type: 'application/pdf' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Surat Jalan',
              text: 'Berikut surat jalan Anda',
            })
            return
          }
        }
        // Fallback web: unduh lalu beri tahu
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
        toast.info('Info', 'PDF berhasil diunduh. Silakan kirim lewat WhatsApp secara manual.')
      } catch (error) {
        console.error('Error sharing surat jalan on web:', error)
        throw error
      }
    }
  }

  return { generatePdf, generatePdfBlob, sharePdf }
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
