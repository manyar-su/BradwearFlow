import React, { useState, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { OrderItem, PRICE_LIST, JobStatus } from '../types';
// Fix: Removed startOfWeek and unused eachDayOfInterval from date-fns import due to export errors
import { format, isSameDay, isSameMonth, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { Wallet, TrendingUp, Package } from 'lucide-react';

interface AnalyticsScreenProps {
  orders: OrderItem[];
  isDarkMode: boolean;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ orders, isDarkMode }) => {
  const [timeframe, setTimeframe] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');

  const statsSummary = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === JobStatus.BERES);
    const totalEarnings = completedOrders.reduce((sum, o) => {
      const price = PRICE_LIST[o.model.toUpperCase()] || PRICE_LIST['DEFAULT'];
      return sum + (price * o.jumlahPesanan);
    }, 0);

    const totalPcs = orders.reduce((sum, o) => sum + o.jumlahPesanan, 0);
    return { totalEarnings, totalPcs, completedCount: completedOrders.length };
  }, [orders]);

  const chartData = useMemo(() => {
    const now = new Date();
    if (timeframe === 'WEEK') {
      // Fix: Manual Monday calculation instead of startOfWeek (locale ID starts week on Monday)
      const monday = new Date(now);
      const day = monday.getDay();
      // Adjust to Monday: if Sunday (0), go back 6; otherwise go back (day - 1)
      const diff = monday.getDate() - (day === 0 ? 6 : day - 1);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      
      const dayLabels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      
      return [0, 1, 2, 3, 4, 5].map(offset => {
        const date = addDays(monday, offset);
        return {
          label: dayLabels[offset],
          count: orders.filter(o => isSameDay(new Date(o.createdAt), date)).length
        };
      });
    } else {
      // For MONTH/YEAR we show last 6 months
      return [5, 4, 3, 2, 1, 0].reverse().map(i => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          label: format(date, 'MMM', { locale: idLocale }),
          count: orders.filter(o => isSameMonth(new Date(o.createdAt), date)).length
        };
      });
    }
  }, [orders, timeframe]);

  return (
    <div className="p-6 space-y-6">
      <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Performance Stats</h2>

      <div className="flex gap-2">
        <button 
          onClick={() => setTimeframe('WEEK')} 
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${timeframe === 'WEEK' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`}
        >
          Pekan Ini
        </button>
        <button 
          onClick={() => setTimeframe('MONTH')} 
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${timeframe === 'MONTH' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`}
        >
          6 Bulan
        </button>
      </div>

      {/* Earnings Widget */}
      <div className={`p-8 rounded-[2.5rem] bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-2xl relative overflow-hidden`}>
         <div className="relative z-10 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Earnings (Beres)</span>
            <div className="flex items-center gap-3">
               <Wallet className="opacity-60" size={24} />
               <h3 className="text-3xl font-black">Rp {statsSummary.totalEarnings.toLocaleString()}</h3>
            </div>
            <p className="text-[10px] mt-4 opacity-70 font-medium">Berdasarkan {statsSummary.completedCount} pesanan selesai.</p>
         </div>
         <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={`p-5 rounded-[2rem] border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <Package className="text-blue-500 mb-2" size={20} />
          <p className="text-[9px] text-slate-400 font-black uppercase">Total Produksi</p>
          <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{statsSummary.totalPcs} Pcs</p>
        </div>
        <div className={`p-5 rounded-[2rem] border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <TrendingUp className="text-orange-500 mb-2" size={20} />
          <p className="text-[9px] text-slate-400 font-black uppercase">Efisiensi</p>
          <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>94%</p>
        </div>
      </div>

      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'} p-6 rounded-[2.5rem] shadow-xl border h-80`}>
        <div className="flex justify-between items-center mb-4 px-2">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{timeframe === 'WEEK' ? 'Produksi Senin - Sabtu' : 'Grafik 6 Bulan Terakhir'}</h4>
        </div>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={chartData}>
            <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10}} />
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: isDarkMode ? '#1e293b' : '#ffffff'}} />
            <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-900'} rounded-[2.5rem] p-6 text-white`}>
        <h4 className="font-black text-sm mb-2">Google Cloud Sync</h4>
        <p className="text-[10px] text-slate-400 leading-relaxed mb-4">Laporan bulanan PDF otomatis diunggah ke Google Docs setiap akhir bulan.</p>
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse" /></div>
           <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Sync On</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsScreen;