'use client'

import * as React from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, CornerDownLeft, Undo2 } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

export function CommandBar() {
  const { commandBarOpen, closeCommandBar, commandHistory, addToHistory, entities, currentEntity, setLastAIAction, addToast } = useAppStore()
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<string | null>(null)
  const [historyIndex, setHistoryIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Open on Cmd+K
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useAppStore.getState().openCommandBar()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  React.useEffect(() => {
    if (commandBarOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResult(null)
      setHistoryIndex(-1)
    }
  }, [commandBarOpen])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
      setHistoryIndex(newIndex)
      if (newIndex >= 0) setQuery(commandHistory[commandHistory.length - 1 - newIndex])
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIndex = Math.max(historyIndex - 1, -1)
      setHistoryIndex(newIndex)
      setQuery(newIndex === -1 ? '' : commandHistory[commandHistory.length - 1 - newIndex])
    }
    if (e.key === 'Escape') {
      closeCommandBar()
    }
  }

  const handleSubmit = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setResult(null)
    addToHistory(query.trim())

    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          currentEntity,
          recentCommands: commandHistory.slice(-5),
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Command failed')

      setLastAIAction(data)

      // Handle navigation
      if (data.intent === 'NAVIGATE' && data.action?.payload?.path) {
        closeCommandBar()
        router.push(data.action.payload.path)
        return
      }

      // Handle undo
      if (data.intent === 'UNDO') {
        await handleUndo()
        return
      }

      // For mutations, execute them
      if (['WRITE', 'MUTATE_SCHEMA', 'MUTATE_WORKFLOW', 'MUTATE_UI'].includes(data.intent)) {
        await executeMutation(data)
      }

      setResult(data.confirmation_message || 'Done.')
      addToast({ title: data.confirmation_message || 'Done', variant: 'success' })

      // Auto-close for simple navigations
      if (data.display?.type === 'navigate') {
        closeCommandBar()
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setResult(message)
      addToast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleUndo = async () => {
    try {
      const res = await fetch('/api/records/undo', { method: 'POST' })
      const data = await res.json()
      setResult(data.message || 'Last action undone.')
      addToast({ title: 'Undone', description: data.message, variant: 'success' })
    } catch {
      setResult('Nothing to undo.')
    }
  }

  const executeMutation = async (aiResult: { intent: string; action: { type: string; payload: unknown } }) => {
    const { action } = aiResult

    if (action.type === 'create_record') {
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      })
    }

    if (action.type === 'create_field' || action.type === 'create_entity') {
      await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      })
      // Reload entities in store
      const res = await fetch('/api/entities')
      const { entities: updated } = await res.json()
      useAppStore.getState().setEntities(updated)
    }
  }

  if (!commandBarOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeCommandBar}
      />

      {/* Command panel */}
      <div className="relative w-full max-w-2xl mx-4 rounded-xl border bg-background shadow-2xl overflow-hidden">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          {/* Input */}
          <div className="flex items-center border-b px-4 py-3 gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Ask anything... (e.g. 'Show me pending orders', 'Add a new job for Mehta Steel')"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!query.trim()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <CornerDownLeft className="h-3 w-3" />
                Enter
              </button>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="px-4 py-3 text-sm text-muted-foreground border-b bg-muted/30">
              {result}
            </div>
          )}

          {/* Quick suggestions */}
          {!query && !result && (
            <Command.List className="py-2">
              <Command.Group heading="Quick actions">
                {[
                  { label: 'Show pending orders', icon: '📋' },
                  { label: 'Create a new job', icon: '🏭' },
                  { label: 'Check inventory levels', icon: '📦' },
                  { label: 'Show overdue deliveries', icon: '🚚' },
                ].map(s => (
                  <Command.Item
                    key={s.label}
                    onSelect={() => {
                      setQuery(s.label)
                      inputRef.current?.focus()
                    }}
                    className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-muted text-sm"
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              {entities.length > 0 && (
                <Command.Group heading="Navigate to">
                  {entities.slice(0, 5).map(e => (
                    <Command.Item
                      key={e.id}
                      onSelect={() => {
                        closeCommandBar()
                        router.push(`/${e.name}`)
                      }}
                      className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-muted text-sm"
                    >
                      <span>{e.icon}</span>
                      <span>{e.display_name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">↑↓</kbd> history</span>
              <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">Esc</kbd> close</span>
            </div>
            <button
              onClick={() => setQuery('undo')}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Undo2 className="h-3 w-3" />
              Undo last
            </button>
          </div>
        </Command>
      </div>
    </div>
  )
}
