'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Trash2 } from 'lucide-react'
import type { Entity, Field } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FormViewProps {
  entity: Entity
  fields: Field[]
  record?: { id: string; data: Record<string, unknown> }
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onDelete?: () => Promise<void>
  isLoading?: boolean
}

export function FormView({ entity, fields, record, onSubmit, onDelete, isLoading }: FormViewProps) {
  const [deleting, setDeleting] = React.useState(false)

  const editableFields = fields.filter(f =>
    !f.is_system && f.type !== 'auto_number'
  )

  // Build Zod schema dynamically
  const zodShape: Record<string, z.ZodTypeAny> = {}
  for (const field of editableFields) {
    let schema: z.ZodTypeAny = z.string().optional()

    if (field.type === 'number' || field.type === 'decimal' || field.type === 'currency') {
      schema = z.coerce.number().optional()
    } else if (field.type === 'boolean') {
      schema = z.boolean().optional()
    } else if (field.type === 'date') {
      schema = z.string().optional()
    } else if (field.type === 'multi_select') {
      schema = z.array(z.string()).optional()
    }

    if (field.required) {
      if (field.type === 'text' || field.type === 'long_text' || field.type === 'select') {
        schema = z.string().min(1, `${field.display_name} is required`)
      } else if (field.type === 'number' || field.type === 'decimal' || field.type === 'currency') {
        schema = z.coerce.number()
      }
    }

    zodShape[field.name] = schema
  }

  const formSchema = z.object(zodShape)
  type FormData = z.infer<typeof formSchema>

  const defaultValues: Record<string, unknown> = {}
  for (const field of editableFields) {
    defaultValues[field.name] = record?.data[field.name] ?? field.default_value ?? ''
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues as FormData,
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data as Record<string, unknown>)
  })

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Auto-number display (read-only) */}
      {fields.filter(f => f.type === 'auto_number' && record).map(field => (
        <div key={field.id} className="flex items-center gap-3">
          <span className="text-2xl font-bold font-mono text-primary">
            {String(record?.data[field.name] ?? '—')}
          </span>
          <span className="text-muted-foreground text-sm">{field.display_name}</span>
        </div>
      ))}

      {/* Editable fields in groups of 2 */}
      <div className="grid gap-4">
        {editableFields.map(field => (
          <FieldInput
            key={field.id}
            field={field}
            register={form.register}
            setValue={form.setValue}
            watch={form.watch}
            error={form.formState.errors[field.name]}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {record ? 'Save changes' : `Create ${entity.display_name.replace(/s$/, '')}`}
        </Button>

        {record && onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-2 ml-auto"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}

interface FieldInputProps {
  field: Field
  register: ReturnType<typeof useForm>['register']
  setValue: ReturnType<typeof useForm>['setValue']
  watch: ReturnType<typeof useForm>['watch']
  error?: { message?: string }
}

function FieldInput({ field, register, setValue, watch, error }: FieldInputProps) {
  const value = watch(field.name)

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1">
        {field.display_name}
        {field.required && <span className="text-destructive">*</span>}
      </label>

      {field.type === 'long_text' ? (
        <textarea
          {...register(field.name)}
          rows={4}
          placeholder={String(field.ui_config?.placeholder ?? '')}
          className={cn(
            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none',
            error && 'border-destructive'
          )}
        />
      ) : field.type === 'select' && field.options ? (
        <select
          {...register(field.name)}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            error && 'border-destructive'
          )}
        >
          <option value="">Select {field.display_name}...</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === 'boolean' ? (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register(field.name)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm text-muted-foreground">Yes</span>
        </div>
      ) : field.type === 'multi_select' && field.options ? (
        <div className="flex flex-wrap gap-2">
          {field.options.map(opt => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const current = Array.isArray(value) ? (value as string[]) : []
                  setValue(
                    field.name,
                    selected ? current.filter(v => v !== opt.value) : [...current, opt.value]
                  )
                }}
                className={cn(
                  'px-3 py-1 rounded-full text-sm border transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-muted'
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      ) : field.type === 'date' ? (
        <Input
          type="date"
          {...register(field.name)}
          className={cn(error && 'border-destructive')}
        />
      ) : field.type === 'datetime' ? (
        <Input
          type="datetime-local"
          {...register(field.name)}
          className={cn(error && 'border-destructive')}
        />
      ) : (
        <div className="relative">
          {field.ui_config?.prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {field.ui_config.prefix}
            </span>
          )}
          <Input
            type={
              field.type === 'number' || field.type === 'decimal' || field.type === 'currency'
                ? 'number'
                : 'text'
            }
            step={field.type === 'decimal' || field.type === 'currency' ? '0.01' : undefined}
            placeholder={String(field.ui_config?.placeholder ?? `Enter ${field.display_name.toLowerCase()}...`)}
            {...register(field.name)}
            className={cn(
              field.ui_config?.prefix && 'pl-8',
              error && 'border-destructive'
            )}
          />
        </div>
      )}

      {error?.message && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  )
}
