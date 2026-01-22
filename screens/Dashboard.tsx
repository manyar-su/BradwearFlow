
import React, { useMemo, useState } from 'react';
import { Search, Package, Clock, Sun, Moon, BellRing, Target, ArrowUpRight, ChevronRight, AlertCircle } from 'lucide-react';
import { OrderItem, JobStatus, Priority } from '../types';
// Fix: Removed isValid from date-fns import due to export errors in this environment
import { format, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

interface DashboardProps {
  orders: OrderItem[];
  onScanClick: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDarkMode: boolean;
  toggleDarkMode?: () => void;
}

const MOTIVATIONAL_QUOTES = [
  "Detail adalah kunci kualitas sejati.",
  "Setiap jahitan menceritakan dedikasi Anda.",
  "Kualitas Bradwear ada di tangan Anda.",
  "Kerja keras hari ini, sukses hari esok.",
  "Fokus pada proses, hasil mengikuti.",
  "Jadikan setiap pakaian karya seni.",
  "Disiplin adalah jembatan menuju prestasi."
];

const INDO_MONTHS: Record<string, number> = {
  'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
  'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
};

// Fix: Local helper to check if a date is valid since date-fns isValid might have import issues
const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

const parseIndoDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  try {
    // Check for "12 Januari 2026"
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = INDO_MONTHS[parts[1]];
      const year = parseInt(parts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    // Fallback to standard parser
    const d = new Date(dateStr);
    return isValidDate(d) ? d : null;
  } catch {
    return null;
  }
};

const Dashboard: React.FC<DashboardProps> = ({ orders, searchQuery, setSearchQuery, isDarkMode, toggleDarkMode }) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  
  const dailyQuote = useMemo(() => {
    const day = new Date().getDate();
    return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
  }, []);

  const stats = useMemo(() => {
    const active = orders.filter(o => o.status === JobStatus.PROSES).length;
    const completed = orders.filter(o => o.status === JobStatus.BERES).length;
    const totalPcs = orders.reduce((sum, o) => sum + o.jumlahPesanan, 0);
    return { active, completed, totalPcs, total: orders.length };
  }, [orders]);

  const priorityReminders = useMemo(() => {
    return orders
      .filter(o => o.status === JobStatus.PROSES)
      .map(o => {
        const targetDate = parseIndoDate(o.tanggalTargetSelesai);
        const days = targetDate ? differenceInDays(targetDate, new Date()) : 999;
        return { ...o, daysLeft: days };
      })
      .filter(o => o.daysLeft <= 5 || o.priority === Priority.HIGH)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="relative animate-in fade-in duration-500">
      {/* Header */}
      <div className={`sticky top-0 z-30 px-6 py-4 flex justify-between items-center backdrop-blur-md border-b transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
         <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white shadow-sm'}`}>
              <span className="text-sm font-black text-emerald-500">{format(new Date(), 'HH:mm')}</span>
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Bradwear Flow</h2>
            </div>
          </div>
          <button onClick={toggleDarkMode} className={`p-2.5 rounded-xl shadow-sm border ${isDarkMode ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-white text-slate-500 border-slate-100'}`}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
      </div>

      <div className="p-6 space-y-6 flex flex-col items-center">
        {/* Replacement Widget: Status Summary Card */}
        <div className={`w-full max-sm p-6 rounded-[2.5rem] border shadow-lg relative overflow-hidden animate-in slide-in-from-bottom-4 duration-700 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'}`}>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-emerald-50'}`}>
                <Target className="text-emerald-500" size={24} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan Aktif</p>
                <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{stats.active} Order</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {stats.totalPcs} <span className="text-sm font-bold text-slate-400">PCS</span>
                  </h3>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Total Produksi Sistem</p>
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                  <ArrowUpRight size={14} />
                  <span>+{(stats.completed / Math.max(stats.total, 1) * 100).toFixed(0)}% Done</span>
                </div>
              </div>
              
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${(stats.completed / Math.max(stats.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        {/* Marquee Motivation */}
        <div className="w-full max-w-sm overflow-hidden relative py-1 rounded-full border border-dashed border-slate-300">
          <div className="flex animate-[marquee_25s_linear_infinite] whitespace-nowrap">
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {dailyQuote} • {dailyQuote} • {dailyQuote} • {dailyQuote}
            </span>
          </div>
        </div>

        {/* Centered Search */}
        <div className="w-full max-w-sm relative group animate-in fade-in duration-700 delay-200">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari Kode Barang / Penjahit..." 
            value={localSearch} 
            onChange={(e) => setLocalSearch(e.target.value)} 
            onBlur={() => setSearchQuery(localSearch)}
            onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(localSearch)}
            className={`w-full border rounded-[1.5rem] py-4 pl-11 pr-4 focus:outline-none focus:ring-4 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:ring-emerald-500/10' : 'bg-white border-slate-100 text-slate-800 focus:ring-emerald-500/5 shadow-sm'}`} 
          />
        </div>

        {/* Reminder Section - Restored and Enhanced */}
        <div className="w-full max-w-sm space-y-4 animate-in slide-in-from-bottom-2 duration-700 delay-300">
          <div className="flex justify-between items-center px-2">
            <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
              <BellRing size={14} className="text-orange-500" /> Pengingat Target
            </h4>
          </div>
          
          {priorityReminders.length === 0 ? (
            <div className={`p-6 rounded-[2rem] border border-dashed flex flex-col items-center gap-2 ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <AlertCircle size={20} className="text-slate-300" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tidak ada deadline mendesak</p>
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-3 no-scrollbar pb-4 -mx-2 px-2">
              {priorityReminders.map(order => {
                const urgencyColor = order.daysLeft <= 1 ? 'bg-red-500' : order.daysLeft <= 3 ? 'bg-orange-500' : 'bg-blue-500';
                const urgencyBg = order.daysLeft <= 1 ? 'bg-red-50' : order.daysLeft <= 3 ? 'bg-orange-50' : 'bg-blue-50';
                const urgencyText = order.daysLeft <= 1 ? 'text-red-500' : order.daysLeft <= 3 ? 'text-orange-500' : 'text-blue-500';

                return (
                  <div key={order.id} className={`flex-shrink-0 w-64 p-5 rounded-[2.5rem] border shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${urgencyColor} text-white`}>
                        {order.daysLeft < 0 ? 'Terlambat' : order.daysLeft === 0 ? 'Hari Ini' : `${order.daysLeft} Hari Lagi`}
                      </span>
                      <span className="text-[8px] font-black text-slate-400 uppercase">#{order.kodeBarang}</span>
                    </div>
                    
                    <h5 className={`font-black text-sm truncate mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{order.model} • {order.warna}</h5>
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Package size={8} className="text-emerald-500" />
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase truncate">PJ: <span className="text-emerald-500">{order.namaPenjahit}</span></p>
                    </div>

                    <div className={`p-2 rounded-xl flex items-center justify-between ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                      <span className="text-[8px] font-black text-slate-400 uppercase">Target:</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight">{order.tanggalTargetSelesai}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex-shrink-0 w-20 flex flex-col items-center justify-center gap-2">
                <button className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-90 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400 shadow-sm'}`}>
                  <ChevronRight size={20} />
                </button>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">History</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Stats Grid */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-700 delay-500">
          <div className={`p-5 rounded-[2rem] border shadow-sm flex flex-col items-center text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'}`}>
            <Package className="text-emerald-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Berjalan</p>
            <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{stats.active}</p>
          </div>
          <div className={`p-5 rounded-[2rem] border shadow-sm flex flex-col items-center text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'}`}>
            <Clock className="text-blue-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Beres</p>
            <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{stats.completed}</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
