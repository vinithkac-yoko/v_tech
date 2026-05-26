import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users').select('tenant_id').eq('user_id', user.id).single()
  if (!tenantUser) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  // Get last undoable event for this user
  const { data: lastEvent } = await supabase
    .from('event_log')
    .select('*')
    .eq('tenant_id', tenantUser.tenant_id)
    .eq('user_id', user.id)
    .in('event_type', ['create_record', 'update_record', 'delete_record', 'create_entity', 'add_field'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastEvent) {
    return NextResponse.json({ message: 'Nothing to undo.' })
  }

  const timeSince = Date.now() - new Date(lastEvent.created_at).getTime()
  if (timeSince > 30 * 60 * 1000) {
    return NextResponse.json({ message: 'Last action is too old to undo (>30 minutes).' })
  }

  if (lastEvent.event_type === 'create_record' && lastEvent.record_id) {
    await supabase
      .from('records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', lastEvent.record_id)
    return NextResponse.json({ message: `Record creation undone.` })
  }

  if (lastEvent.event_type === 'update_record' && lastEvent.record_id && lastEvent.before_state) {
    await supabase
      .from('records')
      .update({ data: lastEvent.before_state })
      .eq('id', lastEvent.record_id)
    return NextResponse.json({ message: `Record update undone.` })
  }

  if (lastEvent.event_type === 'delete_record' && lastEvent.record_id) {
    await supabase
      .from('records')
      .update({ deleted_at: null })
      .eq('id', lastEvent.record_id)
    return NextResponse.json({ message: `Record deletion undone.` })
  }

  if (lastEvent.event_type === 'create_entity' && lastEvent.entity_id) {
    // Soft-delete by removing — only if no records exist
    const { count } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', lastEvent.entity_id)
      .is('deleted_at', null)

    if (count && count > 0) {
      return NextResponse.json({ message: `Cannot undo — ${count} records already exist in this entity.` })
    }

    await supabase.from('fields').delete().eq('entity_id', lastEvent.entity_id)
    await supabase.from('entities').delete().eq('id', lastEvent.entity_id)
    return NextResponse.json({ message: `Entity creation undone.` })
  }

  return NextResponse.json({ message: 'This action cannot be undone.' })
}
