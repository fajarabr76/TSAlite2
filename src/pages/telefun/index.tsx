import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ArrowLeft, PhoneCall } from 'lucide-react';
import AppTelefun from './AppTelefun';

// Komponen Landing Page Telefun
function TelefunLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen cyber-grid p-8 relative overflow-hidden flex items-center justify-center">
      {/* Decorative Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full"></div>
      
      <div className="max-w-4xl w-full relative z-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-500 hover:text-emerald-500 mb-8 transition-all font-bold group"
        >
          <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span>Dashboard</span>
        </button>
        
        <div className="glass-panel rounded-[2.5rem] p-12 shadow-2xl border border-white/20">
          <div className="flex items-center space-x-6 mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-400 text-white rounded-3xl flex items-center justify-center shadow-xl transform -rotate-6">
              <PhoneCall className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-display tracking-tighter">Aplikasi Telefun</h1>
              <p className="text-emerald-500 font-black uppercase tracking-widest text-xs mt-1">Modul Pelatihan Telepon</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-10 text-lg leading-relaxed">
            Selamat datang di modul Telefun. Aplikasi ini dirancang untuk melatih kemampuan komunikasi verbal dan penanganan telepon agen contact center.
          </p>
          <button 
            onClick={() => navigate('/telefun/app')}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white font-bold h-16 px-10 text-lg rounded-2xl shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-[1.02] active:scale-95"
          >
            Buka Aplikasi Telefun
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TelefunApp() {
  return (
    <Routes>
      <Route path="/" element={<TelefunLanding />} />
      <Route path="/app" element={<AppTelefun />} />
    </Routes>
  );
}
