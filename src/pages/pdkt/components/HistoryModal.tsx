import React from 'react';
import { SessionHistory } from '../types';
import { Trash2, Eye, Clock, Calendar } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionHistory[];
  onSelectSession: (session: SessionHistory) => void;
  onDeleteSession: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectSession,
  onDeleteSession,
  onClearHistory
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
      <div className="bg-ios-card-light/90 dark:bg-ios-card-dark/90 backdrop-blur-2xl w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col border border-white/20 dark:border-white/10 overflow-hidden ring-1 ring-black/5">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-ios-card-light dark:bg-ios-card-dark z-20 shrink-0">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl shadow-inner">📜</span>
            Riwayat Simulasi
          </h2>
          <div className="flex items-center gap-2">
             {history.length > 0 && (
                <button 
                    onClick={() => {
                        if(confirm('Apakah Anda yakin ingin menghapus semua riwayat?')) onClearHistory();
                    }}
                    className="text-red-500 hover:text-red-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    Hapus Semua
                </button>
             )}
             <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl transition-all p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 w-10 h-10 flex items-center justify-center active:scale-90">&times;</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-ios-bg-light dark:bg-ios-bg-dark">
            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Belum Ada Riwayat</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Selesaikan simulasi pertama Anda untuk melihatnya di sini.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map((session) => (
                        <div key={session.id} className="bg-ios-card-light dark:bg-ios-card-dark p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${session.evaluation ? (session.evaluation.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : session.evaluation.score >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400') : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            {session.evaluation ? `Skor: ${session.evaluation.score}` : 'Belum Dievaluasi'}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(session.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug">
                                        {session.emails.length > 0 ? session.emails[session.emails.length - 1].subject : 'Tanpa Subjek'}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => onSelectSession(session)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="Lihat Detail"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => onDeleteSession(session.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-3">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-100 dark:border-white/5">
                                    <span>👤</span>
                                    {session.config.consumerType.name}
                                </div>
                                {session.config.scenarios.slice(0, 2).map(s => (
                                    <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-100 dark:border-white/5 truncate max-w-[150px]">
                                        <span>🏷️</span>
                                        {s.title}
                                    </div>
                                ))}
                                {session.config.scenarios.length > 2 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-500 px-2 py-1">
                                        +{session.config.scenarios.length - 2} lainnya
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
