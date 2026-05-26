import { NextRequest } from 'next/server'
import { anthropic, MODELS } from '@/lib/ai/client'
import { ONBOARDING_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'

export async function POST(request: NextRequest) {
  const { messages } = await request.json()

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
    messages: messages.length === 0
      ? [{ role: 'user', content: 'Start the onboarding interview. Greet me and ask your first question.' }]
      : messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
