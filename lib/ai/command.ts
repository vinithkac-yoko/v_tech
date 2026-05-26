import { anthropic, MODELS } from './client'
import { buildSystemPrompt } from './system-prompt'
import type { Entity, Field, AIActionResult, AIIntent } from '@/types'

export async function processCommand(
  userMessage: string,
  entities: Entity[],
  fields: Field[],
  context: {
    currentEntity?: string
    recentCommands?: string[]
  }
): Promise<AIActionResult> {
  const systemPrompt = buildSystemPrompt(entities, fields)

  const contextNote = context.currentEntity
    ? `\nUser is currently viewing: ${context.currentEntity}`
    : ''
  const historyNote = context.recentCommands?.length
    ? `\nRecent commands: ${context.recentCommands.slice(-5).join(' | ')}`
    : ''

  const response = await anthropic.messages.create({
    model: MODELS.smart,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `${userMessage}${contextNote}${historyNote}

Respond with valid JSON only. No prose outside the JSON object.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0]) as AIActionResult
  } catch {
    return {
      intent: 'READ' as AIIntent,
      confirmation_message: text || 'I could not understand that command. Please try again.',
      action: { type: 'none', payload: {} },
      display: { type: 'message', data: { text: text || 'Could not parse response.' } },
    }
  }
}

export async function classifyIntent(userMessage: string): Promise<AIIntent> {
  const response = await anthropic.messages.create({
    model: MODELS.fast,
    max_tokens: 64,
    messages: [
      {
        role: 'user',
        content: `Classify this command into one intent. Reply with ONLY the intent word.
Intents: READ, WRITE, MUTATE_SCHEMA, MUTATE_WORKFLOW, MUTATE_UI, ANALYZE, NAVIGATE, UNDO, EXPORT
Command: "${userMessage}"`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : 'READ'
  const validIntents: AIIntent[] = ['READ', 'WRITE', 'MUTATE_SCHEMA', 'MUTATE_WORKFLOW', 'MUTATE_UI', 'ANALYZE', 'NAVIGATE', 'UNDO', 'EXPORT']
  return validIntents.includes(text as AIIntent) ? (text as AIIntent) : 'READ'
}
