'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

export function ToastProvider() {
  const { toasts, removeToast } = useAppStore()

  return (
    <ToastPrimitives.Provider swipeDirection="right">
      {toasts.map(toast => (
        <ToastPrimitives.Root
          key={toast.id}
          open
          onOpenChange={open => !open && removeToast(toast.id)}
          className={cn(
            'fixed bottom-4 right-4 z-50 flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg w-80 transition-all',
            toast.variant === 'destructive' && 'border-destructive/50 bg-destructive/10',
            toast.variant === 'success' && 'border-green-200 bg-green-50'
          )}
        >
          {toast.variant === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
          {toast.variant === 'destructive' && <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <ToastPrimitives.Title className="text-sm font-medium">{toast.title}</ToastPrimitives.Title>
            {toast.description && (
              <ToastPrimitives.Description className="text-xs text-muted-foreground mt-0.5">
                {toast.description}
              </ToastPrimitives.Description>
            )}
          </div>
          <ToastPrimitives.Close onClick={() => removeToast(toast.id)}>
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </ToastPrimitives.Close>
        </ToastPrimitives.Root>
      ))}
      <ToastPrimitives.Viewport />
    </ToastPrimitives.Provider>
  )
}
