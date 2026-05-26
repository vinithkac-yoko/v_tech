import { anthropic, MODELS } from './client'
import { ONBOARDING_SYSTEM_PROMPT } from './system-prompt'
import type { OnboardingMessage, ExtractedSchema } from '@/types'

export async function streamOnboardingResponse(
  messages: OnboardingMessage[],
  onChunk: (text: string) => void
): Promise<string> {
  let fullResponse = ''

  const stream = await anthropic.messages.create({
    model: MODELS.smart,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: ONBOARDING_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullResponse += event.delta.text
      onChunk(event.delta.text)
    }
  }

  return fullResponse
}

export function extractSchemaFromResponse(response: string): ExtractedSchema | null {
  const match = response.match(/<schema>([\s\S]*?)<\/schema>/)
  if (!match) return null

  try {
    return JSON.parse(match[1].trim())
  } catch {
    return null
  }
}

export function isOnboardingComplete(response: string): boolean {
  return response.includes('<schema>') && response.includes('</schema>')
}
