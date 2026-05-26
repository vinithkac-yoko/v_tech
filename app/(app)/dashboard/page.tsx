'use client'

import * as React from 'react'
import { useAppStore } from '@/stores/app-store'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Package, ClipboardList, Users, Command } from 'lucide-react'
import Link from 'next/link'

interface KPIData {
  total_orders: number
  active_jobs: number
  pending_dispatch: number
  revenue_mtd: number
}

export default function DashboardPage() {
  const { entities, tenant, openCommandBar } = useAppStore()
  const [kpis, setKpis] = React.useState<KPIData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchKPIs()
  }, [entities])

  const fetchKPIs = async () => {
    setLoading(true)
    try {
      const entityNames = entities.map(e => e.name)

      const kpiData: KPIData = {
        total_orders: 0,
        active_jobs: 0,
        pending_dispatch: 0,
        revenue_mtd: 0,
      }

      // Fetch counts for known entities
      await Promise.all(
        entityNames.map(async name => {
          const res = await fetch(`/api/records?entity=${name}&limit=1`)
          const data = await res.json()

          if (name.includes('order') || name.includes('sales')) {
            kpiData.total_orders = data.count ?? 0
          }
          if (name.includes('job')) {
            kpiData.active_jobs = data.count ?? 0
          }
        })
      )

      setKpis(kpiData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {tenant ? `Good morning, ${tenant.name}` : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={openCommandBar}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Command className="h-4 w-4" />
          <span>Ask AI anything...</span>
          <kbd className="bg-background rounded px-1.5 py-0.5 text-xs">⌘K</kbd>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <KPICard
              title="Total Orders"
              value={String(kpis?.total_orders ?? 0)}
              icon={<ClipboardList className="h-5 w-5" />}
              color="#6366f1"
              href={entities.find(e => e.name.includes('order'))
                ? `/${entities.find(e => e.name.includes('order'))!.name}`
                : '/'}
            />
            <KPICard
              title="Active Jobs"
              value={String(kpis?.active_jobs ?? 0)}
              icon={<Package className="h-5 w-5" />}
              color="#f59e0b"
              href={entities.find(e => e.name.includes('job'))
                ? `/${entities.find(e => e.name.includes('job'))!.name}`
                : '/'}
            />
            <KPICard
              title="Pending Dispatch"
              value={String(kpis?.pending_dispatch ?? 0)}
              icon={<TrendingUp className="h-5 w-5" />}
              color="#10b981"
              href="/"
            />
            <KPICard
              title="Revenue MTD"
              value={formatCurrency(kpis?.revenue_mtd ?? 0)}
              icon={<Users className="h-5 w-5" />}
              color="#ef4444"
              href="/"
            />
          </>
        )}
      </div>

      {/* Entity quick access */}
      {entities.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {entities.map(entity => (
              <Link
                key={entity.id}
                href={`/${entity.name}`}
                className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
              >
                <span className="text-2xl">{entity.icon}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{entity.display_name}</p>
                  <p className="text-xs text-muted-foreground">View all</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {entities.length === 0 && !loading && (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">🏭</div>
          <p className="font-medium">No entities yet</p>
          <p className="text-sm mt-1">Press <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs">⌘K</kbd> to ask the AI to set up your ERP</p>
        </div>
      )}
    </div>
  )
}

function KPICard({
  title,
  value,
  icon,
  color,
  href,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: string
  href: string
}) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm">{title}</span>
        <span style={{ color }} className="opacity-70 group-hover:opacity-100 transition-opacity">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </Link>
  )
}
