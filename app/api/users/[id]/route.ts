import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndPermission } from '@/lib/api-middleware'
import { Permission } from '@/lib/permissions'
import { userStorage } from '@/lib/userStorage'
import { z } from 'zod'
import type { UserRole } from '@prisma/client'

const updateSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  name: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, response } = await requireAuthAndPermission(
    request,
    Permission.EDIT_USERS
  )
  
  if (response) return response

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const targetUser = await userStorage.findById(params.id)
    
    if (!targetUser || targetUser.storeId !== session.user.storeId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (targetUser.id === session.user.id) {
      if (data.role !== undefined || data.isActive === false) {
        return NextResponse.json(
          { error: 'Cannot modify your own role or deactivate yourself' },
          { status: 400 }
        )
      }
    }

    const updateData: {
      role?: UserRole
      isActive?: boolean
      name?: string
    } = {
      ...data,
      role: data.role as UserRole | undefined,
    }
    const updatedUser = await userStorage.update(params.id, updateData)

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
    })
  } catch (error) {
    console.error('Update user error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, response } = await requireAuthAndPermission(
    request,
    Permission.DELETE_USERS
  )
  
  if (response) return response

  try {
    const targetUser = await userStorage.findById(params.id)
    
    if (!targetUser || targetUser.storeId !== session.user.storeId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    await userStorage.update(params.id, { isActive: false })

    return NextResponse.json({ message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

