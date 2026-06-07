import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getUserProfile, updateUserProfile, hashPassword, generateBackup } from '../services/userService';
import { User, Mail, Link as LinkIcon, Save, CheckCircle, Download, Shield, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', avatarUrl: '', twoFactorEnabled: false });
  const [success, setSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getUserProfile().then(setProfile).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile(profile);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    const savedProfile = await getUserProfile();
    // Use fallback hash for "123456" if not present
    const expectedHash = savedProfile.passwordHash || '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; 
    const currentHash = hashPassword(currentPassword);

    if (currentHash !== expectedHash) {
      setPasswordError('Current password is incorrect.');
      return;
    }

    await updateUserProfile(profile, newPassword);
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  const toggle2FA = () => {
    const updated = { ...profile, twoFactorEnabled: !profile.twoFactorEnabled };
    setProfile(updated);
    updateUserProfile(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Settings</h2>
          <p className="text-sm text-slate-500">Manage your personal information and preferences.</p>
        </div>
        <button 
          onClick={generateBackup}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
        >
          <Download size={18} />
          Download Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
             <div className="flex items-center gap-6 mb-8">
               <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden border-2 border-indigo-200 dark:border-indigo-800 shrink-0">
                 {profile.avatarUrl && !avatarError ? (
                   <img 
                     src={profile.avatarUrl} 
                     alt="Avatar" 
                     className="w-full h-full object-cover" 
                     onError={() => setAvatarError(true)}
                   />
                 ) : (
                   <User size={36} className="text-indigo-600 dark:text-indigo-400" />
                 )}
               </div>
               <div className="w-full">
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Avatar URL</label>
                 <div className="relative">
                   <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     value={profile.avatarUrl}
                     onChange={e => {
                       setProfile({...profile, avatarUrl: e.target.value});
                       setAvatarError(false);
                     }}
                     placeholder="https://example.com/me.jpg"
                     className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   />
                 </div>
               </div>
             </div>

             <form onSubmit={handleSave} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                   <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                       type="text" 
                       value={profile.name}
                       onChange={e => setProfile({...profile, name: e.target.value})}
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                   <div className="relative">
                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                       type="email" 
                       value={profile.email}
                       onChange={e => setProfile({...profile, email: e.target.value})}
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     />
                   </div>
                 </div>
               </div>

               <div className="pt-2">
                 <button 
                   type="submit"
                   className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all w-full sm:w-auto justify-center"
                 >
                   <Save size={18} /> Save Profile Updates
                 </button>
               </div>
             </form>

             {success && (
               <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                 <CheckCircle size={16} /> Profile information updated successfully!
               </div>
             )}
           </div>

           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                 <Lock size={20} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security & Password</h3>
                 <p className="text-sm text-slate-500">Update your password to keep your account secure.</p>
               </div>
             </div>

             <form onSubmit={handleUpdatePassword} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                 <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type={showPassword ? "text" : "password"} 
                     value={currentPassword}
                     onChange={e => setCurrentPassword(e.target.value)}
                     className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   />
                   <button 
                     type="button"
                     onClick={() => setShowPassword(!showPassword)}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                   >
                     {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                   </button>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                       type={showPassword ? "text" : "password"} 
                       value={newPassword}
                       onChange={e => setNewPassword(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     />
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                       type={showPassword ? "text" : "password"} 
                       value={confirmPassword}
                       onChange={e => setConfirmPassword(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                     />
                   </div>
                 </div>
               </div>

               {passwordError && (
                 <div className="text-red-500 flex items-center gap-1.5 text-sm">
                   <AlertCircle size={16} /> {passwordError}
                 </div>
               )}

               <div className="pt-2">
                 <button 
                   type="submit"
                   className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-lg font-medium transition-all w-full sm:w-auto"
                 >
                   Update Password
                 </button>
               </div>

               {passwordSuccess && (
                 <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                   <CheckCircle size={16} /> Password updated successfully!
                 </div>
               )}
             </form>
           </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                 <Shield size={20} />
               </div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Two-Factor Auth</h3>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Authenticator App</p>
                <p className="text-xs text-slate-500">{profile.twoFactorEnabled ? 'Enabled' : 'Not configured'}</p>
              </div>
              <button
                onClick={toggle2FA}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  profile.twoFactorEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span className="sr-only">Toggle 2FA</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    profile.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {profile.twoFactorEnabled && (
                <div className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 flex items-start gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                  <Shield size={16} className="shrink-0 mt-0.5" />
                  <p>Your account is protected. A 2FA code will be required upon next login (mocked).</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};