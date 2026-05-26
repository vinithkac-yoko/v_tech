'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { FormView } from '@/components/views/form-view'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function RecordPage() {
  const params = useParams()
  const router = useRouter()
  const entityName = params.entity as string
  const recordId = params.id as string
  const { entities, fields, addToast } = useAppStore()

  const [record, setRecord] = React.useState<{ id: string; data: Record<string, unknown>; created_at: string; updated_at: string } | null>(null)
  const [activity, setActivity] = React.useState<Array<{ id: string; event_type: string; source: string; before_state: unknown; after_state: unknown; created_at: string }>>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const entity = entities.find(e => e.name === entityName)
  const entityFields = fields.filter(f => f.entity_id === entity?.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  React.useEffect(() => {
    fetchRecord()
  }, [recordId])

  const fetchRecord = async () => {
    setLoading(true)
    try {
      const [recordRes, activityRes] = await Promise.all([
        fetch(`/api/records/${recordId}`),
        fetch(`/api/records/${recordId}/activity`),
      ])
      const recordData = await recordRes.json()
      setRecord(recordData.record)

      if (activityRes.ok) {
        const actData = await activityRes.json()
        setActivity(actData.events ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      if (!res.ok) throw new Error('Save failed')
      await fetchRecord()
      addToast({ title: 'Saved', variant: 'success' })
    } catch (err) {
      addToast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this record? This cannot be undone immediately.')) return
    await fetch(`/api/records/${recordId}`, { method: 'DELETE' })
    addToast({ title: 'Deleted', variant: 'default' })
    router.push(`/${entityName}`)
  }

  if (!entity) return null

  const titleField = entityFields.find(f => f.type === 'auto_number') ?? entityFields[0]
  const recordTitle = record?.data[titleField?.name ?? ''] ?? recordId.slice(0, 8)

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Back nav */}
      <Link
        href={`/${entityName}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        {entity.display_name}
      </Link>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Record header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{entity.icon}</span>
                <Badge variant="secondary">{entity.display_name}</Badge>
              </div>
              <h1 className="text-2xl font-bold">{String(recordTitle)}</h1>
              {record && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {formatDate(record.updated_at, 'time')}
                </p>
              )}
            </div>
          </div>

          {/* Form */}
          {record && (
            <FormView
              entity={entity}
              fields={entityFields}
              record={record}
              onSubmit={handleSave}
              onDelete={handleDelete}
              isLoading={saving}
            />
          )}

          {/* Activity log */}
          {activity.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Activity</h2>
              <div className="space-y-2">
                {activity.slice(0, 10).map(event => (
                  <div key={event.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
                    <div>
                      <span className="text-muted-foreground">{formatActivityText(event)}</span>
                      <span className="text-xs text-muted-foreground/60 ml-2">
                        {formatDate(event.created_at, 'time')}
                      </span>
                      {event.source === 'ai' && (
                        <Badge variant="info" className="ml-2 text-xs py-0">AI</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatActivityText(event: { event_type: string; before_state: unknown; after_state: unknown }): string {
  if (event.event_type === 'create_record') return 'Record created'
  if (event.event_type === 'delete_record') return 'Record deleted'
  if (event.event_type === 'update_record') {
    const before = event.before_state as Record<string, unknown>
    const after = event.after_state as Record<string, unknown>
    if (before && after) {
      const changed = Object.keys(after).filter(k => after[k] !== before[k])
      if (changed.length === 1) return `Updated ${changed[0].replace(/_/g, ' ')}`
      return `Updated ${changed.length} fields`
    }
    return 'Record updated'
  }
  return event.event_type.replace(/_/g, ' ')
}
