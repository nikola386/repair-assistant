import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth.config'
import { userStorage } from '@/lib/userStorage'

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const user = await userStorage.findById(session.user.id)
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user as any).role,
    isActive: (user as any).isActive,
    storeId: user.storeId,
  })
}

