import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportToExcel } from '@/lib/export/excel'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tenantUser } = await supabase
    .from('tenant_users').select('tenant_id').eq('user_id', user.id).single()
  if (!tenantUser) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const entityName = searchParams.get('entity')
  if (!entityName) return NextResponse.json({ error: 'entity required' }, { status: 400 })

  const { data: entity } = await supabase
    .from('entities').select('*').eq('tenant_id', tenantUser.tenant_id).eq('name', entityName).single()
  if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 })

  const [{ data: fields }, { data: records }] = await Promise.all([
    supabase.from('fields').select('*').eq('entity_id', entity.id).order('sort_order'),
    supabase.from('records').select('*').eq('entity_id', entity.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(10000),
  ])

  const blob = exportToExcel(records ?? [], fields ?? [], entity.display_name)
  const buffer = await blob.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${entity.display_name}-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}
