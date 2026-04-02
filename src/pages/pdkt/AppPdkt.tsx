import React, { useState, useEffect } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { EmailInterface } from './components/EmailInterface';
import { HistoryModal } from './components/HistoryModal';
import { AppSettings, SessionConfig, Identity, ConsumerType, EmailMessage, EvaluationResult, SessionHistory } from './types';
import { DEFAULT_SCENARIOS, DEFAULT_CONSUMER_TYPES, DUMMY_CITIES, DUMMY_PROFILES } from './constants';
import { initializeEmailSession, evaluateAgentResponse } from './services/geminiService';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Settings, Play, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ThemeToggle from '../../components/ThemeToggle';

const STORAGE_KEY = 'emotion_app_settings_email_v2';
const HISTORY_KEY = 'pdkt_session_history_v1';

const App: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'home' | 'email'>('home');
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Fallback to defaults if arrays are empty (e.g. from previous version)
        if (!parsed.scenarios || parsed.scenarios.length === 0) {
            parsed.scenarios = DEFAULT_SCENARIOS;
        }
        if (!parsed.consumerTypes || parsed.consumerTypes.length === 0) {
            parsed.consumerTypes = DEFAULT_CONSUMER_TYPES;
        }
        return parsed;
      }
    } catch (error) {
      console.error("Failed to load settings from storage:", error);
    }
    return {
      scenarios: DEFAULT_SCENARIOS,
      consumerTypes: DEFAULT_CONSUMER_TYPES,
      enableImageGeneration: true,
      globalConsumerTypeId: 'random',
      selectedModel: 'gemini-3-flash-preview'
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<SessionConfig | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [timeTaken, setTimeTaken] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory, (key, value) => {
            // Revive dates
            if (key === 'timestamp' || key === 'date') return new Date(value);
            return value;
        });
        setHistory(parsed);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    const saveHistory = () => {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (error: any) {
            // Check for quota exceeded error
            if (
                error.name === 'QuotaExceededError' || 
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
                error.code === 22 || 
                error.code === 1014
            ) {
                console.warn("LocalStorage quota exceeded. Trimming history.");
                
                // Strategy 1: Keep only the latest 10 items
                if (history.length > 10) {
                    const trimmed = history.slice(0, 10);
                    setHistory(trimmed);
                    // The useEffect will run again with trimmed history
                    return;
                }
                
                // Strategy 2: Keep only the latest 3 items
                if (history.length > 3) {
                    const trimmed = history.slice(0, 3);
                    setHistory(trimmed);
                    return;
                }

                // Strategy 3: Remove attachments from history items to save space
                const noAttachments = history.map(h => ({
                    ...h,
                    emails: h.emails.map(e => ({ ...e, attachments: [] }))
                }));
                
                try {
                    localStorage.setItem(HISTORY_KEY, JSON.stringify(noAttachments));
                    // We don't update state here to keep attachments in current session view, 
                    // but next reload they will be gone from history.
                } catch (e) {
                    console.error("Critical: Cannot save history even after stripping attachments.");
                }
            }
        }
    };

    saveHistory();
  }, [history]);

  // Theme is handled globally by ThemeProvider in App.tsx
  // No local theme logic needed here.

  const startSession = async () => {
    const activeScenarios = settings.scenarios.filter(s => s.isActive);
    if (activeScenarios.length === 0) {
      alert("Harap aktifkan minimal satu skenario di pengaturan.");
      return;
    }

    // Logic updated: Use ALL active scenarios, do not randomize subset.
    const selectedScenarios = activeScenarios;

    // Logic updated: Use GLOBAL consumer setting
    let selectedConsumerType: ConsumerType;
    
    if (settings.globalConsumerTypeId && settings.globalConsumerTypeId !== 'random') {
        const foundType = settings.consumerTypes.find(t => t.id === settings.globalConsumerTypeId);
        selectedConsumerType = foundType || settings.consumerTypes[Math.floor(Math.random() * settings.consumerTypes.length)];
    } else {
        // If set to random or not set, pick random
        selectedConsumerType = settings.consumerTypes[Math.floor(Math.random() * settings.consumerTypes.length)];
    }
    
    const randomProfile = DUMMY_PROFILES[Math.floor(Math.random() * DUMMY_PROFILES.length)];
    const randomCity = DUMMY_CITIES[Math.floor(Math.random() * DUMMY_CITIES.length)];
    
    // Use custom identity if available, otherwise use dummy data
    const customIdentity = settings.customIdentity;
    const identity: Identity = {
      name: customIdentity?.senderName || randomProfile.name,
      email: customIdentity?.email || randomProfile.email,
      city: customIdentity?.city || randomCity,
      bodyName: customIdentity?.bodyName || (customIdentity?.senderName || randomProfile.name)
    };

    const config: SessionConfig = {
      scenarios: selectedScenarios,
      consumerType: selectedConsumerType,
      identity,
      enableImageGeneration: settings.enableImageGeneration ?? true, // Pass setting to config
      model: settings.selectedModel || 'gemini-3-flash-preview'
    };

    setCurrentConfig(config);
    setView('email');
    setIsLoading(true);
    setEmails([]);
    setEvaluation(null);

    try {
        console.log("[PDKT] Starting session with config:", config);
        const firstEmail = await initializeEmailSession(config);
        console.log("[PDKT] First email received:", firstEmail);
        setEmails([firstEmail]);
        setSessionStartTime(Date.now());
    } catch (e) {
        console.error("[PDKT] Failed to start session:", e);
        alert("Gagal memulai sesi email. Periksa API Key atau koneksi.");
        setView('home');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendReply = async (text: string) => {
    const lastConsumerEmail = emails.filter(e => !e.isAgent).pop();
    const consumerContext = lastConsumerEmail ? lastConsumerEmail.body : "Konteks tidak ditemukan.";

    const agentEmail: EmailMessage = {
        id: Date.now().toString(),
        from: "konsumen@ojk.go.id",
        to: currentConfig?.identity.email || "",
        subject: emails.length > 0 ? `Re: ${emails[0].subject}` : "Re: Ticket",
        body: text,
        timestamp: new Date(),
        isAgent: true
    };
    
    setEmails(prev => [...prev, agentEmail]);
    setIsLoading(true);

    try {
        console.log("[PDKT] Sending reply for evaluation:", text);
        const result = await evaluateAgentResponse(text, consumerContext);
        console.log("[PDKT] Evaluation result:", result);
        setEvaluation(result);
        
        let duration = 0;
        if (sessionStartTime) {
          duration = Math.floor((Date.now() - sessionStartTime) / 1000);
          setTimeTaken(duration);
        }

        // Save to history
        if (currentConfig) {
            const newHistoryItem: SessionHistory = {
                id: Date.now().toString(),
                timestamp: new Date(),
                config: currentConfig,
                emails: [...emails, agentEmail],
                evaluation: result,
                timeTaken: duration
            };
            setHistory(prev => [newHistoryItem, ...prev]);
        }

    } catch (e) {
        console.error(e);
        alert("Gagal mengevaluasi jawaban.");
    } finally {
        setIsLoading(false);
    }
  };

  const endSession = () => {
    setView('home');
    setEmails([]);
    setCurrentConfig(null);
    setEvaluation(null);
    setSessionStartTime(null);
    setTimeTaken(null);
  };

  const handleSelectSession = (session: SessionHistory) => {
    setCurrentConfig(session.config);
    setEmails(session.emails);
    setEvaluation(session.evaluation);
    setTimeTaken(session.timeTaken);
    setView('email');
    setIsHistoryOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] flex items-center justify-center p-4 transition-colors duration-300 font-sans selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-md w-full bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20 dark:border-white/10 relative z-10"
          >
            <div className="absolute top-6 left-6 z-20">
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute top-6 right-6 z-20">
              <ThemeToggle />
            </div>

            <div className="text-center mb-10 mt-6">
              <motion.div 
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 bg-gradient-to-br from-pink-500 to-rose-400 rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-xl shadow-pink-500/20"
              >
                 <Mail className="h-12 w-12 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">PDKT</h1>
              <h2 className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-[0.2em] mb-4">Paham Dulu Kasih Tanggapan</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">Latihan Handle Email: Siap Hadapi Berbagai Keluhan Customer dengan Respon yang Tepat.</p>
            </div>

            <div className="space-y-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startSession}
                disabled={isLoading}
                className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 h-14 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-70"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Mulai Tiket Baru</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSettingsOpen(true)}
                className="w-full bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-900 dark:text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all"
              >
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Pengaturan & Skenario</span>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsHistoryOpen(true)}
                className="w-full bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-900 dark:text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all"
              >
                <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Riwayat Simulasi</span>
              </motion.button>
            </div>
            
            <div className="mt-10 flex flex-col items-center gap-2">
               <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest flex flex-col gap-1 items-center text-center opacity-70">
                  <span>POWERED BY GOOGLE GEMINI AI</span>
                  <span>TRAINERS SUPERAPP MADE BY FAJAR & RATNA</span>
                  <span>TRAINER KONTAK OJK 157</span>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="email"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-[#F2F2F7] dark:bg-[#000000] flex flex-col items-center justify-center p-0 md:p-6 overflow-hidden transition-colors duration-300"
          >
            {currentConfig && (
                <div className="w-full h-full md:rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-gray-200/50 dark:border-white/10 flex flex-col bg-white dark:bg-[#1C1C1E]">
                    <EmailInterface 
                        emails={emails}
                        onSendReply={handleSendReply}
                        isLoading={isLoading}
                        config={currentConfig}
                        onEndSession={endSession}
                        evaluation={evaluation}
                        timeTaken={timeTaken}
                    />
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
};

export default App;
