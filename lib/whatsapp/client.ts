import type { SupabaseClient } from '@supabase/supabase-js'

const WHATSAPP_API_VERSION = 'v19.0'
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

export async function sendWhatsAppMessage(
  tenantId: string,
  supabase: SupabaseClient,
  to: string,
  message: string
): Promise<void> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('whatsapp_phone_id, whatsapp_access_token')
    .eq('id', tenantId)
    .single()

  if (!tenant?.whatsapp_phone_id || !tenant?.whatsapp_access_token) {
    console.warn('WhatsApp not configured for tenant', tenantId)
    return
  }

  const response = await fetch(
    `${WHATSAPP_API_BASE}/${tenant.whatsapp_phone_id}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tenant.whatsapp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizePhone(to),
        type: 'text',
        text: { body: message },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    console.error('WhatsApp send failed:', err)
  }
}

export async function sendWhatsAppTemplate(
  tenantId: string,
  supabase: SupabaseClient,
  to: string,
  templateName: string,
  parameters: string[]
): Promise<void> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('whatsapp_phone_id, whatsapp_access_token')
    .eq('id', tenantId)
    .single()

  if (!tenant?.whatsapp_phone_id || !tenant?.whatsapp_access_token) return

  await fetch(
    `${WHATSAPP_API_BASE}/${tenant.whatsapp_phone_id}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tenant.whatsapp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_IN' },
          components: [
            {
              type: 'body',
              parameters: parameters.map(p => ({ type: 'text', text: p })),
            },
          ],
        },
      }),
    }
  )
}

// Parses simple worker status replies via WhatsApp
export function parseWorkerReply(message: string): {
  action: 'complete' | 'started' | 'issue' | 'unknown'
  jobNumber?: string
  note?: string
} {
  const lower = message.toLowerCase().trim()

  const completeKeywords = ['done', 'complete', 'completed', 'finish', 'finished', 'ok', 'ready']
  const startedKeywords = ['started', 'start', 'begin', 'working']
  const issueKeywords = ['issue', 'problem', 'delay', 'stuck', 'hold', 'wait']

  // Extract job number (e.g. JOB-042, ORD-12)
  const jobMatch = message.match(/[A-Z]{2,5}-\d{2,4}/i)
  const jobNumber = jobMatch ? jobMatch[0].toUpperCase() : undefined

  if (completeKeywords.some(k => lower.includes(k))) {
    return { action: 'complete', jobNumber, note: message }
  }
  if (startedKeywords.some(k => lower.includes(k))) {
    return { action: 'started', jobNumber, note: message }
  }
  if (issueKeywords.some(k => lower.includes(k))) {
    return { action: 'issue', jobNumber, note: message }
  }

  return { action: 'unknown', note: message }
}

function normalizePhone(phone: string): string {
  // Strip everything except digits, ensure 91 country code for India
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return digits
  if (digits.length === 10) return `91${digits}`
  return digits
}
