-- Auto-number increment function (atomic)
create or replace function increment_auto_number(
  p_tenant_id uuid,
  p_entity_id uuid,
  p_field_name text
)
returns int as $$
declare
  v_next int;
begin
  insert into auto_number_counters (tenant_id, entity_id, field_name, current_value)
  values (p_tenant_id, p_entity_id, p_field_name, 1)
  on conflict (entity_id, field_name)
  do update set current_value = auto_number_counters.current_value + 1
  returning current_value into v_next;

  return v_next;
end;
$$ language plpgsql security definer;

-- RLS on auto_number_counters (called via service role function only)
create policy "counters_rpc" on auto_number_counters
  for all using (tenant_id = current_tenant_id());

-- GIN index for JSONB data queries
create index if not exists records_data_gin on records using gin(data);
create index if not exists records_tenant_entity on records(tenant_id, entity_id);
create index if not exists records_deleted on records(deleted_at) where deleted_at is null;
create index if not exists event_log_tenant_user on event_log(tenant_id, user_id, created_at desc);
create index if not exists event_log_record on event_log(record_id, created_at desc);
