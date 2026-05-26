import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEntityWithFields, addField, snapshotSchema, bootstrapSchema } from '@/lib/schema/engine'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!tenantUser) return NextResponse.json({ entities: [], fields: [] })

  const [{ data: entities }, { data: fields }] = await Promise.all([
    supabase.from('entities').select('*').eq('tenant_id', tenantUser.tenant_id).order('sort_order'),
    supabase.from('fields').select('*').eq('tenant_id', tenantUser.tenant_id).order('sort_order'),
  ])

  return NextResponse.json({ entities: entities ?? [], fields: fields ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!tenantUser) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const body = await request.json()

  // Bootstrap full schema from onboarding
  if (body.type === 'bootstrap_schema') {
    const result = await bootstrapSchema(supabase, tenantUser.tenant_id, body.schema)
    await supabase
      .from('tenants')
      .update({ onboarding_completed: true, name: body.schema.business_name ?? 'My Business' })
      .eq('id', tenantUser.tenant_id)
    return NextResponse.json(result)
  }

  // Create single entity with fields
  if (body.type === 'create_entity') {
    const { data: existing } = await supabase
      .from('entities')
      .select('sort_order')
      .eq('tenant_id', tenantUser.tenant_id)
      .order('sort_order', { ascending: false })
      .limit(1)

    const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1
    const result = await createEntityWithFields(supabase, tenantUser.tenant_id, body.entity, sortOrder)

    await supabase.from('event_log').insert({
      tenant_id: tenantUser.tenant_id,
      user_id: user.id,
      event_type: 'create_entity',
      entity_id: result.entity.id,
      after_state: { entity: result.entity },
      source: body.source ?? 'ai',
    })

    return NextResponse.json(result)
  }

  // Add field to existing entity
  if (body.type === 'add_field') {
    const { data: entity } = await supabase
      .from('entities')
      .select('id')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('name', body.entity_name)
      .single()

    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 })

    await snapshotSchema(supabase, tenantUser.tenant_id, entity.id)
    const field = await addField(supabase, tenantUser.tenant_id, entity.id, body.field)

    return NextResponse.json({ field })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
