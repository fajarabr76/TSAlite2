import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { LogIn, ArrowLeft, Shield, User } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') as 'trainer' | 'agent' | null;

  const handleForgotPassword = () => {
    if (!fullName) {
      setError('Masukkan Nama Lengkap Anda terlebih dahulu.');
      return;
    }
    const result = forgotPassword(fullName);
    if (result.success) {
      alert(result.message);
    } else {
      setError(result.message);
    }
  };

  useEffect(() => {
    if (!roleParam) {
      navigate('/');
    }
  }, [roleParam, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !password) {
      setError('Mohon Isi Nama Dan Password.');
      return;
    }

    const result = login(fullName, password, roleParam || 'agent');
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login Gagal.');
    }
  };

  if (!roleParam) return null;

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

          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              roleParam === 'trainer' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {roleParam === 'trainer' ? <Shield className="w-8 h-8" /> : <User className="w-8 h-8" />}
            </div>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Masuk Sebagai {roleParam.charAt(0).toUpperCase() + roleParam.slice(1)}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Silakan Masukkan Kredensial Anda.</p>
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
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Password</label>
              </div>
              <input 
                type="password" 
                className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-ios-bg-dark border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-end mt-2 mr-1">
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 uppercase tracking-widest"
                >
                  Lupa Password?
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              className={`w-full py-5 text-white rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center gap-3 ${
                roleParam === 'trainer' 
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              <LogIn className="w-5 h-5" />
              Masuk Sekarang
            </button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-2">
             <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest flex flex-col gap-1 items-center text-center opacity-70">
                <span>POWERED BY GOOGLE GEMINI AI</span>
                <span>TRAINERS SUPERAPP MADE BY FAJAR & RATNA</span>
                <span>TRAINER KONTAK OJK 157</span>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
