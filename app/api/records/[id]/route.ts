import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateRecord, softDeleteRecord } from '@/lib/records/engine'
import { triggerWorkflows } from '@/lib/workflows/engine'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: record } = await supabase
    .from('records').select('*').eq('id', id).is('deleted_at', null).single()

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ record })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users').select('tenant_id').eq('user_id', user.id).single()

  const body = await request.json()
  const previousRecord = await supabase.from('records').select('data, entity_id').eq('id', id).single()

  const updated = await updateRecord(supabase, tenantUser!.tenant_id, id, body.data, user.id, body.source)

  // Trigger status change workflows if status changed
  if (previousRecord.data && body.data?.status !== previousRecord.data.data?.status) {
    const { data: entity } = await supabase
      .from('entities').select('name').eq('id', previousRecord.data.entity_id).single()

    if (entity) {
      triggerWorkflows(
        supabase,
        tenantUser!.tenant_id,
        'record_status_change',
        entity.name,
        { id, data: { ...previousRecord.data.data, ...body.data } },
        previousRecord.data.data
      ).catch(console.error)
    }
  }

  return NextResponse.json({ record: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users').select('tenant_id').eq('user_id', user.id).single()

  await softDeleteRecord(supabase, tenantUser!.tenant_id, id, user.id)
  return NextResponse.json({ success: true })
}
