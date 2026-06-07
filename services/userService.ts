import { UserProfile } from '../types';
import CryptoJS from 'crypto-js';

const STORAGE_KEY_AUTH = 'cc_expense_auth_token';
const API_BASE = '/api';

export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

export const login = async (email: string, password: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE}/profile`);
  if (!res.ok) return false;
  const user = await res.json();
  const inputHash = hashPassword(password);

  if (email === user.email && inputHash === (user.passwordHash || hashPassword("123456"))) {
    const tokenPayload = { email: user.email, expiresAt: Date.now() + (24 * 60 * 60 * 1000) };
    const token = CryptoJS.AES.encrypt(JSON.stringify(tokenPayload), 'secret-key').toString();
    localStorage.setItem(STORAGE_KEY_AUTH, token);
    return true;
  }
  return false;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY_AUTH);
  window.location.reload(); 
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(STORAGE_KEY_AUTH);
  if (!token) return false;

  try {
    const bytes = CryptoJS.AES.decrypt(token, 'secret-key');
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    
    if (decryptedData.expiresAt < Date.now()) {
      logout();
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const res = await fetch(`${API_BASE}/profile`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
};

export const updateUserProfile = async (profile: UserProfile, newPassword?: string) => {
  const updateData = { ...profile };
  if (newPassword) {
    updateData.passwordHash = hashPassword(newPassword);
  }
  const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
};

export const generateBackup = () => {
    console.error("Backup to local file from DB needs specialized backend handler. Disabled in DB mode.");
};

export const restoreBackup = (jsonContent: string): boolean => {
    console.error("Restore from local file to DB needs specialized backend handler. Disabled in DB mode.");
    return false;
};