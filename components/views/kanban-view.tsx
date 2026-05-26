'use client'

import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import type { Entity, Field, SelectOption } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface KanbanViewProps {
  entity: Entity
  fields: Field[]
  records: Array<{ id: string; data: Record<string, unknown>; created_at: string }>
  onStatusChange?: (recordId: string, newStatus: string) => void
  onNew?: (status?: string) => void
}

export function KanbanView({ entity, fields, records, onStatusChange, onNew }: KanbanViewProps) {
  const statusField = fields.find(f => f.type === 'select' && f.name === 'status')
    ?? fields.find(f => f.type === 'select')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [activeId, setActiveId] = React.useState<string | null>(null)

  if (!statusField?.options?.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Kanban view requires a status field with options.</p>
      </div>
    )
  }

  const columns = statusField.options
  const titleField = fields.find(f => f.type === 'auto_number' || f.sort_order === 0)
  const subtitleField = fields.find(f => f.type === 'text' && f.name !== titleField?.name)

  const getRecordsByStatus = (status: string) =>
    records.filter(r => r.data[statusField.name] === status)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || !onStatusChange) return

    // over.id is the column id (status value)
    const newStatus = over.id as string
    const record = records.find(r => r.id === active.id)
    if (!record || record.data[statusField.name] === newStatus) return

    onStatusChange(record.id, newStatus)
  }

  const activeRecord = activeId ? records.find(r => r.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={e => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto min-h-[calc(100vh-200px)]">
        {columns.map(col => (
          <KanbanColumn
            key={col.value}
            column={col}
            records={getRecordsByStatus(col.value)}
            entity={entity}
            titleField={titleField}
            subtitleField={subtitleField}
            onNew={onNew ? () => onNew(col.value) : undefined}
          />
        ))}
      </div>

      <DragOverlay>
        {activeRecord && (
          <KanbanCard
            record={activeRecord}
            entity={entity}
            titleField={titleField}
            subtitleField={subtitleField}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  column,
  records,
  entity,
  titleField,
  subtitleField,
  onNew,
}: {
  column: SelectOption
  records: Array<{ id: string; data: Record<string, unknown>; created_at: string }>
  entity: Entity
  titleField?: Field
  subtitleField?: Field
  onNew?: () => void
}) {
  const { setNodeRef, isOver } = useSortable({ id: column.value, data: { type: 'column' } })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-72 shrink-0 rounded-lg bg-muted/40 p-3',
        isOver && 'bg-primary/5 ring-2 ring-primary/30'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge
            className="font-normal"
            style={column.color
              ? { backgroundColor: column.color + '20', color: column.color, borderColor: column.color + '30' }
              : undefined
            }
          >
            {column.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{records.length}</span>
        </div>
        {onNew && (
          <button onClick={onNew} className="text-muted-foreground hover:text-foreground">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Cards */}
      <SortableContext items={records.map(r => r.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {records.map(record => (
            <KanbanCard
              key={record.id}
              record={record}
              entity={entity}
              titleField={titleField}
              subtitleField={subtitleField}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function KanbanCard({
  record,
  entity,
  titleField,
  subtitleField,
  isDragging,
}: {
  record: { id: string; data: Record<string, unknown>; created_at: string }
  entity: Entity
  titleField?: Field
  subtitleField?: Field
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: record.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const title = titleField
    ? String(record.data[titleField.name] ?? '')
    : record.id.slice(0, 8)

  const subtitle = subtitleField
    ? String(record.data[subtitleField.name] ?? '')
    : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-background rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg'
      )}
    >
      <Link href={`/${entity.name}/${record.id}`} className="block" onClick={e => e.stopPropagation()}>
        <p className="font-medium text-sm truncate">{title || '—'}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
      </Link>
    </div>
  )
}
