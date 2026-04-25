import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, Cpu, CreditCard, Activity, Calendar } from 'lucide-react';
import { getUsageBulanIni } from '../services/usageService';

interface UsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  module: 'ketik' | 'pdkt' | 'telefun' | 'qa-analyzer';
  lastSessionDelta?: number;
  isProcessing?: boolean;
}

export default function UsageModal({ isOpen, onClose, userId, module, lastSessionDelta, isProcessing }: UsageModalProps) {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    setLoading(true);
    const data = await getUsageBulanIni(userId, module);
    setUsage(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsage();
    }
  }, [isOpen, userId, module]);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const now = new Date();
  const currentMonthName = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  const lastDay = new Date(currentYear, now.getMonth() + 1, 0).getDate();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 md:p-8 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Penggunaan Token</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 flex items-center gap-1.5 uppercase tracking-wider">
                   <Calendar className="w-3 h-3" />
                   1 {currentMonthName} - {lastDay} {currentMonthName} {currentYear} WIB
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Last Session Delta Badge */}
              {lastSessionDelta !== undefined && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">Kenaikan Sesi Terakhir</p>
                      <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
                        +Rp {Math.round(lastSessionDelta).toLocaleString('id-ID')}
                        {isProcessing && <span className="text-[10px] ml-2 animate-pulse text-gray-500 italic">(Masih diproses)</span>}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-gray-400">
                  <Activity className="w-10 h-10 animate-spin" />
                  <p className="text-sm font-medium">Memuat data penggunaan...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Total IDR */}
                  <div className="col-span-2 bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 p-6 rounded-3xl border border-green-500/20">
                    <div className="flex items-center gap-3 mb-2">
                       <CreditCard className="w-5 h-5 text-green-500" />
                       <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Estimasi Billing (IDR)</span>
                    </div>
                    <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                      Rp {Math.round(usage?.totalCostIdr || 0).toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Input Tokens */}
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Input Tokens</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{usage?.inputTokens?.toLocaleString() || 0}</p>
                  </div>

                  {/* Output Tokens */}
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Output Tokens</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{usage?.outputTokens?.toLocaleString() || 0}</p>
                  </div>

                  {/* Total Tokens */}
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                       <Cpu className="w-3 h-3 text-blue-500" />
                       <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Tokens</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{usage?.totalTokens?.toLocaleString() || 0}</p>
                  </div>

                  {/* Success Calls */}
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                       <Activity className="w-3 h-3 text-orange-500" />
                       <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Call Sukses</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{usage?.successCalls || 0}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 md:p-8 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/5 text-center">
              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em]">
                Data diperbarui setiap request AI berhasil
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
