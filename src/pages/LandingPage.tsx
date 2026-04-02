import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, UserCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ios-bg-dark flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-ios-card-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10 py-4 px-8 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Trainers SuperApp</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 flex flex-col items-center"
        >
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Selamat Datang Di Trainers SuperApp</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Platform Pelatihan Dan Simulasi Kontak OJK 157. Silakan Pilih Jalur Masuk Anda.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {/* Option: Trainer */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login?role=trainer')}
            className="flex flex-col items-center p-10 bg-white dark:bg-ios-card-dark rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all group"
          >
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
              <ShieldCheck className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Masuk Sebagai Trainer</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Kelola Skenario, User, Dan Tinjau Riwayat Global.</p>
          </motion.button>

          {/* Option: Agent */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login?role=agent')}
            className="flex flex-col items-center p-10 bg-white dark:bg-ios-card-dark rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all group"
          >
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
              <UserCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Masuk Sebagai Agent</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Lakukan Simulasi Chat Dan Tingkatkan Kemampuan.</p>
          </motion.button>

          {/* Option: Register */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/register')}
            className="flex flex-col items-center p-10 bg-white dark:bg-ios-card-dark rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all group border-dashed"
          >
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-gray-100 dark:group-hover:bg-gray-500/20 transition-colors">
              <UserPlus className="w-10 h-10 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Daftar Akun Baru</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Belum Memiliki Akun? Daftar Sekarang Di Sini.</p>
          </motion.button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-ios-card-dark border-t border-gray-200 dark:border-white/10 py-8 px-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">
          Made By Fajar & Ratna | Trainer Kontak OJK 157
        </p>
      </footer>
    </div>
  );
}
