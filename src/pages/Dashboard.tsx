import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { UserCircle, LogOut, KeyRound, MessageSquare, Mail, PhoneCall, X, ChevronRight, LayoutGrid, Users, History } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Dashboard() {
  const { user, logout, getAllUsers, approveTrainer, changePassword } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'modules' | 'users' | 'history'>('modules');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    const result = changePassword(user?.fullName || '', newPassword);
    if (result.success) {
      alert(result.message);
      setIsChangePasswordOpen(false);
      setNewPassword('');
    }
  };

  const menuItems = [
    { id: 'ketik', title: 'Ketik', icon: MessageSquare, color: 'from-blue-500 to-cyan-400', path: '/ketik', desc: 'Simulasi Chat Teks' },
    { id: 'pdkt', title: 'PDKT', icon: Mail, color: 'from-pink-500 to-rose-400', path: '/pdkt', desc: 'Simulasi Email' },
    { id: 'telefun', title: 'Telefun', icon: PhoneCall, color: 'from-green-500 to-emerald-400', path: '/telefun/app', desc: 'Simulasi Panggilan' },
  ];

  const trainers = getAllUsers().filter(u => u.role === 'trainer');
  const pendingTrainers = trainers.filter(u => u.status === 'pending');
  const approvedTrainers = trainers.filter(u => u.status === 'approved');

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
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsChangePasswordOpen(true)}
                className="p-2.5 rounded-full bg-gray-100 dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-all"
                title="Ganti Password"
              >
                <KeyRound className="w-5 h-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-full bg-gray-100 dark:bg-[#2C2C2E] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                title="Keluar"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* iOS Segmented Control Navigation (Trainer Only) */}
      {user?.role === 'trainer' && (
        <div className="bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur-md border-b border-gray-200/50 dark:border-white/5 px-4 md:px-8 py-3 sticky top-[73px] z-30">
          <div className="max-w-md mx-auto bg-gray-200/50 dark:bg-[#2C2C2E] p-1 rounded-xl flex relative">
            {/* Animated Background for Active Tab */}
            <motion.div 
              className="absolute top-1 bottom-1 bg-white dark:bg-[#636366] rounded-[9px] shadow-sm z-0"
              initial={false}
              animate={{
                left: activeTab === 'modules' ? '4px' : activeTab === 'users' ? '33.33%' : '66.66%',
                width: 'calc(33.33% - 5px)',
                x: activeTab === 'users' ? 2 : activeTab === 'history' ? 2 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            
            <button 
              onClick={() => setActiveTab('modules')}
              className={`flex-1 py-1.5 text-xs md:text-sm font-semibold rounded-lg relative z-10 transition-colors ${
                activeTab === 'modules' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Modul
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-1.5 text-xs md:text-sm font-semibold rounded-lg relative z-10 transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'users' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Users
              {pendingTrainers.length > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full">
                  {pendingTrainers.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 text-xs md:text-sm font-semibold rounded-lg relative z-10 transition-colors ${
                activeTab === 'history' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Riwayat
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-12 w-full flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'modules' && (
            <motion.div 
              key="modules"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
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
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-200/50 dark:border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Menunggu Persetujuan</h2>
                </div>
                
                {pendingTrainers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-[#2C2C2E] rounded-3xl border border-dashed border-gray-200 dark:border-white/5">
                    <p className="text-gray-400 dark:text-gray-500 font-medium">Tidak ada trainer yang menunggu persetujuan.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingTrainers.map(t => (
                      <div key={t.id} className="bg-gray-50 dark:bg-[#2C2C2E] p-5 rounded-2xl flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white dark:bg-[#1C1C1E] rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t.fullName.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{t.fullName}</p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => approveTrainer(t.id)}
                          className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all"
                        >
                          Setujui
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1C1C1E] rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-200/50 dark:border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center text-green-500">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Trainer Terdaftar</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {approvedTrainers.map(t => (
                    <div key={t.id} className="bg-gray-50 dark:bg-[#2C2C2E] p-5 rounded-2xl flex items-center gap-4 border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all">
                      <div className="w-10 h-10 bg-white dark:bg-[#1C1C1E] rounded-full flex items-center justify-center shadow-sm text-gray-400">
                        <UserCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{t.fullName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">Active</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1C1C1E] p-12 rounded-[2.5rem] shadow-sm border border-gray-200/50 dark:border-white/5 text-center max-w-2xl mx-auto mt-8"
            >
              <div className="w-24 h-24 bg-gray-100 dark:bg-[#2C2C2E] rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <History className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">Riwayat Global</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Fitur ini sedang dalam pengembangan untuk menampilkan analisis dan riwayat simulasi dari seluruh agent.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Change Password Modal - iOS Style */}
      <AnimatePresence>
        {isChangePasswordOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-white/20 dark:border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Ganti Password</h3>
                <button 
                  onClick={() => setIsChangePasswordOpen(false)} 
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Password Baru</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] border border-transparent focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Masukkan password..."
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                >
                  Simpan Perubahan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
