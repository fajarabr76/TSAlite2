import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Trash2, Eye, Calendar, MessageSquare, User, FileText } from 'lucide-react';
import { ChatSession } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ChatSession[];
  onClear: () => void;
  onDelete: (id: string) => void;
  onReview: (session: ChatSession) => void;
}

export default function HistoryModal({ isOpen, onClose, history, onClear, onDelete, onReview }: HistoryModalProps) {
  if (!isOpen) return null;

  const downloadCSV = (session: ChatSession) => {
    let csvContent = "data:text/csv;charset=utf-8,Pengirim,Pesan,Waktu\n";
    session.messages.forEach(m => {
      const sender = m.sender === 'agent' ? 'Agen' : m.sender === 'consumer' ? 'Konsumen' : 'Sistem';
      const text = m.text.replace(/"/g, '""');
      const time = new Date(m.timestamp).toLocaleString();
      csvContent += `"${sender}","${text}","${time}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chat_${session.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [isConfirmingClear, setIsConfirmingClear] = React.useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh] max-h-[85vh] border border-white/20 dark:border-white/10"
      >
        <div className="flex justify-between items-center pt-8 pb-6 px-8 border-b border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-[#1C1C1E]/50 backdrop-blur-xl sticky top-0 z-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              Riwayat Simulasi
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium ml-14">Tinjau kembali performa simulasi Anda.</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-full text-gray-500 dark:text-gray-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-[#F2F2F7] dark:bg-[#000000]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-[#1C1C1E] rounded-[2rem] flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Belum ada riwayat</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-xs mt-2 text-sm">Selesaikan satu sesi simulasi untuk melihat riwayat di sini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {history.map(session => (
                <motion.div 
                  layout
                  key={session.id} 
                  className="bg-white dark:bg-[#1C1C1E] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm border border-gray-200/50 dark:border-white/5 hover:shadow-md transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                        Skenario
                      </span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                        {session.scenarioTitle}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 opacity-70" />
                        <span>{session.consumerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 opacity-70" />
                        <span>{formatDate(session.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 opacity-70" />
                        <span>{session.messages.length} Pesan</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => onReview(session)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Tinjau</span>
                    </button>
                    
                    <button 
                      onClick={() => downloadCSV(session)}
                      className="p-2 bg-gray-100 dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-xl transition-all"
                      title="Download CSV"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(session.id)}
                      className="p-2 bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200/50 dark:border-white/5 flex justify-between items-center bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl">
          {isConfirmingClear ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Yakin hapus semua?</span>
              <button 
                onClick={() => {
                  onClear();
                  setIsConfirmingClear(false);
                }}
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-500/20"
              >
                Ya, Hapus
              </button>
              <button 
                onClick={() => setIsConfirmingClear(false)}
                className="px-4 py-2.5 bg-gray-100 dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3A3A3C] rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Batal
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsConfirmingClear(true)}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Semua</span>
            </button>
          )}
          
          <button 
            onClick={onClose} 
            className="px-8 py-2.5 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-all"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
