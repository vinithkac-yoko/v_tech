'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingChat } from '@/components/onboarding/chat'
import { Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const [building, setBuilding] = React.useState(false)
  const router = useRouter()

  const handleComplete = async (schema: unknown) => {
    setBuilding(true)
    try {
      const res = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bootstrap_schema', schema }),
      })

      if (!res.ok) throw new Error('Failed to build schema')

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setBuilding(false)
    }
  }

  if (building) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold mx-auto">
            V
          </div>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div>
            <p className="font-semibold text-lg">Building your ERP...</p>
            <p className="text-muted-foreground text-sm mt-1">
              Creating entities, fields, workflows, and your first dashboard
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
          V
        </div>
        <div>
          <h1 className="font-semibold text-sm">v_tech Setup</h1>
          <p className="text-xs text-muted-foreground">Let&apos;s build your ERP in 20 questions</p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 max-w-2xl mx-auto w-full">
        <OnboardingChat onComplete={handleComplete} />
      </div>
    </div>
  )
}
