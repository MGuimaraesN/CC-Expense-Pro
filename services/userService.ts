import { apiClient, setAuthToken, removeAuthToken, getAuthToken } from './apiClient';

export const login = async (email: string, password: string): Promise<boolean> => {
  try {
    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      setAuthToken(res.token);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const logout = async () => {
  try {
    await apiClient('/auth/logout', { method: 'POST' });
  } catch(e) {}
  removeAuthToken();
  window.location.reload(); 
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const getUserProfile = async () => {
  return apiClient('/auth/me');
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  return apiClient('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
};

export const updateUserProfile = async (profileUpdate: any, newPassword?: string) => {
  if (newPassword && profileUpdate.currentPassword) {
    await changePassword(profileUpdate.currentPassword, newPassword);
  }
  return apiClient('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileUpdate)
  });
};
