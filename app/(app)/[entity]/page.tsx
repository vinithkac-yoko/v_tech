'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { ListView } from '@/components/views/list-view'
import { KanbanView } from '@/components/views/kanban-view'
import { LayoutGrid, List, NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ViewType } from '@/types'

export default function EntityPage() {
  const params = useParams()
  const router = useRouter()
  const entityName = params.entity as string
  const { entities, fields, setCurrentEntity } = useAppStore()

  const [records, setRecords] = React.useState<Array<{ id: string; data: Record<string, unknown>; created_at: string }>>([])
  const [loading, setLoading] = React.useState(true)
  const [viewType, setViewType] = React.useState<ViewType>('list')

  const entity = entities.find(e => e.name === entityName)
  const entityFields = fields.filter(f => f.entity_id === entity?.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  React.useEffect(() => {
    setCurrentEntity(entityName)
    return () => setCurrentEntity(null)
  }, [entityName, setCurrentEntity])

  React.useEffect(() => {
    if (!entity) return
    fetchRecords()
  }, [entity])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/records?entity=${entityName}&limit=200`)
      const data = await res.json()
      setRecords(data.records ?? [])
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    window.open(`/api/export/excel?entity=${entityName}`, '_blank')
  }

  const handleNew = (status?: string) => {
    const params = status ? `?status=${status}` : ''
    router.push(`/${entityName}/new${params}`)
  }

  const handleStatusChange = async (recordId: string, newStatus: string) => {
    setRecords(prev => prev.map(r =>
      r.id === recordId ? { ...r, data: { ...r.data, status: newStatus } } : r
    ))
    await fetch(`/api/records/${recordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { status: newStatus } }),
    })
  }

  if (!entity) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Entity &quot;{entityName}&quot; not found.</p>
      </div>
    )
  }

  const hasStatusField = entityFields.some(f => f.name === 'status' && f.type === 'select')

  return (
    <div className="flex flex-col h-screen">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{entity.icon}</span>
          <div>
            <h1 className="text-xl font-semibold">{entity.display_name}</h1>
            <p className="text-xs text-muted-foreground">{records.length} records</p>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <ViewButton
            active={viewType === 'list'}
            onClick={() => setViewType('list')}
            icon={<List className="h-4 w-4" />}
            label="List"
          />
          {hasStatusField && (
            <ViewButton
              active={viewType === 'kanban'}
              onClick={() => setViewType('kanban')}
              icon={<LayoutGrid className="h-4 w-4" />}
              label="Kanban"
            />
          )}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {viewType === 'list' ? (
          <ListView
            entity={entity}
            fields={entityFields}
            records={records}
            loading={loading}
            onExport={handleExport}
            onNew={() => handleNew()}
          />
        ) : (
          <KanbanView
            entity={entity}
            fields={entityFields}
            records={records}
            onStatusChange={handleStatusChange}
            onNew={handleNew}
          />
        )}
      </div>
    </div>
  )
}

function ViewButton({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
