'use client'

import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Plus, Search } from 'lucide-react'
import type { Entity, Field } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'

interface ListViewProps {
  entity: Entity
  fields: Field[]
  records: Array<{ id: string; data: Record<string, unknown>; created_at: string }>
  loading?: boolean
  onExport?: () => void
  onNew?: () => void
}

export function ListView({ entity, fields, records, loading, onExport, onNew }: ListViewProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')

  const visibleFields = React.useMemo(
    () => fields.filter(f => !f.is_system).slice(0, 8),
    [fields]
  )

  const columns = React.useMemo<ColumnDef<typeof records[0]>[]>(() => [
    ...visibleFields.map(field => ({
      id: field.name,
      accessorFn: (row: typeof records[0]) => row.data[field.name],
      header: ({ column }: { column: { getIsSorted: () => string | false; toggleSorting: (b: boolean) => void } }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground text-muted-foreground font-medium text-xs uppercase tracking-wide"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {field.display_name}
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      ),
      cell: ({ getValue }: { getValue: () => unknown }) => (
        <CellRenderer value={getValue()} field={field} />
      ),
    })),
    {
      id: 'created_at',
      accessorFn: (row: typeof records[0]) => row.created_at,
      header: () => <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Created</span>,
      cell: ({ getValue }: { getValue: () => unknown }) => (
        <span className="text-muted-foreground text-xs">{formatDate(getValue() as string)}</span>
      ),
    },
  ], [visibleFields])

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${entity.display_name.toLowerCase()}...`}
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="h-8 w-64 border-0 bg-muted/50 focus-visible:bg-muted"
          />
          <span className="text-xs text-muted-foreground ml-2">
            {table.getFilteredRowModel().rows.length} records
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-8 gap-1">
              <Download className="h-3 w-3" />
              Export
            </Button>
          )}
          {onNew && (
            <Button size="sm" onClick={onNew} className="h-8 gap-1">
              <Plus className="h-3 w-3" />
              New {entity.display_name.replace(/s$/, '')}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 font-normal"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">{entity.icon}</span>
                    <p>No {entity.display_name.toLowerCase()} yet</p>
                    {onNew && (
                      <Button size="sm" variant="outline" onClick={onNew} className="mt-2">
                        <Plus className="h-3 w-3 mr-1" /> Add first record
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell, i) => (
                    <td key={cell.id} className="px-4 py-3">
                      {i === 0 ? (
                        <Link href={`/${entity.name}/${row.original.id}`} className="font-medium hover:underline">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Link>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CellRenderer({ value, field }: { value: unknown; field: Field }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/50">—</span>
  }

  if (field.type === 'select' && field.options) {
    const option = field.options.find(o => o.value === value)
    if (option) {
      return (
        <Badge
          className="font-normal"
          style={option.color ? { backgroundColor: option.color + '20', color: option.color, borderColor: option.color + '30' } : undefined}
        >
          {option.label}
        </Badge>
      )
    }
  }

  if (field.type === 'boolean') {
    return <Badge variant={value ? 'success' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>
  }

  if (field.type === 'date') {
    return <span>{formatDate(String(value))}</span>
  }

  if (field.type === 'datetime') {
    return <span className="text-xs">{formatDate(String(value), 'time')}</span>
  }

  if (field.type === 'currency' || field.type === 'decimal' || field.type === 'number') {
    const num = Number(value)
    if (field.type === 'currency') return <span>{formatCurrency(num)}</span>
    return <span>{isNaN(num) ? String(value) : num.toLocaleString('en-IN')}</span>
  }

  if (field.type === 'multi_select' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {(value as string[]).slice(0, 3).map(v => {
          const option = field.options?.find(o => o.value === v)
          return <Badge key={v} variant="secondary" className="font-normal">{option?.label ?? v}</Badge>
        })}
        {(value as string[]).length > 3 && (
          <Badge variant="secondary" className="font-normal">+{(value as string[]).length - 3}</Badge>
        )}
      </div>
    )
  }

  return <span className="truncate max-w-[200px] inline-block">{String(value)}</span>
}
