const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('cc_expense_auth_token');
export const setAuthToken = (token: string) => localStorage.setItem('cc_expense_auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('cc_expense_auth_token');

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (res.status === 401 && !endpoint.includes('/auth/login')) {
    removeAuthToken();
    window.dispatchEvent(new Event('auth-expired'));
    throw new Error('Unauthorized');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'API Request Failed');
  }

  return data;
};
