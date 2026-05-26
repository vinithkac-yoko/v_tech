'use client'

import * as React from 'react'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
import type { OnboardingMessage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface OnboardingChatProps {
  onComplete: (schema: unknown) => void
}

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const [messages, setMessages] = React.useState<OnboardingMessage[]>([])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [complete, setComplete] = React.useState(false)
  const [questionCount, setQuestionCount] = React.useState(0)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Start conversation
  React.useEffect(() => {
    sendMessage('', true)
  }, [])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (userMessage: string, isInit = false) => {
    if (!userMessage.trim() && !isInit) return
    setLoading(true)

    const newMessages: OnboardingMessage[] = isInit
      ? []
      : [...messages, { role: 'user', content: userMessage }]

    if (!isInit) {
      setMessages(newMessages)
      setInput('')
    }

    try {
      const response = await fetch('/api/ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.body) throw new Error('No stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      // Add empty assistant message
      const updatedMessages: OnboardingMessage[] = [
        ...newMessages,
        { role: 'assistant', content: '' },
      ]
      setMessages(updatedMessages)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk

        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: fullText },
        ])
      }

      // Check if onboarding is complete
      if (fullText.includes('<schema>')) {
        setComplete(true)
        const match = fullText.match(/<schema>([\s\S]*?)<\/schema>/)
        if (match) {
          try {
            const schema = JSON.parse(match[1].trim())
            setTimeout(() => onComplete(schema), 1500)
          } catch {
            console.error('Failed to parse schema')
          }
        }
      }

      setQuestionCount(c => c + 1)
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-6 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {complete ? 'Setup complete!' : `Question ${Math.min(questionCount, 20)} of 20`}
          </span>
          <span className="text-xs text-muted-foreground">{Math.round((questionCount / 20) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              complete ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${Math.min((questionCount / 20) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {complete && (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle2 className="h-5 w-5" />
            <span>Your ERP is being built...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!complete && (
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              disabled={loading}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              size="icon"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send · The more detail you give, the better your ERP will be
          </p>
        </div>
      )}
    </div>
  )
}

function ChatMessage({ message }: { message: OnboardingMessage }) {
  const isUser = message.role === 'user'

  // Strip schema block from display
  const displayContent = message.content.replace(/<schema>[\s\S]*?<\/schema>/g, '').trim()

  if (!displayContent) return null

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold mr-2 shrink-0 mt-0.5">
          V
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-xl px-4 py-3 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}
      >
        <p className="whitespace-pre-wrap">{displayContent}</p>
      </div>
    </div>
  )
}
