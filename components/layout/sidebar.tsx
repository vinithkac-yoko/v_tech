'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, Command, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { entities, openCommandBar, tenant } = useAppStore()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-background transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b px-4 h-14 shrink-0',
        collapsed ? 'justify-center px-0' : 'gap-2'
      )}>
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
          V
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm truncate">{tenant?.name ?? 'v_tech'}</span>
        )}
      </div>

      {/* Command bar trigger */}
      <div className="px-3 py-3">
        <button
          onClick={openCommandBar}
          className={cn(
            'flex items-center gap-2 w-full rounded-md border bg-muted/50 text-muted-foreground text-xs hover:bg-muted transition-colors',
            collapsed ? 'h-8 w-8 p-0 justify-center' : 'h-8 px-2'
          )}
        >
          <Command className="h-3 w-3 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Ask AI...</span>
              <kbd className="bg-background rounded px-1">K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard className="h-4 w-4" />}
          label="Dashboard"
          active={isActive('/dashboard')}
          collapsed={collapsed}
        />

        {entities.length > 0 && (
          <div className="mt-3 mb-1">
            {!collapsed && (
              <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Entities
              </p>
            )}
            {entities
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(entity => (
                <NavItem
                  key={entity.id}
                  href={`/${entity.name}`}
                  icon={<span className="text-sm">{entity.icon}</span>}
                  label={entity.display_name}
                  active={isActive(`/${entity.name}`)}
                  collapsed={collapsed}
                  color={entity.color}
                />
              ))}
          </div>
        )}

        <div className="mt-3">
          {!collapsed && (
            <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              System
            </p>
          )}
          <NavItem
            href="/workflows"
            icon={<Zap className="h-4 w-4" />}
            label="Workflows"
            active={isActive('/workflows')}
            collapsed={collapsed}
          />
          <NavItem
            href="/settings"
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            active={isActive('/settings')}
            collapsed={collapsed}
          />
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  icon,
  label,
  active,
  collapsed,
  color,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
  collapsed: boolean
  color?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center w-10 h-10 p-0'
      )}
      title={collapsed ? label : undefined}
    >
      <span style={active && color ? { color } : undefined}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}
