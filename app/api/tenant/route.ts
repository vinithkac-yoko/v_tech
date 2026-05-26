import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users').select('tenant_id, role').eq('user_id', user.id).single()
  if (!tenantUser) return NextResponse.json({ tenant: null })

  const { data: tenant } = await supabase
    .from('tenants').select('*').eq('id', tenantUser.tenant_id).single()

  return NextResponse.json({ tenant, role: tenantUser.role })
}
