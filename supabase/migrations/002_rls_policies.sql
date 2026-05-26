-- Row Level Security policies
-- Every table is isolated by tenant_id via the current user's tenant membership

alter table tenants enable row level security;
alter table tenant_users enable row level security;
alter table entities enable row level security;
alter table fields enable row level security;
alter table records enable row level security;
alter table auto_number_counters enable row level security;
alter table event_log enable row level security;
alter table workflows enable row level security;
alter table workflow_runs enable row level security;
alter table ui_views enable row level security;
alter table dashboards enable row level security;
alter table dashboard_widgets enable row level security;
alter table schema_versions enable row level security;
alter table usage_events enable row level security;

-- Helper: current user's tenant_id
create or replace function current_tenant_id()
returns uuid as $$
  select tenant_id from tenant_users
  where user_id = auth.uid()
  limit 1;
$$ language sql security definer;

-- Tenants: only members can see their own tenant
create policy "tenant_select" on tenants
  for select using (id = current_tenant_id());

create policy "tenant_update" on tenants
  for update using (id = current_tenant_id());

-- Tenant users
create policy "tenant_users_select" on tenant_users
  for select using (tenant_id = current_tenant_id());

create policy "tenant_users_insert" on tenant_users
  for insert with check (tenant_id = current_tenant_id());

-- Entities
create policy "entities_select" on entities
  for select using (tenant_id = current_tenant_id());

create policy "entities_insert" on entities
  for insert with check (tenant_id = current_tenant_id());

create policy "entities_update" on entities
  for update using (tenant_id = current_tenant_id());

create policy "entities_delete" on entities
  for delete using (tenant_id = current_tenant_id());

-- Fields
create policy "fields_select" on fields
  for select using (tenant_id = current_tenant_id());

create policy "fields_insert" on fields
  for insert with check (tenant_id = current_tenant_id());

create policy "fields_update" on fields
  for update using (tenant_id = current_tenant_id());

create policy "fields_delete" on fields
  for delete using (tenant_id = current_tenant_id());

-- Records
create policy "records_select" on records
  for select using (tenant_id = current_tenant_id() and deleted_at is null);

create policy "records_insert" on records
  for insert with check (tenant_id = current_tenant_id());

create policy "records_update" on records
  for update using (tenant_id = current_tenant_id());

-- Auto number counters
create policy "counters_all" on auto_number_counters
  for all using (tenant_id = current_tenant_id());

-- Event log
create policy "event_log_select" on event_log
  for select using (tenant_id = current_tenant_id());

create policy "event_log_insert" on event_log
  for insert with check (tenant_id = current_tenant_id());

-- Workflows
create policy "workflows_all" on workflows
  for all using (tenant_id = current_tenant_id());

-- Workflow runs
create policy "workflow_runs_all" on workflow_runs
  for all using (
    workflow_id in (select id from workflows where tenant_id = current_tenant_id())
  );

-- UI views
create policy "ui_views_all" on ui_views
  for all using (tenant_id = current_tenant_id());

-- Dashboards
create policy "dashboards_all" on dashboards
  for all using (tenant_id = current_tenant_id());

-- Dashboard widgets
create policy "dashboard_widgets_all" on dashboard_widgets
  for all using (
    dashboard_id in (select id from dashboards where tenant_id = current_tenant_id())
  );

-- Schema versions
create policy "schema_versions_all" on schema_versions
  for all using (tenant_id = current_tenant_id());

-- Usage events
create policy "usage_events_all" on usage_events
  for all using (tenant_id = current_tenant_id());
