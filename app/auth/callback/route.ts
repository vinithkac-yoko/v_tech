import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error('Session exchange error:', sessionError.message)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    if (data.user) {
      // Check if user already has a tenant
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', data.user.id)
        .single()

      if (!tenantUser) {
        // First login — create tenant and link user
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({ name: 'My Business', industry: 'manufacturing' })
          .select()
          .single()

        if (tenantError) {
          console.error('Tenant creation failed:', tenantError.message)
          // Redirect with error so user sees something actionable
          return NextResponse.redirect(`${origin}/login?error=tenant_creation_failed`)
        }

        const { error: linkError } = await supabase.from('tenant_users').insert({
          tenant_id: tenant.id,
          user_id: data.user.id,
          role: 'owner',
        })

        if (linkError) {
          console.error('Tenant user link failed:', linkError.message)
          return NextResponse.redirect(`${origin}/login?error=tenant_link_failed`)
        }

        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Returning user — check if onboarding is complete
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
