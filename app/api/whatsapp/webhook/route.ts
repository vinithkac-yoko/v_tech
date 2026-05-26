import { NextRequest, NextResponse } from 'next/server'
import { parseWorkerReply } from '@/lib/whatsapp/client'
import { createClient } from '@/lib/supabase/server'
import { updateRecord } from '@/lib/records/engine'

// WhatsApp webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Incoming messages
export async function POST(request: NextRequest) {
  const body = await request.json()

  const entry = body?.entry?.[0]
  const changes = entry?.changes?.[0]
  const value = changes?.value

  if (value?.statuses) {
    // Delivery/read receipts — ignore
    return NextResponse.json({ status: 'ok' })
  }

  const messages = value?.messages
  if (!messages?.length) return NextResponse.json({ status: 'ok' })

  const supabase = await createClient()

  for (const msg of messages) {
    if (msg.type !== 'text') continue

    const from = msg.from // sender's phone number
    const text = msg.text?.body ?? ''

    const parsed = parseWorkerReply(text)

    if (parsed.action === 'unknown' || !parsed.jobNumber) continue

    // Find the job by number across all tenants (match phone to operator)
    const { data: matchingRecords } = await supabase
      .from('records')
      .select('id, tenant_id, entity_id, data')
      .contains('data', { job_number: parsed.jobNumber })
      .is('deleted_at', null)
      .limit(1)

    if (!matchingRecords?.length) continue

    const record = matchingRecords[0]

    const statusMap = {
      complete: 'completed',
      started: 'in_progress',
      issue: 'on_hold',
    }

    const newStatus = statusMap[parsed.action as keyof typeof statusMap]
    if (!newStatus) continue

    await updateRecord(
      supabase,
      record.tenant_id,
      record.id,
      { status: newStatus, last_whatsapp_update: new Date().toISOString() },
      undefined,
      'automation'
    )
  }

  return NextResponse.json({ status: 'ok' })
}
