import React, { useState, useEffect, useRef } from 'react';
import { EmailMessage, SessionConfig, EvaluationResult } from '../types';

interface EmailInterfaceProps {
  emails: EmailMessage[];
  onSendReply: (text: string) => void;
  isLoading: boolean;
  config: SessionConfig;
  onEndSession: () => void;
  evaluation: EvaluationResult | null;
  timeTaken: number | null;
}

export const EmailInterface: React.FC<EmailInterfaceProps> = ({ 
  emails, 
  onSendReply, 
  isLoading, 
  config,
  onEndSession,
  evaluation,
  timeTaken
}) => {
  const [replyText, setReplyText] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [emails, isDrafting, evaluation]);

  const handleSend = () => {
    if (!replyText.trim()) return;
    onSendReply(replyText);
    setReplyText('');
    setIsDrafting(false);
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} detik`;
    return `${mins} menit ${secs} detik`;
  };

  const latestSubject = emails.length > 0 
    ? emails[emails.length - 1].subject 
    : (isLoading ? "Tiket Baru Masuk..." : "No Subject");
    
  const hasAgentReplied = emails.some(e => e.isAgent);

  return (
    <div className="flex flex-col h-full bg-ios-bg-light dark:bg-ios-bg-dark w-full max-w-5xl mx-auto shadow-2xl rounded-none md:rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 relative transition-colors duration-300">
      
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer transition-opacity"
          onClick={() => setZoomedImage(null)}
        >
          <img src={zoomedImage} alt="Zoomed Attachment" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain ring-1 ring-white/10" />
          <button className="absolute top-6 right-6 text-white/50 hover:text-white text-4xl transition-colors">&times;</button>
        </div>
      )}

      <div className="bg-ios-card-light/80 dark:bg-ios-card-dark/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 p-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4 flex-1 min-w-0">
            <button onClick={onEndSession} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
            <div className="flex flex-col flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-snug break-words tracking-tight">
                  {latestSubject}
              </h1>
            </div>
            <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ml-2 hidden md:inline flex-shrink-0 border border-blue-100 dark:border-blue-500/20">
                Inbox
            </span>
        </div>
        <div className="flex gap-3 flex-shrink-0 ml-4">
            <button onClick={onEndSession} className="bg-ios-card-light dark:bg-ios-card-dark text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm whitespace-nowrap transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tutup Tiket
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-ios-bg-light dark:bg-ios-bg-dark">
        {emails.map((email) => (
            <div key={email.id} className={`flex w-full ${email.isAgent ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col w-full max-w-[95%] md:max-w-[85%]`}>
                    <div className={`rounded-3xl border p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 bg-ios-card-light dark:bg-ios-card-dark border-gray-200 dark:border-white/10 ${email.isAgent ? 'rounded-tr-xl' : 'rounded-tl-xl'}`}>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 dark:border-gray-800/50 pb-5">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${email.isAgent ? 'bg-gradient-to-br from-gray-800 to-black dark:from-gray-100 dark:to-white text-white dark:text-black' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}`}>
                                    {email.isAgent ? 'CS' : getInitials(config.identity.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 dark:text-white text-base md:text-lg tracking-tight truncate">
                                        {email.isAgent ? 'Customer Service (Anda)' : config.identity.name}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                        {email.isAgent ? 'konsumen@ojk.go.id' : email.from}
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0 text-left sm:text-right">
                                <div>{email.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                <div className="mt-0.5">{email.timestamp.toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-snug">
                                {email.subject}
                            </h3>
                        </div>

                        <div className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-[1.8]">
                            {email.body}
                        </div>

                        {email.attachments && email.attachments.length > 0 && (
                          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800/50">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {email.attachments.length} Lampiran Bukti
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {email.attachments.map((imgBase64, index) => (
                                  <div 
                                    key={index}
                                    className="relative group w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 cursor-zoom-in hover:shadow-lg hover:border-blue-500/50 transition-all"
                                    onClick={() => setZoomedImage(`data:image/png;base64,${imgBase64}`)}
                                  >
                                    <img 
                                        src={`data:image/png;base64,${imgBase64}`} 
                                        alt={`Bukti Lampiran ${index + 1}`} 
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center backdrop-blur-[2px] opacity-0 group-hover:opacity-100">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white transform scale-50 group-hover:scale-100 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                        </svg>
                                    </div>
                                  </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                </div>
            </div>
        ))}

        {isLoading && (
            <div className="flex flex-col items-center justify-center p-10 bg-ios-card-light/50 dark:bg-ios-card-dark/50 backdrop-blur-sm rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <div className="relative w-12 h-12 mb-6">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                {emails.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide text-sm uppercase">Sedang memeriksa email...</p>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide text-sm uppercase">Sedang Mengecek Jawaban...</p>
                )}
            </div>
        )}

        {evaluation && (
            <div className="bg-ios-card-light dark:bg-ios-card-dark rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <h3 className="text-lg font-bold flex items-center gap-3 relative z-10 tracking-tight">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        Hasil Evaluasi Jawaban
                    </h3>
                    <div className="flex items-center gap-3 bg-black/20 px-5 py-2 rounded-2xl backdrop-blur-md relative z-10 border border-white/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/70">Skor</span>
                        <span className={`text-2xl font-black tracking-tighter ${evaluation.score >= 80 ? 'text-emerald-400' : evaluation.score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {evaluation.score}%
                        </span>
                    </div>
                </div>
                
                <div className="p-6 md:p-8 grid gap-6 md:grid-cols-2 items-stretch">
                    <div className="flex flex-col gap-6">
                        <div className="bg-rose-50/50 dark:bg-rose-500/5 p-5 rounded-2xl border border-rose-100 dark:border-rose-500/10">
                            <h4 className="font-bold text-rose-700 dark:text-rose-400 text-sm mb-3 flex items-center gap-2 tracking-tight">
                                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                                Typo / Salah Ketik ({evaluation.typos.length})
                            </h4>
                            {evaluation.typos.length > 0 ? (
                                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                                    {evaluation.typos.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-500 italic">Tidak ditemukan typo.</p>
                            )}
                        </div>

                        <div className="bg-amber-50/50 dark:bg-amber-500/5 p-5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                            <h4 className="font-bold text-amber-700 dark:text-amber-400 text-sm mb-3 flex items-center gap-2 tracking-tight">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                                Kejelasan Informasi / Kalimat ({evaluation.clarityIssues.length})
                            </h4>
                             {evaluation.clarityIssues.length > 0 ? (
                                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                                    {evaluation.clarityIssues.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-500 italic">Kalimat sudah jelas & efektif.</p>
                            )}
                        </div>

                        {timeTaken !== null && (
                            <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                                <h4 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mb-3 flex items-center gap-2 tracking-tight">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                    Waktu Pengerjaan
                                </h4>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                                        {formatTime(timeTaken)}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                                        Total Durasi
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">
                                    Dihitung sejak email diterima hingga balasan dikirim.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-6">
                         <div className="bg-blue-50/50 dark:bg-blue-500/5 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                            <h4 className="font-bold text-blue-700 dark:text-blue-400 text-sm mb-3 flex items-center gap-2 tracking-tight">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                                Relevansi & Solusi ({evaluation.contentGaps.length})
                            </h4>
                            {evaluation.contentGaps.length > 0 ? (
                                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                                    {evaluation.contentGaps.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-500 italic">Jawaban relevan & solutif.</p>
                            )}
                        </div>

                         <div className="bg-indigo-50/50 dark:bg-indigo-500/5 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 flex-1">
                            <h4 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm mb-3 tracking-tight">Masukan & Saran</h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">"{evaluation.feedback}"</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 flex justify-center">
                    <button onClick={onEndSession} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-10 py-4 rounded-2xl hover:bg-black dark:hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 font-bold text-base tracking-wide flex items-center gap-3">
                        <span>Selesai & Tutup Tiket</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                </div>
            </div>
        )}
        
        <div ref={bottomRef} className="h-4" />
      </div>

      <div className={`p-4 md:p-6 sticky bottom-0 z-30 transition-all duration-300 ${evaluation ? 'bg-transparent' : 'bg-ios-card-light/80 dark:bg-ios-card-dark/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10'}`}>
        {!hasAgentReplied && !evaluation ? (
            !isDrafting ? (
                 <button 
                    onClick={() => setIsDrafting(true)}
                    disabled={isLoading}
                    className="flex items-center gap-3 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl px-6 py-4 w-full hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all bg-ios-card-light dark:bg-ios-card-dark"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span className="font-medium">Balas Email...</span>
                </button>
            ) : (
                <div className="bg-ios-card-light dark:bg-ios-card-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden ring-4 ring-blue-500/10">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#141414] border-b border-gray-200 dark:border-gray-800">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 pl-3 uppercase tracking-widest">Balas ke: <span className="text-gray-900 dark:text-white">{config.identity.name}</span></span>
                        <button onClick={() => setIsDrafting(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full h-48 p-5 outline-none text-gray-900 dark:text-gray-100 bg-transparent resize-none font-sans leading-relaxed"
                        placeholder="Tulis balasan Anda di sini..."
                        autoFocus
                    />
                    <div className="p-4 bg-gray-50 dark:bg-[#141414] flex justify-end items-center border-t border-gray-200 dark:border-gray-800">
                        <button 
                            onClick={handleSend}
                            disabled={!replyText.trim() || isLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span>Kirim & Cek</span>
                        </button>
                    </div>
                </div>
            )
        ) : (
            <div className={`text-center p-4 text-xs font-bold uppercase tracking-widest transition-colors ${evaluation ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-500'}`}>
                {evaluation ? "Tiket telah dievaluasi" : "Menunggu evaluasi..."}
            </div>
        )}
      </div>
    </div>
  );
};
