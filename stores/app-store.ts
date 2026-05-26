import { create } from 'zustand'
import type { Tenant, Entity, Field, AIActionResult } from '@/types'

interface AppStore {
  // Tenant
  tenant: Tenant | null
  setTenant: (tenant: Tenant | null) => void

  // Schema
  entities: Entity[]
  fields: Field[]
  setEntities: (entities: Entity[]) => void
  setFields: (fields: Field[]) => void
  addEntity: (entity: Entity) => void
  addField: (field: Field) => void

  // Command bar
  commandBarOpen: boolean
  openCommandBar: () => void
  closeCommandBar: () => void
  commandHistory: string[]
  addToHistory: (command: string) => void

  // Last AI action (for undo)
  lastAIAction: AIActionResult | null
  setLastAIAction: (action: AIActionResult | null) => void

  // Current view context
  currentEntity: string | null
  setCurrentEntity: (entity: string | null) => void

  // Toast notifications
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

export const useAppStore = create<AppStore>((set, get) => ({
  tenant: null,
  setTenant: (tenant) => set({ tenant }),

  entities: [],
  fields: [],
  setEntities: (entities) => set({ entities }),
  setFields: (fields) => set({ fields }),
  addEntity: (entity) => set(s => ({ entities: [...s.entities, entity] })),
  addField: (field) => set(s => ({ fields: [...s.fields, field] })),

  commandBarOpen: false,
  openCommandBar: () => set({ commandBarOpen: true }),
  closeCommandBar: () => set({ commandBarOpen: false }),
  commandHistory: [],
  addToHistory: (command) => set(s => ({
    commandHistory: [...s.commandHistory.slice(-19), command],
  })),

  lastAIAction: null,
  setLastAIAction: (action) => set({ lastAIAction: action }),

  currentEntity: null,
  setCurrentEntity: (entity) => set({ currentEntity: entity }),

  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID()
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
