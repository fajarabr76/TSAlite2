import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, History, Play, ArrowLeft, MessageSquare, Sparkles, Download, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import { AppSettings, ChatSession, SessionConfig, Scenario, ConsumerType, Identity } from './types';
import { defaultSettings } from './data';
import { DEFAULT_SCENARIOS, DEFAULT_CONSUMER_TYPES } from './constants';
import { SettingsModal } from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import ChatInterface from './components/ChatInterface';

export default function AppKetik() {
  const navigate = useNavigate();
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('ketik_app_settings_v2');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        const mergeWithDefaults = <T extends { id: string, isCustom?: boolean, description?: string }>(stored: T[], defaults: T[]): T[] => {
            if (!Array.isArray(stored)) return defaults;
            const storedMap = new Map(stored.map(item => [item.id, item]));
            const merged = [...stored];
            
            defaults.forEach(defItem => {
                if (!storedMap.has(defItem.id)) {
                    merged.push(defItem);
                } else {
                    const existingIndex = merged.findIndex(item => item.id === defItem.id);
                    if (existingIndex !== -1 && !merged[existingIndex].isCustom) {
                        const existing = merged[existingIndex];
                        const isOldDefault = existing.description?.startsWith('Anda ');
                        
                        if (isOldDefault || existing.description === defItem.description) {
                            const preserveIsActive = (existing as any).isActive;
                            merged[existingIndex] = { 
                                ...defItem, 
                                ...(preserveIsActive !== undefined ? { isActive: preserveIsActive } : {}) 
                            };
                        }
                    }
                }
            });
            return merged;
        };

        return {
            ...parsed,
            scenarios: mergeWithDefaults(parsed.scenarios, DEFAULT_SCENARIOS),
            consumerTypes: mergeWithDefaults(parsed.consumerTypes, DEFAULT_CONSUMER_TYPES),
            activeConsumerTypeId: parsed.activeConsumerTypeId || 'random',
            identitySettings: {
                displayName: parsed.identitySettings?.displayName || '',
                signatureName: parsed.identitySettings?.signatureName || '',
                phoneNumber: parsed.identitySettings?.phoneNumber || '',
                city: parsed.identitySettings?.city || ''
            },
            selectedModel: parsed.selectedModel || 'gemini-3-flash-preview',
            simulationDuration: parsed.simulationDuration || 5
        };
      }
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
    return defaultSettings;
  });
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentConfig, setCurrentConfig] = useState<SessionConfig | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [reviewMessages, setReviewMessages] = useState<any[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('ketik_chat_history_v3');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ketik_app_settings_v2', JSON.stringify(newSettings));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('ketik_chat_history_v3');
  };

  const handleDeleteSession = (id: string) => {
    const newHistory = history.filter(s => s.id !== id);
    setHistory(newHistory);
    localStorage.setItem('ketik_chat_history_v3', JSON.stringify(newHistory));
  };

  const startSimulation = () => {
    const activeScenarios = settings.scenarios.filter(s => s.isActive);
    if (activeScenarios.length === 0) {
      alert('Pilih minimal satu skenario di Pengaturan.');
      setIsSettingsOpen(true);
      return;
    }
    const scenario = activeScenarios[Math.floor(Math.random() * activeScenarios.length)];

    let consumerType: ConsumerType;
    if (settings.activeConsumerTypeId === 'random') {
      consumerType = settings.consumerTypes[Math.floor(Math.random() * settings.consumerTypes.length)];
    } else {
      consumerType = settings.consumerTypes.find(c => c.id === settings.activeConsumerTypeId) || settings.consumerTypes[0];
    }

    const dummyNames = [
      'Budi Santoso', 'Siti Aminah', 'Agus Setiawan', 'Dewi Lestari', 'Rina Wati',
      'Eko Prasetyo', 'Sri Wahyuni', 'Muhammad Rizky', 'Nurul Hidayah', 'Bambang Sutrisno',
      'Ratna Sari', 'Dedi Kurniawan', 'Andi Wijaya', 'Sari Indah', 'Maya Putri',
      'Doni Pratama', 'Indra Lesmana', 'Yulia Rachmawati', 'Fajar Nugraha', 'Diana Puspita'
    ];
    
    const dummyCities = [
      'Jakarta Selatan', 'Jakarta Pusat', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara',
      'Kota Bogor', 'Kab. Bogor', 'Kota Depok', 'Kota Tangerang', 'Kota Tangerang Selatan',
      'Kab. Tangerang', 'Kota Bekasi', 'Kab. Bekasi', 'Kota Bandung', 'Kota Surabaya',
      'Kota Medan', 'Kota Semarang', 'Kota Makassar', 'Kota Palembang', 'Kota Denpasar'
    ];

    const phonePrefixes = ['0812', '0813', '0821', '0852', '0857', '0858', '0877', '0878', '0819', '0896', '0838'];
    const randomPrefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
    const randomPhoneSuffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

    const identity: Identity = {
      name: settings.identitySettings.displayName || dummyNames[Math.floor(Math.random() * dummyNames.length)],
      city: settings.identitySettings.city || dummyCities[Math.floor(Math.random() * dummyCities.length)],
      phone: settings.identitySettings.phoneNumber || `${randomPrefix}${randomPhoneSuffix}`,
      signatureName: settings.identitySettings.signatureName
    };

    const config: SessionConfig = {
      scenarios: activeScenarios,
      consumerType,
      identity,
      model: settings.selectedModel,
      simulationDuration: settings.simulationDuration || 5
    };

    console.log("[Ketik] Starting simulation with config:", config);
    console.log("[Ketik] Selected scenario:", scenario);

    setCurrentConfig(config);
    setCurrentScenario(scenario);
    setReviewMessages([]); // Reset review messages
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setView('chat');
    }, 500);
  };

  const endSession = (messages: any[]) => {
    console.log("[Ketik] Ending session. Total messages:", messages.length);
    if (currentConfig && currentScenario && messages.length > 0 && currentScenario.id !== 'review') {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        date: new Date(),
        scenarioTitle: currentScenario.title,
        consumerName: currentConfig.identity.name,
        consumerPhone: currentConfig.identity.phone,
        consumerCity: currentConfig.identity.city,
        messages
      };
      const newHistory = [newSession, ...history];
      setHistory(newHistory);
      localStorage.setItem('ketik_chat_history_v3', JSON.stringify(newHistory));
      console.log("[Ketik] Session saved to history.");
    }
    setView('home');
    setCurrentConfig(null);
    setCurrentScenario(null);
    setReviewMessages([]);
  };

  const handleReviewHistory = (session: ChatSession) => {
    const reviewConfig: SessionConfig = {
      scenarios: settings.scenarios,
      consumerType: settings.consumerTypes[0],
      identity: { 
        name: session.consumerName, 
        city: session.consumerCity || '', 
        phone: session.consumerPhone || '0812...' 
      },
      model: settings.selectedModel,
      simulationDuration: 5
    };
    const reviewScenario: Scenario = {
      id: 'review',
      title: session.scenarioTitle,
      description: '',
      category: 'Review',
      isActive: true
    };
    setCurrentConfig(reviewConfig);
    setCurrentScenario(reviewScenario);
    setReviewMessages(session.messages);
    setIsHistoryOpen(false);
    setView('chat');
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
                className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-xl shadow-blue-500/20"
              >
                <MessageSquare className="w-12 h-12 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Ketik <span className="text-blue-500">V3</span></h1>
              <h2 className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em] mb-4">Kelas Etika & Trik Komunikasi</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">Latihan Handle Chat: Tingkatkan Kualitas Pelayanan Melalui Komunikasi Tulis yang Empati dan Solutif.</p>
            </div>

            <div className="space-y-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startSimulation}
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white h-14 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 transition-all"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Mulai Simulasi</span>
                  </>
                )}
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSettingsOpen(true)}
                className="w-full bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-900 dark:text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all"
              >
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Pengaturan</span>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsHistoryOpen(true)}
                className="w-full bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-900 dark:text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all"
              >
                <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Riwayat</span>
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
            key="chat"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-[#F2F2F7] dark:bg-[#000000] flex flex-col items-center justify-center p-0 md:p-6 overflow-hidden transition-colors duration-300"
          >
            <div className="w-full max-w-5xl h-full bg-white dark:bg-[#1C1C1E] md:rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-gray-200/50 dark:border-white/10 flex flex-col">
              {currentConfig && currentScenario && (
                <ChatInterface 
                  config={currentConfig} 
                  scenario={currentScenario} 
                  onEndSession={endSession} 
                  isReviewMode={currentScenario.id === 'review'}
                  initialMessages={reviewMessages}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleSaveSettings}
      />

      <HistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={history}
        onClear={handleClearHistory}
        onDelete={handleDeleteSession}
        onReview={handleReviewHistory}
      />
    </div>
  );
}
