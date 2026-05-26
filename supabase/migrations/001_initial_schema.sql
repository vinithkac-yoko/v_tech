-- v_tech initial schema
-- All tables include tenant_id for future multi-tenancy via RLS

create extension if not exists "uuid-ossp";

-- Tenants
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text default 'manufacturing',
  plan text default 'starter',
  whatsapp_phone_id text,
  whatsapp_access_token text,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

-- Maps auth.users to tenants
create table tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner', -- owner, admin, member, viewer
  created_at timestamptz default now(),
  unique(tenant_id, user_id)
);

-- Business entities (dynamic: Orders, Jobs, Machines, etc.)
create table entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,           -- snake_case internal key, e.g. "sales_orders"
  display_name text not null,   -- human label, e.g. "Sales Orders"
  icon text default '📦',
  color text default '#6366f1',
  is_system boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique(tenant_id, name)
);

-- Fields per entity
create table fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  name text not null,           -- snake_case, e.g. "customer_name"
  display_name text not null,
  type text not null,           -- text | long_text | number | decimal | boolean | date | datetime
                                -- select | multi_select | relation | file | image | formula | auto_number
  required boolean default false,
  default_value jsonb,
  options jsonb,                -- [{value, label, color}] for select fields
  relation_entity_id uuid references entities(id),
  ui_config jsonb default '{}', -- {width, hidden, readonly, placeholder, ...}
  sort_order int default 0,
  is_system boolean default false,
  created_at timestamptz default now(),
  unique(entity_id, name)
);

-- Universal record store — all business data lives here
create table records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz         -- soft delete
);

-- Auto-increment counters per entity (for auto_number fields like JOB-001)
create table auto_number_counters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  field_name text not null,
  current_value int not null default 0,
  unique(entity_id, field_name)
);

-- Audit log — every mutation logged here for undo and history
create table event_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id),
  event_type text not null,     -- create_record | update_record | delete_record
                                -- create_entity | create_field | update_field
                                -- create_workflow | run_automation
  entity_id uuid references entities(id),
  record_id uuid,
  before_state jsonb,
  after_state jsonb,
  source text not null default 'user',  -- user | ai | automation
  created_at timestamptz default now()
);

-- Workflow definitions (DAG stored as JSON)
create table workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  trigger jsonb not null,       -- {type, entity, conditions}
  steps jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Workflow execution history
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  trigger_record_id uuid,
  status text not null default 'pending',  -- pending | running | completed | failed
  context jsonb default '{}',
  started_at timestamptz default now(),
  completed_at timestamptz,
  error text
);

-- Saved views per entity (list columns, kanban grouping, filters)
create table ui_views (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  name text not null,
  view_type text not null default 'list',  -- list | kanban | calendar | form
  config jsonb not null default '{}',
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Dashboards
create table dashboards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  is_home boolean default false,
  layout jsonb default '[]',
  created_at timestamptz default now()
);

-- Dashboard widgets
create table dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references dashboards(id) on delete cascade,
  type text not null,           -- number_card | bar_chart | line_chart | pie_chart | table
  config jsonb not null default '{}',
  position jsonb not null default '{"x":0,"y":0,"w":4,"h":2}',
  created_at timestamptz default now()
);

-- Schema version snapshots for rollback
create table schema_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_id uuid references entities(id),
  version int not null,
  snapshot jsonb not null,
  created_at timestamptz default now()
);

-- Usage metering
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  event_type text not null,     -- ai_call | record_created | automation_run | file_upload
  units decimal not null default 1,
  metadata jsonb default '{}',  -- {input_tokens, output_tokens, purpose}
  created_at timestamptz default now()
);

-- Trigger to auto-update records.updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger records_updated_at
  before update on records
  for each row execute function update_updated_at();
