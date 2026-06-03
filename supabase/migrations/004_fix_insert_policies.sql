-- Fix: missing INSERT policies prevent tenant creation during signup
--
-- The original policies only covered SELECT/UPDATE, so the auth callback
-- could not create a tenant or link the user to it on first login.

-- Allow any authenticated user to create a new tenant (signup flow)
create policy "tenant_insert" on tenants
  for insert with check (auth.uid() is not null);

-- Drop the old tenant_users insert policy — it checked current_tenant_id()
-- which returns NULL for brand-new users who have no tenant yet,
-- so it blocked every first-time insert.
drop policy if exists "tenant_users_insert" on tenant_users;

-- New policy: a user may insert a tenant_users row only for themselves
create policy "tenant_users_insert" on tenant_users
  for insert with check (user_id = auth.uid());
