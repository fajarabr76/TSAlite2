import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SessionMetrics, SessionConfig } from '../types';
import { X, Trophy, AlertTriangle, MessageSquare, Clock, ShieldCheck, Zap, Download, Play, Pause } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullCallBlob: Blob | null;
  agentBlob: Blob | null;
  metrics: SessionMetrics | null;
  config: SessionConfig;
}

interface AnalysisResult {
  score: number;
  transcript: string;
  positives: string[];
  improvements: string[];
  summary: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  fullCallBlob,
  agentBlob,
  metrics,
  config
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullCallUrl, setFullCallUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (fullCallBlob) {
      const url = URL.createObjectURL(fullCallBlob);
      setFullCallUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fullCallBlob]);

  const handleAnalyze = async () => {
    if (!fullCallBlob || !metrics) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const apiKey = (window as any).VITE_GEMINI_API_KEY || (process as any).env.VITE_GEMINI_API_KEY || (process as any).env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key tidak ditemukan");

      const gemini = new GoogleGenAI({ apiKey });

      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]);
        };
        reader.readAsDataURL(fullCallBlob);
      });

      const audioBase64 = await base64Promise;

      const prompt = `
        Analisis rekaman panggilan layanan konsumen OJK 157 berikut.
        
        Konteks Sesi:
        - Skenario: ${config.scenarios[0].title}
        - Masalah Konsumen: ${config.scenarios[0].description}
        - Tipe Konsumen: ${config.consumerType.name}
        
        Metrik Sesi:
        - Durasi: ${Math.round(metrics.durationSeconds)} detik
        - Jumlah Interupsi: ${metrics.interruptionCount} kali
        - Waktu Hening (Dead Air): ${metrics.deadAirCount} kali
        
        Tugas Anda:
        1. Buat transkrip singkat percakapan.
        2. Berikan skor (0-100) berdasarkan kualitas layanan, empati, dan kejelasan solusi.
        3. Sebutkan poin positif dari agen.
        4. Sebutkan poin yang perlu diperbaiki (termasuk interupsi dan dead air).
        5. Berikan ringkasan singkat.
        
        Format Response harus berupa JSON:
        {
          "score": number,
          "transcript": "isi transkrip...",
          "positives": ["poin 1", "poin 2"],
          "improvements": ["poin 1", "poin 2"],
          "summary": "isi ringkasan..."
        }
      `;

      const analysisResult = await gemini.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "audio/webm",
                  data: audioBase64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = analysisResult.text;
      const parsed = JSON.parse(responseText);
      setResult(parsed);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError("Gagal menganalisis rekaman: " + (err.message || "Unknown error"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] w-full max-w-4xl max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 px-8 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review Panggilan</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Analisis AI & Metrik Sesi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 px-8 space-y-8 custom-scrollbar">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              icon={<Clock className="w-4 h-4" />} 
              label="Durasi" 
              value={`${Math.round(metrics?.durationSeconds || 0)}s`} 
              color="text-blue-500"
            />
            <MetricCard 
              icon={<AlertTriangle className="w-4 h-4" />} 
              label="Interupsi" 
              value={`${metrics?.interruptionCount || 0}x`} 
              color={metrics?.interruptionCount && metrics.interruptionCount > 3 ? "text-red-500" : "text-yellow-500"}
            />
            <MetricCard 
              icon={<Zap className="w-4 h-4" />} 
              label="Dead Air" 
              value={`${metrics?.deadAirCount || 0}x`} 
              color={metrics?.deadAirCount && metrics.deadAirCount > 2 ? "text-red-500" : "text-yellow-500"}
            />
            <MetricCard 
              icon={<Trophy className="w-4 h-4" />} 
              label="Skor AI" 
              value={result ? `${result.score}%` : "-"} 
              color="text-emerald-500"
            />
          </div>

          {/* Audio Player Panel */}
          <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
             <button 
                onClick={togglePlayback}
                className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
             >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
             </button>
             <div className="flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rekaman Panggilan</p>
                <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full w-full overflow-hidden">
                    <motion.div 
                        animate={{ width: isPlaying ? '100%' : '0%' }}
                        transition={{ duration: metrics?.durationSeconds || 1, ease: "linear" }}
                        className="h-full bg-emerald-500"
                    />
                </div>
             </div>
             {fullCallUrl && (
                 <a href={fullCallUrl} download={`Call-Review-${Date.now()}.webm`} className="p-3 text-gray-400 hover:text-emerald-500 transition-colors">
                    <Download className="w-5 h-5" />
                 </a>
             )}
             <audio 
                ref={audioRef} 
                src={fullCallUrl || ''} 
                onEnded={() => setIsPlaying(false)}
                className="hidden" 
             />
          </div>

          {/* Analysis Section */}
          {!result ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                <Zap className={`w-8 h-8 ${isAnalyzing ? 'animate-bounce' : ''}`} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Butuh Analisis Mendalam?</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">AI akan mendengarkan rekaman dan memberikan skor serta feedback spesifik untuk Anda.</p>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
              >
                {isAnalyzing ? "Menganalisis..." : "Mulai Analisis AI Sekarang"}
              </button>
              {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            </div>
          ) : (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* Score Section */}
                <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-white/5" />
                            <motion.circle 
                                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                className="text-emerald-500"
                                strokeDasharray={364}
                                initial={{ strokeDashoffset: 364 }}
                                animate={{ strokeDashoffset: 364 - (364 * result.score) / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>
                        <span className="absolute text-3xl font-black text-gray-900 dark:text-white">{result.score}</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Skor Performa</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{result.summary}</p>
                    </div>
                </div>

                {/* Positives & Improvements */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 dark:bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-4">
                            <ShieldCheck className="w-5 h-5" />
                            <span>Poin Positif</span>
                        </div>
                        <ul className="space-y-3">
                            {result.positives.map((p, i) => (
                                <li key={i} className="text-sm text-emerald-800 dark:text-emerald-300 flex gap-2">
                                    <span className="shrink-0">•</span> {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-500/5 p-6 rounded-[2rem] border border-orange-100 dark:border-orange-500/10">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold mb-4">
                            <AlertTriangle className="w-5 h-5" />
                            <span>Perlu Perbaikan</span>
                        </div>
                        <ul className="space-y-3">
                            {result.improvements.map((p, i) => (
                                <li key={i} className="text-sm text-orange-800 dark:text-orange-300 flex gap-2">
                                    <span className="shrink-0">•</span> {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Transcript */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-xs">
                        <MessageSquare className="w-4 h-4" />
                        <span>Ringkasan Transkrip</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed italic">
                            "{result.transcript}"
                        </p>
                    </div>
                </div>
            </motion.div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 px-8 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-700 dark:text-white font-bold rounded-xl transition-all"
          >
            Tutup
          </button>
          {!result && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                Analisis AI
              </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode, label: string, value: string, color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center">
    <div className={`mb-1 ${color}`}>{icon}</div>
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
    <span className={`text-lg font-black ${color}`}>{value}</span>
  </div>
);
