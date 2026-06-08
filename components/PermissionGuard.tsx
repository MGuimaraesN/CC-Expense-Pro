import React, { FC, ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requirePermission?: string;
}

export const PermissionGuard: FC<PermissionGuardProps> = ({ 
  children, 
  allowedRoles, 
  requireAdmin, 
  requireSuperAdmin,
  requirePermission
}) => {
  const { hasRole, hasPermission, isAdmin, isSuperAdmin, user } = usePermissions();

  if (!user) {
    return null; // Or a loading spinner if preferred
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return null;
  }

  return <>{children}</>;
};
