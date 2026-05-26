import * as XLSX from 'xlsx'
import type { Field } from '@/types'

export function exportToExcel(
  records: Array<{ id: string; data: Record<string, unknown>; created_at: string }>,
  fields: Field[],
  entityName: string
): Blob {
  const visibleFields = fields.filter(f => !f.is_system || f.name === 'created_at')

  const headers = visibleFields.map(f => f.display_name)

  const rows = records.map(record => {
    return visibleFields.map(field => {
      const value = field.is_system && field.name === 'created_at'
        ? record.created_at
        : record.data[field.name]

      if (value === null || value === undefined) return ''

      // Format select fields
      if ((field.type === 'select' || field.type === 'multi_select') && field.options) {
        if (Array.isArray(value)) {
          return value
            .map(v => field.options?.find(o => o.value === v)?.label ?? v)
            .join(', ')
        }
        return field.options.find(o => o.value === value)?.label ?? value
      }

      // Format date fields
      if (field.type === 'date' && typeof value === 'string') {
        return new Date(value).toLocaleDateString('en-IN')
      }

      if (field.type === 'datetime' && typeof value === 'string') {
        return new Date(value).toLocaleString('en-IN')
      }

      // Format boolean
      if (field.type === 'boolean') {
        return value ? 'Yes' : 'No'
      }

      return value
    })
  })

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Auto-width columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, entityName.slice(0, 31))

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
