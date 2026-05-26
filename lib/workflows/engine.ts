import type { SupabaseClient } from '@supabase/supabase-js'
import type { Workflow, WorkflowStep } from '@/types'

export async function triggerWorkflows(
  supabase: SupabaseClient,
  tenantId: string,
  triggerType: string,
  entityName: string,
  record: { id: string; data: Record<string, unknown> },
  previousData?: Record<string, unknown>
): Promise<void> {
  const { data: workflows } = await supabase
    .from('workflows')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (!workflows?.length) return

  const matching = workflows.filter((wf: Workflow) => {
    if (wf.trigger.type !== triggerType) return false
    if (wf.trigger.entity !== entityName) return false

    if (triggerType === 'record_status_change' && wf.trigger.from_status && previousData) {
      const statusField = Object.keys(record.data).find(k => k === 'status')
      if (!statusField) return false
      if (previousData['status'] !== wf.trigger.from_status) return false
      if (record.data['status'] !== wf.trigger.to_status) return false
    }

    return true
  })

  for (const workflow of matching) {
    await executeWorkflow(supabase, tenantId, workflow, record)
  }
}

async function executeWorkflow(
  supabase: SupabaseClient,
  tenantId: string,
  workflow: Workflow,
  triggerRecord: { id: string; data: Record<string, unknown> }
): Promise<void> {
  const { data: run } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: workflow.id,
      trigger_record_id: triggerRecord.id,
      status: 'running',
    })
    .select()
    .single()

  try {
    for (const step of workflow.steps) {
      await executeStep(supabase, tenantId, step, triggerRecord)
    }

    await supabase
      .from('workflow_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', run.id)
  } catch (err) {
    await supabase
      .from('workflow_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      })
      .eq('id', run.id)
  }
}

async function executeStep(
  supabase: SupabaseClient,
  tenantId: string,
  step: WorkflowStep,
  triggerRecord: { id: string; data: Record<string, unknown> }
): Promise<void> {
  const cfg = step.config as Record<string, unknown>

  switch (step.type) {
    case 'create_record': {
      const entityName = cfg.entity as string
      const { data: entity } = await supabase
        .from('entities')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', entityName)
        .single()

      if (!entity) break

      const fieldMappings = cfg.field_mappings as Record<string, string>
      const data: Record<string, unknown> = {}
      for (const [key, template] of Object.entries(fieldMappings)) {
        data[key] = resolveTemplate(template, triggerRecord)
      }

      await supabase.from('records').insert({
        tenant_id: tenantId,
        entity_id: entity.id,
        data,
      })
      break
    }

    case 'update_record': {
      const updates = cfg.updates as Record<string, unknown>
      await supabase
        .from('records')
        .update({ data: { ...triggerRecord.data, ...updates } })
        .eq('id', triggerRecord.id)
      break
    }

    case 'send_whatsapp': {
      // WhatsApp notification — handled by whatsapp/client.ts
      const { sendWhatsAppMessage } = await import('@/lib/whatsapp/client')
      const to = resolveTemplate(cfg.to as string, triggerRecord) as string
      const message = resolveTemplate(cfg.message as string, triggerRecord) as string
      if (to && message) {
        await sendWhatsAppMessage(tenantId, supabase, to, message)
      }
      break
    }

    default:
      // Unknown step type — skip gracefully
      break
  }
}

function resolveTemplate(template: string, record: { id: string; data: Record<string, unknown> }): unknown {
  if (!template || typeof template !== 'string') return template

  // Replace {{trigger.record.id}}
  if (template === '{{trigger.record.id}}') return record.id

  // Replace {{trigger.record.fieldName}}
  const fieldMatch = template.match(/^\{\{trigger\.record\.(.+)\}\}$/)
  if (fieldMatch) return record.data[fieldMatch[1]]

  // Replace inline templates like "New job {{data.job_number}}"
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const parts = path.split('.')
    if (parts[0] === 'trigger' && parts[1] === 'record') {
      return String(record.data[parts[2]] ?? '')
    }
    return _
  })
}
