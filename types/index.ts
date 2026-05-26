// ─── Core domain types ───────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multi_select'
  | 'relation'
  | 'file'
  | 'image'
  | 'formula'
  | 'auto_number'
  | 'currency'

export type ViewType = 'list' | 'kanban' | 'calendar' | 'form'

export type RecordSource = 'user' | 'ai' | 'automation'

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed'

// ─── Database row types ───────────────────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  industry: string
  plan: string
  whatsapp_phone_id: string | null
  whatsapp_access_token: string | null
  onboarding_completed: boolean
  created_at: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface Entity {
  id: string
  tenant_id: string
  name: string          // snake_case, e.g. "sales_orders"
  display_name: string  // e.g. "Sales Orders"
  icon: string
  color: string
  is_system: boolean
  sort_order: number
  created_at: string
}

export interface SelectOption {
  value: string
  label: string
  color?: string
}

export interface FieldUIConfig {
  width?: number
  hidden?: boolean
  readonly?: boolean
  placeholder?: string
  prefix?: string   // e.g. "₹" for currency
  suffix?: string
  format?: string   // for date fields
}

export interface Field {
  id: string
  tenant_id: string
  entity_id: string
  name: string
  display_name: string
  type: FieldType
  required: boolean
  default_value: unknown
  options: SelectOption[] | null
  relation_entity_id: string | null
  ui_config: FieldUIConfig
  sort_order: number
  is_system: boolean
  created_at: string
}

export interface AppRecord {
  id: string
  tenant_id: string
  entity_id: string
  data: RecordData
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type RecordData = { [key: string]: unknown }

export interface EventLogEntry {
  id: string
  tenant_id: string
  user_id: string | null
  event_type: string
  entity_id: string | null
  record_id: string | null
  before_state: unknown
  after_state: unknown
  source: RecordSource
  created_at: string
}

export interface WorkflowTrigger {
  type: 'record_created' | 'record_updated' | 'record_status_change' | 'scheduled' | 'manual'
  entity: string
  conditions?: WorkflowCondition[]
  from_status?: string
  to_status?: string
  cron?: string
}

export interface WorkflowCondition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains'
  value: unknown
}

export interface WorkflowStep {
  id: string
  type: 'create_record' | 'update_record' | 'send_notification' | 'send_whatsapp' | 'send_email' | 'webhook' | 'ai_action'
  label?: string
  config: Record<string, unknown>
}

export interface Workflow {
  id: string
  tenant_id: string
  name: string
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
  is_active: boolean
  created_at: string
}

export interface UIView {
  id: string
  tenant_id: string
  entity_id: string
  name: string
  view_type: ViewType
  config: UIViewConfig
  is_default: boolean
  created_at: string
}

export interface UIViewConfig {
  columns?: string[]        // visible field names in order
  filters?: ViewFilter[]
  sort?: ViewSort[]
  group_by?: string         // field name for kanban grouping
  date_field?: string       // field name for calendar view
}

export interface ViewFilter {
  field: string
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'is_empty' | 'is_not_empty'
  value: unknown
}

export interface ViewSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface Dashboard {
  id: string
  tenant_id: string
  name: string
  is_home: boolean
  layout: unknown[]
  created_at: string
}

export interface DashboardWidget {
  id: string
  dashboard_id: string
  type: 'number_card' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'table'
  config: WidgetConfig
  position: { x: number; y: number; w: number; h: number }
  created_at: string
}

export interface WidgetConfig {
  title: string
  entity?: string
  field?: string
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  filter?: ViewFilter[]
  group_by?: string
  color?: string
}

// ─── AI types ─────────────────────────────────────────────────────────────────

export type AIIntent =
  | 'READ'
  | 'WRITE'
  | 'MUTATE_SCHEMA'
  | 'MUTATE_WORKFLOW'
  | 'MUTATE_UI'
  | 'ANALYZE'
  | 'NAVIGATE'
  | 'UNDO'
  | 'EXPORT'

export interface AIActionResult {
  intent: AIIntent
  confirmation_message: string
  action: AIAction
  display?: AIDisplay
}

export interface AIAction {
  type: string
  payload: unknown
}

export interface AIDisplay {
  type: 'table' | 'form' | 'insight_card' | 'workflow_diagram' | 'navigate' | 'message'
  data: unknown
}

export interface OnboardingMessage {
  role: 'assistant' | 'user'
  content: string
}

export interface ExtractedSchema {
  entities: ExtractedEntity[]
  workflows: ExtractedWorkflow[]
}

export interface ExtractedEntity {
  name: string
  display_name: string
  icon: string
  color: string
  fields: ExtractedField[]
}

export interface ExtractedField {
  name: string
  display_name: string
  type: FieldType
  required?: boolean
  options?: SelectOption[]
  relation_entity?: string
}

export interface ExtractedWorkflow {
  name: string
  description: string
  trigger_entity: string
  trigger_type: WorkflowTrigger['type']
  steps_description: string[]
}

// ─── App state types ───────────────────────────────────────────────────────────

export interface AppState {
  tenant: Tenant | null
  entities: Entity[]
  commandBarOpen: boolean
  lastAIAction: AIActionResult | null
}
