import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '../services/userService';

export const usePermissions = () => {
  const { data: user } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfile,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  const hasRole = (allowedRoles: string[]) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;
  
  return { hasRole, isSuperAdmin, isAdmin, user };
};
