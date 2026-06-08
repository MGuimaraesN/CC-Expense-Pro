import { useQuery } from '@tanstack/react-query';
import { getUserProfile, isAuthenticated } from '../services/userService';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPERADMIN: ['*'],
  ADMIN: ['dashboard.view', 'transactions.view', 'transactions.create', 'transactions.update', 'transactions.delete', 'cards.view', 'cards.create', 'cards.update', 'cards.delete', 'budgets.view', 'budgets.create', 'budgets.update', 'budgets.delete', 'reports.view', 'imports.create', 'exports.create', 'settings.view', 'settings.update', 'users.view', 'audit.view'],
  MEMBER: ['dashboard.view', 'transactions.view', 'transactions.create', 'cards.view', 'budgets.view'],
  VIEWER: ['dashboard.view', 'transactions.view', 'cards.view', 'budgets.view', 'reports.view']
};

export const usePermissions = () => {
  const { data: user } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated(),
  });
  
  const hasRole = (allowedRoles: string[]) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  const hasPermission = (permission: string) => {
    if (!user || !user.role) return false;
    if (user.role === 'SUPERADMIN') return true;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes('*') || perms.includes(permission);
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;
  
  return { hasRole, hasPermission, isSuperAdmin, isAdmin, user };
};
