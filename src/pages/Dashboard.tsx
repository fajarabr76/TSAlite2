import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { MessageSquare, Mail, PhoneCall, ChevronRight, BarChart3 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'ketik', title: 'Ketik', icon: MessageSquare, color: 'from-blue-500 to-cyan-400', path: '/ketik', desc: 'Simulasi Chat Teks' },
    { id: 'pdkt', title: 'PDKT', icon: Mail, color: 'from-pink-500 to-rose-400', path: '/pdkt', desc: 'Simulasi Email' },
    { id: 'telefun', title: 'Telefun', icon: PhoneCall, color: 'from-green-500 to-emerald-400', path: '/telefun/app', desc: 'Simulasi Panggilan' },
  ];

  const trainerOnlyItems = [
    { id: 'monitoring', title: 'Monitoring', icon: BarChart3, color: 'from-blue-600 to-indigo-500', path: '/dashboard/monitoring', desc: 'Usage & Token Billing' },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] flex flex-col transition-colors duration-300 font-sans selection:bg-blue-500/30">
      {/* iOS-style Header */}
      <header className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 py-4 px-6 md:px-8 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black dark:from-white dark:to-gray-300 rounded-[10px] flex items-center justify-center shadow-md">
              <span className="text-white dark:text-black font-bold text-xl">T</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Trainers SuperApp</h1>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{user?.fullName}</p>
              <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider mt-1">{user?.role}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-12 w-full flex-1">
        <div className="mb-8 md:mb-12 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Selamat Datang, {user?.fullName}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
            Pilih modul simulasi untuk memulai sesi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(item.path)}
              className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[2rem] shadow-sm hover:shadow-xl dark:shadow-none border border-gray-200/50 dark:border-white/5 flex flex-col items-center text-center group transition-all duration-300 relative overflow-hidden"
            >
              <div className={`w-24 h-24 rounded-[1.5rem] bg-gradient-to-br ${item.color} text-white flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-300`}>
                <item.icon className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">{item.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-6">{item.desc}</p>
              
              <div className="mt-auto flex items-center gap-2 text-blue-500 dark:text-blue-400 font-semibold text-sm bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                <span>Buka Modul</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>
          ))}

          {user?.role === 'trainer' && trainerOnlyItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[2rem] shadow-sm hover:shadow-xl dark:shadow-none border border-blue-500/20 flex flex-col items-center text-center group transition-all duration-300 relative overflow-hidden"
              >
                <div className={`w-24 h-24 rounded-[1.5rem] bg-gradient-to-br ${item.color} text-white flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-300`}>
                  <item.icon className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">{item.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-6">{item.desc}</p>
                
                <div className="mt-auto flex items-center gap-2 text-blue-500 dark:text-blue-400 font-semibold text-sm bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                  <span>Lihat Rekap</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-8 text-center border-t border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur-md">
        <div className="flex flex-col items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-widest opacity-70">
          <p>POWERED BY GOOGLE GEMINI AI</p>
          <p>TRAINERS SUPERAPP MADE BY FAJAR & RATNA</p>
          <p>TRAINER KONTAK OJK 157</p>
          <p className="mt-2 text-blue-500/50 dark:text-blue-400/50 font-black">VERSION 1.0.0 • CHECKPOINT</p>
        </div>
      </footer>
    </div>
  );
}
