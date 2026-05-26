import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRecord, queryRecords } from '@/lib/records/engine'
import { triggerWorkflows } from '@/lib/workflows/engine'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users').select('tenant_id').eq('user_id', user.id).single()
  if (!tenantUser) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const entityName = searchParams.get('entity')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  if (!entityName) return NextResponse.json({ error: 'entity required' }, { status: 400 })

  const { data: entity } = await supabase
    .from('entities').select('id').eq('tenant_id', tenantUser.tenant_id).eq('name', entityName).single()

  if (!entity) return NextResponse.json({ records: [], count: 0 })

  const result = await queryRecords(supabase, tenantUser.tenant_id, entity.id, { limit, offset })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users').select('tenant_id').eq('user_id', user.id).single()
  if (!tenantUser) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const { entity_name, data } = await request.json()

  const { data: entity } = await supabase
    .from('entities').select('id, name').eq('tenant_id', tenantUser.tenant_id).eq('name', entity_name).single()
  if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 })

  const { data: fields } = await supabase
    .from('fields').select('*').eq('entity_id', entity.id)

  const record = await createRecord(supabase, tenantUser.tenant_id, entity.id, data, user.id, fields ?? [])

  // Fire-and-forget workflow triggers
  triggerWorkflows(supabase, tenantUser.tenant_id, 'record_created', entity.name, record).catch(console.error)

  // Meter usage
  await supabase.from('usage_events').insert({
    tenant_id: tenantUser.tenant_id,
    event_type: 'record_created',
    units: 1,
  })

  return NextResponse.json({ record }, { status: 201 })
}
