import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Auth Service ---
export const login = (credentials: any) => apiClient.post('/auth/login', credentials);
export const register = (userData: any) => apiClient.post('/auth/register', userData);

// --- Transaction Service ---
export const getTransactions = (filters: any = {}) => apiClient.get('/transactions', { params: filters });
export const createTransaction = (data: any) => apiClient.post('/transactions', data);

// --- Card Service ---
export const getCards = () => apiClient.get('/cards');

// --- Dashboard Service ---
export const getDashboardStats = () => apiClient.get('/dashboard/stats');

// --- News Service ---
export const searchNews = (query: string) => apiClient.get(`/news/search?q=${query}`);

export default apiClient;
