import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export type ExportColumn<T> = {
  header: string
  value: (row: T) => string | number | boolean | null | undefined
}

function toCellValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return ''
  }

  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value
}

function sanitizeSheetName(value: string) {
  return value.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Sheet1'
}

export function exportRowsToExcel<T>(rows: T[], columns: ExportColumn<T>[], fileName: string, sheetName: string) {
  const headerRow = columns.map((column) => column.header)
  const bodyRows = rows.map((row) => columns.map((column) => toCellValue(column.value(row))))
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows])
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName))
  XLSX.writeFile(workbook, fileName)
}

export function exportRowsToPdf<T>(rows: T[], columns: ExportColumn<T>[], title: string, fileName: string) {
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const bodyRows = rows.map((row) => columns.map((column) => String(toCellValue(column.value(row)))))

  document.setFontSize(16)
  document.text(title, 40, 36)
  document.setFontSize(10)
  document.text(`Generated ${new Date().toLocaleString()}`, 40, 54)

  autoTable(document, {
    startY: 70,
    head: [columns.map((column) => column.header)],
    body: bodyRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  document.save(fileName)
}