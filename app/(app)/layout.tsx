'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { CommandBar } from '@/components/command-bar/command-bar'
import { ToastProvider } from '@/components/ui/toast-provider'
import { useAppStore } from '@/stores/app-store'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { setEntities, setFields, setTenant } = useAppStore()

  React.useEffect(() => {
    // Load tenant and schema on mount
    Promise.all([
      fetch('/api/entities').then(r => r.json()),
      fetch('/api/tenant').then(r => r.json()),
    ]).then(([schemaData, tenantData]) => {
      if (schemaData.entities) setEntities(schemaData.entities)
      if (schemaData.fields) setFields(schemaData.fields)
      if (tenantData.tenant) setTenant(tenantData.tenant)
    }).catch(console.error)
  }, [setEntities, setFields, setTenant])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <CommandBar />
      <ToastProvider />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </QueryClientProvider>
  )
}
