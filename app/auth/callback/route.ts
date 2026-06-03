import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error('Session exchange error:', sessionError.message)
      return NextResponse.redirect(`${origin}/login`)
    }

    if (data.user) {
      // Use admin client for tenant operations — bypasses RLS so it works
      // regardless of whether migration 004 has been applied
      const admin = createAdminClient()

      const { data: tenantUser } = await admin
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', data.user.id)
        .single()

      if (!tenantUser) {
        // First login — create tenant and link user
        const { data: tenant, error: tenantError } = await admin
          .from('tenants')
          .insert({ name: 'My Business', industry: 'manufacturing' })
          .select()
          .single()

        if (tenantError || !tenant) {
          console.error('Tenant creation failed:', tenantError?.message)
          return NextResponse.redirect(`${origin}/login`)
        }

        await admin.from('tenant_users').insert({
          tenant_id: tenant.id,
          user_id: data.user.id,
          role: 'owner',
        })

        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Returning user — check if onboarding is complete
      const { data: tenant } = await admin
        .from('tenants')
        .select('onboarding_completed')
        .eq('id', tenantUser.tenant_id)
        .single()

      if (!tenant?.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
