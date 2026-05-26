import type { SupabaseClient } from '@supabase/supabase-js'
import type { Entity, Field, ExtractedSchema, ExtractedEntity, ExtractedField, FieldType } from '@/types'

export async function createEntityWithFields(
  supabase: SupabaseClient,
  tenantId: string,
  extracted: ExtractedEntity,
  sortOrder: number = 0
): Promise<{ entity: Entity; fields: Field[] }> {
  const { data: entity, error: entityError } = await supabase
    .from('entities')
    .insert({
      tenant_id: tenantId,
      name: extracted.name,
      display_name: extracted.display_name,
      icon: extracted.icon || '📦',
      color: extracted.color || '#6366f1',
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (entityError) throw entityError

  const fieldRows = extracted.fields.map((f: ExtractedField, i: number) => ({
    tenant_id: tenantId,
    entity_id: entity.id,
    name: f.name,
    display_name: f.display_name,
    type: f.type as FieldType,
    required: f.required ?? false,
    options: f.options ?? null,
    sort_order: i,
    is_system: false,
  }))

  // Add system fields
  fieldRows.push(
    {
      tenant_id: tenantId,
      entity_id: entity.id,
      name: 'created_at',
      display_name: 'Created At',
      type: 'datetime' as FieldType,
      required: false,
      options: null,
      sort_order: 1000,
      is_system: true,
    },
    {
      tenant_id: tenantId,
      entity_id: entity.id,
      name: 'updated_at',
      display_name: 'Updated At',
      type: 'datetime' as FieldType,
      required: false,
      options: null,
      sort_order: 1001,
      is_system: true,
    }
  )

  const { data: fields, error: fieldsError } = await supabase
    .from('fields')
    .insert(fieldRows)
    .select()

  if (fieldsError) throw fieldsError

  return { entity, fields: fields ?? [] }
}

export async function bootstrapSchema(
  supabase: SupabaseClient,
  tenantId: string,
  schema: ExtractedSchema
): Promise<{ entities: Entity[]; fields: Field[] }> {
  const allEntities: Entity[] = []
  const allFields: Field[] = []

  // First pass: create all entities
  for (let i = 0; i < schema.entities.length; i++) {
    const { entity, fields } = await createEntityWithFields(
      supabase,
      tenantId,
      schema.entities[i],
      i
    )
    allEntities.push(entity)
    allFields.push(...fields)
  }

  // Second pass: wire up relation fields
  for (const extractedEntity of schema.entities) {
    const entity = allEntities.find(e => e.name === extractedEntity.name)
    if (!entity) continue

    for (const field of extractedEntity.fields) {
      if (field.relation_entity) {
        const relatedEntity = allEntities.find(e => e.name === field.relation_entity)
        if (relatedEntity) {
          await supabase
            .from('fields')
            .update({ relation_entity_id: relatedEntity.id })
            .eq('entity_id', entity.id)
            .eq('name', field.name)
        }
      }
    }
  }

  return { entities: allEntities, fields: allFields }
}

export async function addField(
  supabase: SupabaseClient,
  tenantId: string,
  entityId: string,
  field: Omit<ExtractedField, 'relation_entity'> & { relation_entity_id?: string }
): Promise<Field> {
  // Get current max sort_order
  const { data: existing } = await supabase
    .from('fields')
    .select('sort_order')
    .eq('entity_id', entityId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('fields')
    .insert({
      tenant_id: tenantId,
      entity_id: entityId,
      name: field.name,
      display_name: field.display_name,
      type: field.type,
      required: field.required ?? false,
      options: field.options ?? null,
      relation_entity_id: field.relation_entity_id ?? null,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function snapshotSchema(
  supabase: SupabaseClient,
  tenantId: string,
  entityId: string
): Promise<void> {
  const { data: entity } = await supabase
    .from('entities')
    .select('*')
    .eq('id', entityId)
    .single()

  const { data: fields } = await supabase
    .from('fields')
    .select('*')
    .eq('entity_id', entityId)

  const { data: latestVersion } = await supabase
    .from('schema_versions')
    .select('version')
    .eq('entity_id', entityId)
    .order('version', { ascending: false })
    .limit(1)

  const version = (latestVersion?.[0]?.version ?? 0) + 1

  await supabase.from('schema_versions').insert({
    tenant_id: tenantId,
    entity_id: entityId,
    version,
    snapshot: { entity, fields },
  })
}
