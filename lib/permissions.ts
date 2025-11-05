export enum Permission {
  // User Management
  VIEW_USERS = 'users.view',
  INVITE_USERS = 'users.invite',
  EDIT_USERS = 'users.edit',
  DELETE_USERS = 'users.delete',
  
  // Store Settings
  VIEW_SETTINGS = 'settings.view',
  EDIT_SETTINGS = 'settings.edit',
  
  // Tickets
  VIEW_TICKETS = 'tickets.view',
  CREATE_TICKETS = 'tickets.create',
  EDIT_TICKETS = 'tickets.edit',
  DELETE_TICKETS = 'tickets.delete',
  ASSIGN_TICKETS = 'tickets.assign',
  
  // Customers
  VIEW_CUSTOMERS = 'customers.view',
  CREATE_CUSTOMERS = 'customers.create',
  EDIT_CUSTOMERS = 'customers.edit',
  DELETE_CUSTOMERS = 'customers.delete',
  
  // Inventory
  VIEW_INVENTORY = 'inventory.view',
  CREATE_INVENTORY = 'inventory.create',
  EDIT_INVENTORY = 'inventory.edit',
  DELETE_INVENTORY = 'inventory.delete',
  
  // Reports
  VIEW_REPORTS = 'reports.view',
  EXPORT_REPORTS = 'reports.export',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  VIEWER = 'VIEWER',
}

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access except cannot delete users (reserved for migration/cleanup)
    Permission.VIEW_USERS,
    Permission.INVITE_USERS,
    Permission.EDIT_USERS,
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.DELETE_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.EDIT_CUSTOMERS,
    Permission.DELETE_CUSTOMERS,
    Permission.VIEW_INVENTORY,
    Permission.CREATE_INVENTORY,
    Permission.EDIT_INVENTORY,
    Permission.DELETE_INVENTORY,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
  ],
  [UserRole.MANAGER]: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.DELETE_TICKETS,
    Permission.ASSIGN_TICKETS,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.EDIT_CUSTOMERS,
    Permission.DELETE_CUSTOMERS,
    Permission.VIEW_INVENTORY,
    Permission.CREATE_INVENTORY,
    Permission.EDIT_INVENTORY,
    Permission.DELETE_INVENTORY,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
  ],
  [UserRole.TECHNICIAN]: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_REPORTS,
  ],
  [UserRole.VIEWER]: [
    Permission.VIEW_TICKETS,
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_REPORTS,
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function requirePermission(
  role: UserRole,
  permission: Permission,
  errorMessage = 'You do not have permission to perform this action'
): void {
  if (!hasPermission(role, permission)) {
    throw new Error(errorMessage)
  }
}

