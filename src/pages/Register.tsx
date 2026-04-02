import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, ArrowLeft, Shield, User } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'trainer' | 'agent'>('agent');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName || !password) {
      setError('Mohon Isi Seluruh Data.');
      return;
    }

    const result = register(fullName, password, role);
    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ios-bg-dark flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-ios-card-dark rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
      >
        <div className="p-10">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-8 transition-colors font-bold text-sm uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Daftar Akun Baru</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Silakan Lengkapi Data Diri Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input 
                type="text" 
                className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-ios-bg-dark border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Masukkan Username"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                type="password" 
                className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-ios-bg-dark border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-1">Pilih Peran</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('agent')}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                    role === 'agent' 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                    : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-gray-500/5 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-white/10'
                  }`}
                >
                  <User className="w-6 h-6 mb-2" />
                  <span className="font-bold text-sm">Agent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('trainer')}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                    role === 'trainer' 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
                    : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-gray-500/5 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-white/10'
                  }`}
                >
                  <Shield className="w-6 h-6 mb-2" />
                  <span className="font-bold text-sm">Trainer</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center">
                {success}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-5 bg-gray-900 dark:bg-white dark:text-black hover:bg-black dark:hover:bg-gray-100 text-white rounded-2xl font-bold transition-all shadow-xl shadow-gray-900/20 dark:shadow-none flex items-center justify-center gap-3"
            >
              <UserPlus className="w-5 h-5" />
              Daftar Sekarang
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
