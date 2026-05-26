import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user has a tenant, if not create one
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', data.user.id)
        .single()

      if (!tenantUser) {
        // Create tenant and link user
        const { data: tenant } = await supabase
          .from('tenants')
          .insert({ name: 'My Business', industry: 'manufacturing' })
          .select()
          .single()

        if (tenant) {
          await supabase.from('tenant_users').insert({
            tenant_id: tenant.id,
            user_id: data.user.id,
            role: 'owner',
          })
        }

        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Check if onboarding is done
      const { data: tenant } = await supabase
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

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
