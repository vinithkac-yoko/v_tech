import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processCommand } from '@/lib/ai/command'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, currentEntity, recentCommands } = await request.json()

    // Get tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) return NextResponse.json({ error: 'No tenant found' }, { status: 400 })

    // Fetch schema
    const [{ data: entities }, { data: fields }] = await Promise.all([
      supabase.from('entities').select('*').eq('tenant_id', tenantUser.tenant_id).order('sort_order'),
      supabase.from('fields').select('*').eq('tenant_id', tenantUser.tenant_id),
    ])

    const result = await processCommand(
      message,
      entities ?? [],
      fields ?? [],
      { currentEntity, recentCommands }
    )

    // Log AI usage
    await supabase.from('usage_events').insert({
      tenant_id: tenantUser.tenant_id,
      event_type: 'ai_call',
      units: 1,
      metadata: { purpose: 'command', intent: result.intent },
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Command error:', err)
    return NextResponse.json(
      { error: 'AI command failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
