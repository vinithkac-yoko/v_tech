import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: events } = await supabase
    .from('event_log')
    .select('id, event_type, source, before_state, after_state, created_at')
    .eq('record_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ events: events ?? [] })
}
