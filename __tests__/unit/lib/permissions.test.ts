import { Permission, UserRole, ROLE_PERMISSIONS, hasPermission, requirePermission } from '@/lib/permissions'

describe('permissions', () => {
  describe('Permission enum', () => {
    it('should have all expected permissions', () => {
      expect(Permission.VIEW_USERS).toBe('users.view')
      expect(Permission.VIEW_TICKETS).toBe('tickets.view')
      expect(Permission.EDIT_TICKETS).toBe('tickets.edit')
      expect(Permission.VIEW_INVENTORY).toBe('inventory.view')
    })
  })

  describe('UserRole enum', () => {
    it('should have all expected roles', () => {
      expect(UserRole.ADMIN).toBe('ADMIN')
      expect(UserRole.MANAGER).toBe('MANAGER')
      expect(UserRole.TECHNICIAN).toBe('TECHNICIAN')
      expect(UserRole.VIEWER).toBe('VIEWER')
    })
  })

  describe('ROLE_PERMISSIONS', () => {
    it('should have permissions for all roles', () => {
      expect(ROLE_PERMISSIONS[UserRole.ADMIN]).toBeDefined()
      expect(ROLE_PERMISSIONS[UserRole.MANAGER]).toBeDefined()
      expect(ROLE_PERMISSIONS[UserRole.TECHNICIAN]).toBeDefined()
      expect(ROLE_PERMISSIONS[UserRole.VIEWER]).toBeDefined()
    })

    it('should have ADMIN with most permissions', () => {
      const adminPermissions = ROLE_PERMISSIONS[UserRole.ADMIN]
      expect(adminPermissions.length).toBeGreaterThan(10)
      expect(adminPermissions).toContain(Permission.VIEW_TICKETS)
      expect(adminPermissions).toContain(Permission.EDIT_TICKETS)
      expect(adminPermissions).toContain(Permission.INVITE_USERS)
    })

    it('should have VIEWER with limited permissions', () => {
      const viewerPermissions = ROLE_PERMISSIONS[UserRole.VIEWER]
      expect(viewerPermissions).toContain(Permission.VIEW_TICKETS)
      expect(viewerPermissions).not.toContain(Permission.EDIT_TICKETS)
      expect(viewerPermissions).not.toContain(Permission.INVITE_USERS)
    })
  })

  describe('hasPermission', () => {
    it('should return true when role has permission', () => {
      expect(hasPermission(UserRole.ADMIN, Permission.VIEW_TICKETS)).toBe(true)
      expect(hasPermission(UserRole.ADMIN, Permission.EDIT_TICKETS)).toBe(true)
    })

    it('should return false when role does not have permission', () => {
      expect(hasPermission(UserRole.VIEWER, Permission.EDIT_TICKETS)).toBe(false)
      expect(hasPermission(UserRole.VIEWER, Permission.INVITE_USERS)).toBe(false)
    })

    it('should return true for MANAGER with ticket permissions', () => {
      expect(hasPermission(UserRole.MANAGER, Permission.VIEW_TICKETS)).toBe(true)
      expect(hasPermission(UserRole.MANAGER, Permission.EDIT_TICKETS)).toBe(true)
    })

    it('should return true for TECHNICIAN with view permissions', () => {
      expect(hasPermission(UserRole.TECHNICIAN, Permission.VIEW_TICKETS)).toBe(true)
      expect(hasPermission(UserRole.TECHNICIAN, Permission.CREATE_TICKETS)).toBe(true)
    })
  })

  describe('requirePermission', () => {
    it('should not throw when role has permission', () => {
      expect(() => requirePermission(UserRole.ADMIN, Permission.VIEW_TICKETS)).not.toThrow()
    })

    it('should throw when role does not have permission', () => {
      expect(() => requirePermission(UserRole.VIEWER, Permission.EDIT_TICKETS)).toThrow()
    })
  })
})

