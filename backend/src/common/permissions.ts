/**
 * RBAC permission keys and ROLE_PERMISSIONS maps (ADMIN / MANAGER / STAFF).
 * Used by PermissionsGuard and seeded into session payloads for the SPA.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  CLIENTS_VIEW: 'clients.view',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_EDIT: 'clients.edit',
  CLIENTS_DEACTIVATE: 'clients.deactivate',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DEACTIVATE: 'suppliers.deactivate',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DEACTIVATE: 'products.deactivate',
  TRANSACTIONS_VIEW: 'transactions.view',
  TRANSACTIONS_CREATE: 'transactions.create',
  TRANSACTIONS_REVERSE: 'transactions.reverse',
  REPORTS_OPERATIONAL: 'reports.operational',
  REPORTS_MANAGEMENT: 'reports.management',
  REPORTS_EXPORT: 'reports.export',
  USERS_MANAGE: 'users.manage',
  ROLES_ASSIGN: 'roles.assign',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: { key: PermissionKey; description: string }[] = [
  { key: PERMISSIONS.DASHBOARD_VIEW, description: 'View the dashboard' },
  { key: PERMISSIONS.CLIENTS_VIEW, description: 'View clients' },
  { key: PERMISSIONS.CLIENTS_CREATE, description: 'Create clients' },
  { key: PERMISSIONS.CLIENTS_EDIT, description: 'Edit clients' },
  {
    key: PERMISSIONS.CLIENTS_DEACTIVATE,
    description: 'Deactivate and reactivate clients',
  },
  { key: PERMISSIONS.SUPPLIERS_VIEW, description: 'View suppliers' },
  { key: PERMISSIONS.SUPPLIERS_CREATE, description: 'Create suppliers' },
  { key: PERMISSIONS.SUPPLIERS_EDIT, description: 'Edit suppliers' },
  {
    key: PERMISSIONS.SUPPLIERS_DEACTIVATE,
    description: 'Deactivate and reactivate suppliers',
  },
  { key: PERMISSIONS.PRODUCTS_VIEW, description: 'View products' },
  { key: PERMISSIONS.PRODUCTS_CREATE, description: 'Create products' },
  { key: PERMISSIONS.PRODUCTS_EDIT, description: 'Edit products' },
  {
    key: PERMISSIONS.PRODUCTS_DEACTIVATE,
    description: 'Deactivate and reactivate products',
  },
  { key: PERMISSIONS.TRANSACTIONS_VIEW, description: 'View transactions' },
  { key: PERMISSIONS.TRANSACTIONS_CREATE, description: 'Record transactions' },
  {
    key: PERMISSIONS.TRANSACTIONS_REVERSE,
    description: 'Reverse a recorded transaction',
  },
  {
    key: PERMISSIONS.REPORTS_OPERATIONAL,
    description: 'View operational reports',
  },
  {
    key: PERMISSIONS.REPORTS_MANAGEMENT,
    description: 'View management reports and analytics',
  },
  { key: PERMISSIONS.REPORTS_EXPORT, description: 'Export reports' },
  { key: PERMISSIONS.USERS_MANAGE, description: 'Manage user accounts' },
  { key: PERMISSIONS.ROLES_ASSIGN, description: 'Assign roles' },
  { key: PERMISSIONS.SETTINGS_MANAGE, description: 'Manage system settings' },
  { key: PERMISSIONS.AUDIT_VIEW, description: 'View audit logs' },
];

const STAFF: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.CLIENTS_VIEW,
  PERMISSIONS.CLIENTS_CREATE,
  PERMISSIONS.CLIENTS_EDIT,
  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.SUPPLIERS_CREATE,
  PERMISSIONS.SUPPLIERS_EDIT,
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.TRANSACTIONS_VIEW,
  PERMISSIONS.TRANSACTIONS_CREATE,
  PERMISSIONS.REPORTS_OPERATIONAL,
  PERMISSIONS.REPORTS_EXPORT,
];

const MANAGER_EXCLUDED = new Set<PermissionKey>([
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.ROLES_ASSIGN,
  PERMISSIONS.SETTINGS_MANAGE,
]);

export const ROLE_PERMISSIONS: Record<
  'ADMIN' | 'MANAGER' | 'STAFF',
  PermissionKey[]
> = {
  ADMIN: ALL_PERMISSIONS.map((item) => item.key),
  MANAGER: ALL_PERMISSIONS.map((item) => item.key).filter(
    (key) => !MANAGER_EXCLUDED.has(key),
  ),
  STAFF,
};
