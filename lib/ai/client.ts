import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODELS = {
  smart: 'claude-sonnet-4-6',   // schema gen, workflow gen, complex analysis
  fast: 'claude-haiku-4-5-20251001',  // intent classification, simple tasks
} as const
