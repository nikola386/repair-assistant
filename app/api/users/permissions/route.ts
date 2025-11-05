import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { getUserPermissions } from '@/lib/permission-helpers'

export async function GET(request: NextRequest) {
  const { session, response } = await requireAuthAndPermission(
    request,
    Permission.VIEW_USERS
  )
  
  if (response) return response

  const permissionParam = request.nextUrl.searchParams.get('permission')
  
  if (permissionParam) {
    // Check specific permission
    const permissions = await getUserPermissions(session.user.id)
    const hasPermission = permissions.includes(permissionParam as Permission)
    
    return NextResponse.json({ hasPermission })
  }

  // Return all permissions
  const permissions = await getUserPermissions(session.user.id)
  return NextResponse.json({ permissions })
}

