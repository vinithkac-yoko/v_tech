import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppRecord, RecordData, Field } from '@/types'

export async function createRecord(
  supabase: SupabaseClient,
  tenantId: string,
  entityId: string,
  data: RecordData,
  userId?: string,
  fields?: Field[]
): Promise<AppRecord> {
  // Handle auto_number fields
  if (fields) {
    for (const field of fields.filter(f => f.type === 'auto_number')) {
      if (!data[field.name]) {
        const nextNum = await getNextAutoNumber(supabase, tenantId, entityId, field.name)
        const prefix = (field.ui_config as { prefix?: string })?.prefix || field.name.toUpperCase().slice(0, 3)
        data[field.name] = `${prefix}-${String(nextNum).padStart(3, '0')}`
      }
    }
  }

  const { data: record, error } = await supabase
    .from('records')
    .insert({
      tenant_id: tenantId,
      entity_id: entityId,
      data,
      created_by: userId ?? null,
    })
    .select()
    .single()

  if (error) throw error

  await logEvent(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    event_type: 'create_record',
    entity_id: entityId,
    record_id: record.id,
    before_state: null,
    after_state: record.data,
    source: 'user',
  })

  return record
}

export async function updateRecord(
  supabase: SupabaseClient,
  tenantId: string,
  recordId: string,
  updates: Partial<RecordData>,
  userId?: string,
  source: 'user' | 'ai' | 'automation' = 'user'
): Promise<AppRecord> {
  const { data: existing, error: fetchError } = await supabase
    .from('records')
    .select('*')
    .eq('id', recordId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError) throw fetchError

  const newData = { ...existing.data, ...updates }

  const { data: updated, error } = await supabase
    .from('records')
    .update({ data: newData })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw error

  await logEvent(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    event_type: 'update_record',
    entity_id: existing.entity_id,
    record_id: recordId,
    before_state: existing.data,
    after_state: newData,
    source,
  })

  return updated
}

export async function softDeleteRecord(
  supabase: SupabaseClient,
  tenantId: string,
  recordId: string,
  userId?: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('records')
    .select('entity_id, data')
    .eq('id', recordId)
    .single()

  await supabase
    .from('records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('tenant_id', tenantId)

  await logEvent(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    event_type: 'delete_record',
    entity_id: existing?.entity_id,
    record_id: recordId,
    before_state: existing?.data,
    after_state: null,
    source: 'user',
  })
}

export async function queryRecords(
  supabase: SupabaseClient,
  tenantId: string,
  entityId: string,
  options: {
    search?: string
    filters?: Array<{ field: string; value: unknown }>
    sort?: { field: string; direction: 'asc' | 'desc' }
    limit?: number
    offset?: number
  } = {}
): Promise<{ records: AppRecord[]; count: number }> {
  let query = supabase
    .from('records')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('entity_id', entityId)
    .is('deleted_at', null)

  if (options.filters) {
    for (const filter of options.filters) {
      query = query.eq(`data->>${filter.field}`, String(filter.value))
    }
  }

  if (options.sort) {
    // Sort by JSONB field
    query = query.order(`data->>${options.sort.field}` as 'created_at', {
      ascending: options.sort.direction === 'asc',
    })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  if (options.limit) query = query.limit(options.limit)
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)

  const { data, error, count } = await query

  if (error) throw error
  return { records: data ?? [], count: count ?? 0 }
}

async function getNextAutoNumber(
  supabase: SupabaseClient,
  tenantId: string,
  entityId: string,
  fieldName: string
): Promise<number> {
  // Upsert counter and return incremented value
  const { data, error } = await supabase.rpc('increment_auto_number', {
    p_tenant_id: tenantId,
    p_entity_id: entityId,
    p_field_name: fieldName,
  })

  if (error) {
    // Fallback: count existing records
    const { count } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .is('deleted_at', null)
    return (count ?? 0) + 1
  }

  return data
}

async function logEvent(
  supabase: SupabaseClient,
  entry: {
    tenant_id: string
    user_id?: string
    event_type: string
    entity_id?: string
    record_id?: string
    before_state: unknown
    after_state: unknown
    source: string
  }
): Promise<void> {
  await supabase.from('event_log').insert(entry)
}
