import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Settings, 
  History, 
  Search, 
  Filter, 
  TrendingUp, 
  Cpu, 
  DollarSign, 
  RefreshCw,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UsageLog {
  id: number;
  user_id: string;
  module: string;
  action: string;
  model_id: string;
  total_tokens: number;
  estimated_cost_idr: number;
  created_at: string;
}

interface PriceSetting {
  model_id: string;
  input_price_usd_per_million: number;
  output_price_usd_per_million: number;
}

export default function DashboardMonitoring() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'usage' | 'pricing' | 'history'>('usage');
  
  // Usage State
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    userId: '',
    module: ''
  });

  // Pricing State
  const [pricing, setPricing] = useState<PriceSetting[]>([]);
  const [usdRate, setUsdRate] = useState(16000);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [isEditingUsd, setIsEditingUsd] = useState(false);
  const [tempUsd, setTempUsd] = useState(16000);

  const isAdmin = user?.role === 'admin' || user?.role === 'trainer';

  useEffect(() => {
    fetchUsage();
    if (isAdmin) {
      fetchPricing();
    }
  }, [filters, activeTab]);

  const fetchUsage = async () => {
    setLoadingUsage(true);
    try {
      const query = new URLSearchParams({
        month: filters.month.toString(),
        year: filters.year.toString(),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.module && { module: filters.module })
      });
      const res = await fetch(`/api/billing/usage?${query}`);
      const data = await res.json();
      setUsageLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsage(false);
    }
  };

  const fetchPricing = async () => {
    setLoadingPricing(true);
    try {
      const res = await fetch('/api/billing/settings');
      const data = await res.json();
      
      setPricing(data.pricing || []);
      const rateSetting = data.billing?.find((b: any) => b.key === 'usd_to_idr_rate');
      if (rateSetting) {
        const rate = parseInt(rateSetting.value);
        setUsdRate(rate);
        setTempUsd(rate);
      }
    } catch (e) {
      console.error('Failed to fetch pricing:', e);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleUpdatePrice = async (p: PriceSetting) => {
    try {
      const res = await fetch('/api/billing/settings/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: p.model_id,
          inputPrice: p.input_price_usd_per_million,
          outputPrice: p.output_price_usd_per_million
        })
      });
      if (res.ok) {
        alert("Harga berhasil diupdate");
        fetchPricing();
      }
    } catch (e) {
      alert("Gagal update harga");
    }
  };

  const handleUpdateRate = async () => {
    try {
      const res = await fetch('/api/billing/settings/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: tempUsd })
      });
      if (res.ok) {
        setUsdRate(tempUsd);
        setIsEditingUsd(false);
        alert("Kurs berhasil diupdate");
      }
    } catch (e) {
      alert("Gagal update kurs");
    }
  };

  // Aggregations
  const totalCost = usageLogs.reduce((acc, log) => acc + log.estimated_cost_idr, 0);
  const totalTokens = usageLogs.reduce((acc, log) => acc + log.total_tokens, 0);

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Monitoring <span className="text-blue-500">Token</span></h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Laporan penggunaan dan penagihan AI per bulan.</p>
          </div>
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-white dark:bg-[#1C1C1E] rounded-2xl font-bold text-gray-600 dark:text-gray-400 shadow-sm border border-gray-200 dark:border-white/5 hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[2rem] border border-white/20 dark:border-white/5 shadow-xl relative overflow-hidden group"
          >
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-24 h-24 text-blue-500" />
             </div>
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2">Total Billing Bulan Ini</p>
             <p className="text-4xl font-black text-gray-900 dark:text-white">Rp {Math.round(totalCost).toLocaleString('id-ID')}</p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[2rem] border border-white/20 dark:border-white/5 shadow-xl relative overflow-hidden group"
          >
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Cpu className="w-24 h-24 text-purple-500" />
             </div>
             <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2">Total Token Terpakai</p>
             <p className="text-4xl font-black text-gray-900 dark:text-white">{totalTokens.toLocaleString()}</p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[2rem] border border-white/20 dark:border-white/5 shadow-xl relative overflow-hidden group"
          >
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-24 h-24 text-green-500" />
             </div>
             <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] mb-2">Kurs Saat Ini (USD to IDR)</p>
             <div className="flex items-center gap-3">
               <p className="text-4xl font-black text-gray-900 dark:text-white">Rp {usdRate.toLocaleString('id-ID')}</p>
               {isAdmin && (
                  <button onClick={() => setIsEditingUsd(true)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
               )}
             </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-gray-200/50 dark:bg-white/5 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('usage')}
            className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'usage' ? 'bg-white dark:bg-[#1C1C1E] text-blue-500 shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Penggunaan Token
          </button>
          <button 
            onClick={() => setActiveTab('pricing')}
            className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'pricing' ? 'bg-white dark:bg-[#1C1C1E] text-blue-500 shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Harga & Kurs
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-2xl overflow-hidden">
          {activeTab === 'usage' && (
            <div className="p-8">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-8 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select 
                      value={filters.month}
                      onChange={(e) => setFilters(f => ({ ...f, month: parseInt(e.target.value) }))}
                      className="pl-11 pr-8 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold appearance-none cursor-pointer"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString('id-ID', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>

                  <select 
                    value={filters.year}
                    onChange={(e) => setFilters(f => ({ ...f, year: parseInt(e.target.value) }))}
                    className="px-6 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold appearance-none cursor-pointer"
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Cari User ID..."
                      value={filters.userId}
                      onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))}
                      className="pl-11 pr-6 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium w-64"
                    />
                  </div>
                </div>

                <button 
                  onClick={fetchUsage}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingUsage ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5">
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu (WIB)</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User ID</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Modul</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Model</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Token</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimasi (IDR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogs.length > 0 ? usageLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleString('id-ID', { 
                            day: '2-digit', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{log.user_id}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {log.module}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">{log.model_id}</td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{log.total_tokens.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-black text-blue-500">Rp {Math.round(log.estimated_cost_idr).toLocaleString('id-ID')}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-gray-500 dark:text-gray-400 font-medium">
                          Tidak ada data penggunaan untuk periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="p-8">
              {!isAdmin ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
                  <AlertCircle className="w-16 h-16 text-orange-500" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Akses Terbatas</h3>
                    <p className="text-gray-500">Hanya Trainer dan Admin yang dapat mengatur harga.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Daftar Harga Per Model</h3>
                      <p className="text-sm text-gray-500 mt-1">Harga per 1 Juta Token (USD)</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {pricing.map((p) => (
                      <div key={p.model_id} className="p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-6">
                        <div className="min-w-[200px]">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Model ID</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{p.model_id}</p>
                        </div>

                        <div className="flex gap-8">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Input (USD/1M)</p>
                            <input 
                              type="number"
                              step="0.0001"
                              value={p.input_price_usd_per_million}
                              onChange={(e) => {
                                const newPricing = pricing.map(it => it.model_id === p.model_id ? { ...it, input_price_usd_per_million: parseFloat(e.target.value) } : it);
                                setPricing(newPricing);
                              }}
                              className="w-24 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm font-bold"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Output (USD/1M)</p>
                            <input 
                              type="number"
                              step="0.0001"
                              value={p.output_price_usd_per_million}
                              onChange={(e) => {
                                const newPricing = pricing.map(it => it.model_id === p.model_id ? { ...it, output_price_usd_per_million: parseFloat(e.target.value) } : it);
                                setPricing(newPricing);
                              }}
                              className="w-24 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm font-bold"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={() => handleUpdatePrice(p)}
                          className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Simpan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* USD Rate Edit Modal */}
      <AnimatePresence>
        {isEditingUsd && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#1C1C1E] p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-white/10"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Atur Kurs USD ke IDR</h3>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Kurs Baru (IDR)</label>
                  <input 
                    type="number"
                    value={tempUsd}
                    onChange={(e) => setTempUsd(parseInt(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-6 h-14 text-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsEditingUsd(false)}
                  className="flex-1 h-12 rounded-xl bg-gray-100 dark:bg-white/5 font-bold text-gray-500 hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleUpdateRate}
                  className="flex-1 h-12 rounded-xl bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all"
                >
                  Update Kurs
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ArrowLeft(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
