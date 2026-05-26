'use client'

import * as React from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { FormView } from '@/components/views/form-view'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRecordPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const entityName = params.entity as string
  const prefilledStatus = searchParams.get('status')
  const { entities, fields, addToast } = useAppStore()
  const [saving, setSaving] = React.useState(false)

  const entity = entities.find(e => e.name === entityName)
  const entityFields = fields.filter(f => f.entity_id === entity?.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  if (!entity) return null

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      // Pre-fill status if coming from kanban column
      if (prefilledStatus && entityFields.some(f => f.name === 'status')) {
        data.status = prefilledStatus
      }

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_name: entityName, data }),
      })

      if (!res.ok) throw new Error('Failed to create')

      const { record } = await res.json()
      addToast({ title: 'Created', variant: 'success' })
      router.push(`/${entityName}/${record.id}`)
    } catch {
      addToast({ title: 'Failed to create record', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link
        href={`/${entityName}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        {entity.display_name}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{entity.icon}</span>
          <h1 className="text-xl font-semibold">
            New {entity.display_name.replace(/s$/, '')}
          </h1>
        </div>
      </div>

      <FormView
        entity={entity}
        fields={entityFields}
        onSubmit={handleSubmit}
        isLoading={saving}
      />
    </div>
  )
}
