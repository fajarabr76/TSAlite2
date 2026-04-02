import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SettingsModal } from './components/SettingsModal';
import { PhoneInterface } from './components/PhoneInterface';
import { AppSettings, SessionConfig, Identity, ConsumerType } from './types';
import { DEFAULT_SCENARIOS, DEFAULT_CONSUMER_TYPES, DUMMY_CITIES, DUMMY_MALE_NAMES, DUMMY_FEMALE_NAMES, AI_MODELS } from './constants';
import { ArrowLeft, Phone, Settings, Trash2, Download, PhoneCall } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';

const STORAGE_KEY = 'telefun_app_settings_v1';

interface CallRecord {
  id: string;
  date: Date;
  url: string;
  consumerName: string;
}

const AppTelefun: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [recordings, setRecordings] = useState<CallRecord[]>([]);
  
  // Initialize settings with Persistence Logic
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        // Merge saved settings with defaults to ensure structural integrity
        return {
             ...parsed,
             scenarios: parsed.scenarios && Array.isArray(parsed.scenarios) ? parsed.scenarios : DEFAULT_SCENARIOS,
             consumerTypes: parsed.consumerTypes && Array.isArray(parsed.consumerTypes) ? parsed.consumerTypes : DEFAULT_CONSUMER_TYPES,
             identitySettings: parsed.identitySettings || {
                displayName: '',
                gender: 'male',
                phoneNumber: '',
                city: ''
             },
             selectedModel: (parsed.selectedModel && AI_MODELS.some(m => m.id === parsed.selectedModel)) 
                ? parsed.selectedModel 
                : AI_MODELS[0].id,
             preferredConsumerTypeId: parsed.preferredConsumerTypeId || 'random',
             maxCallDuration: parsed.maxCallDuration !== undefined ? parsed.maxCallDuration : 5
        };
      }
    } catch (error) {
      console.error("Failed to load settings from storage:", error);
    }
    
    // Fallback defaults
    return {
      scenarios: DEFAULT_SCENARIOS,
      consumerTypes: DEFAULT_CONSUMER_TYPES,
      identitySettings: {
          displayName: '',
          gender: 'male',
          phoneNumber: '',
          city: ''
      },
      selectedModel: 'gemini-3.1-flash-live-preview',
      preferredConsumerTypeId: 'random',
      maxCallDuration: 5
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<SessionConfig | null>(null);
  const [endCallReason, setEndCallReason] = useState<string | null>(null);

  const handleRecordingReady = React.useCallback((url: string, consumerName: string) => {
    setRecordings(prev => [{
      id: Date.now().toString(),
      date: new Date(),
      url,
      consumerName
    }, ...prev]);
  }, []);

  const handleDeleteRecording = (id: string, url: string) => {
    // Revoke the object URL to free up memory
    URL.revokeObjectURL(url);
    setRecordings(prev => prev.filter(rec => rec.id !== id));
  };

  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const startSession = async () => {
    // 1. Request Microphone Permission directly in the user gesture (onClick)
    // This prevents browsers (like Safari) from blocking the request or timing out
    try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the tracks immediately, we just needed the permission
        tempStream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
        console.error("Mic permission error:", err);
        alert("Izin mikrofon ditolak atau tidak ditemukan. Harap izinkan akses mikrofon di browser Anda untuk menggunakan fitur ini.");
        return;
    }

    const activeScenarios = settings.scenarios.filter(s => s.isActive);
    if (activeScenarios.length === 0) {
      alert("Harap aktifkan minimal satu skenario di pengaturan.");
      return;
    }

    const selectedScenarios = [...activeScenarios].sort(() => 0.5 - Math.random());
    const primaryScenario = selectedScenarios[0];
    
    // Select Consumer Type based on Global Preference
    let selectedConsumerType: ConsumerType;
    const preferredId = settings.preferredConsumerTypeId || 'random';

    if (preferredId !== 'random') {
      const foundType = settings.consumerTypes.find(t => t.id === preferredId);
      selectedConsumerType = foundType || settings.consumerTypes[Math.floor(Math.random() * settings.consumerTypes.length)];
    } else {
      selectedConsumerType = settings.consumerTypes[Math.floor(Math.random() * settings.consumerTypes.length)];
    }
    
    // Select Identity
    const customId = settings.identitySettings;
    const shouldUseCustomName = customId?.displayName && customId.displayName.trim() !== '';

    let gender: 'male' | 'female' = 'male';
    let name = '';
    let city = '';
    let phone = '';

    // Logic Priority: 
    // 1. Scenario Fixed Identity (if exists)
    // 2. Custom Identity from Settings (if name is set)
    // 3. Random Generation

    if (primaryScenario.fixedIdentity) {
        name = primaryScenario.fixedIdentity.name;
        gender = primaryScenario.fixedIdentity.gender;
        city = primaryScenario.fixedIdentity.city;
        phone = primaryScenario.fixedIdentity.phone;
    } 
    else if (shouldUseCustomName) {
        // Use settings only if user explicitly typed a name
        name = customId!.displayName;
        gender = customId!.gender || 'male';
        city = customId!.city;
        phone = customId!.phoneNumber;
    } 
    else {
        // Fully Random
        gender = Math.random() > 0.5 ? 'male' : 'female';
        const nameList = gender === 'male' ? DUMMY_MALE_NAMES : DUMMY_FEMALE_NAMES;
        name = nameList[Math.floor(Math.random() * nameList.length)];
    }

    // Fallbacks for empty fields in random/custom mode
    if (!city) city = DUMMY_CITIES[Math.floor(Math.random() * DUMMY_CITIES.length)];
    if (!phone) phone = `08${Math.floor(100000000 + Math.random() * 900000000)}`;

    const identity: Identity = {
      name,
      city,
      phone,
      gender
    };

    const config: SessionConfig = {
      scenarios: selectedScenarios,
      consumerType: selectedConsumerType,
      identity,
      model: settings.selectedModel || 'gemini-3.1-flash-live-preview',
      maxCallDuration: settings.maxCallDuration !== undefined ? settings.maxCallDuration : 5
    };

    setCurrentConfig(config);
    setView('chat'); 
  };

  const endSession = React.useCallback((reason?: string) => {
    setView('home');
    setCurrentConfig(null);
    if (reason) {
      setEndCallReason(reason);
    }
  }, []);

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#000000] font-sans relative text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      
      <AnimatePresence mode="wait">
        {/* Home View */}
        {view === 'home' ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-md w-full bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20 dark:border-white/10 relative z-10"
          >
            {/* Back Button */}
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
                  className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-400 rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-xl shadow-green-500/20"
               >
                  <PhoneCall className="w-10 h-10 text-white" />
               </motion.div>
               <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Telefun</h1>
               <h2 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-[0.2em] mb-4">Simulasi Roleplay Suara Kontak 157</h2>
               <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">Latihan Komunikasi Verbal: Asah Kemampuan Berbicara dan Menangani Keluhan secara Langsung.</p>
            </div>

            <div className="space-y-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startSession}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all"
              >
                 <Phone className="w-5 h-5 fill-current" />
                 <span>Mulai Panggilan</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSettingsOpen(true)}
                className="w-full bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-900 dark:text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all"
              >
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Pengaturan Suara</span>
              </motion.button>
            </div>

            {recordings.length > 0 && (
              <div className="mt-8 text-left">
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-1">Riwayat Rekaman</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {recordings.map(rec => (
                    <div key={rec.id} className="bg-gray-50/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200/50 dark:border-white/5 relative group transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">{rec.consumerName}</span>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full">{rec.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <audio controls src={rec.url} className="w-full h-8 mb-2 opacity-80 hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200/50 dark:border-white/5">
                        <a href={rec.url} download={`Rekaman-${rec.consumerName}-${rec.id}.webm`} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                          <Download className="w-3 h-3" /> Download
                        </a>
                        <button 
                          onClick={() => handleDeleteRecording(rec.id, rec.url)}
                          className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                          title="Hapus Rekaman"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-10 flex flex-col items-center gap-2">
               <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest flex flex-col gap-1 items-center text-center opacity-70">
                  <span>POWERED BY GEMINI LIVE API</span>
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
            <div className="w-full bg-white dark:bg-[#1C1C1E] flex flex-col transition-all overflow-hidden h-full md:h-auto md:aspect-video md:w-full md:max-w-5xl md:rounded-[2.5rem] md:border border-gray-200/50 dark:md:border-white/10 md:shadow-2xl relative z-10">
              {currentConfig && (
                <PhoneInterface 
                  config={currentConfig}
                  onEndSession={endSession}
                  onRecordingReady={handleRecordingReady}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Call Ended */}
      <AnimatePresence>
        {endCallReason === 'timeout' && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#1C1C1E] backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center transition-colors duration-300"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 rotate-[135deg]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Panggilan Berakhir</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-8 leading-relaxed">
                Batas waktu maksimal panggilan telah tercapai. Konsumen telah menutup telepon.
              </p>
              <button 
                onClick={() => setEndCallReason(null)}
                className="w-full py-3.5 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-900 dark:text-white font-bold rounded-xl transition-all active:scale-[0.98]"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
};

export default AppTelefun;
