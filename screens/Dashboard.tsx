
import React, { useMemo, useState, useEffect } from 'react';
import { Search, Package, Clock, Sun, Moon, BellRing, Target, ArrowUpRight, ChevronRight, ChevronDown, AlertCircle, X, Info, User, Calendar, Scissors, ShieldCheck, Lock, Shield, Flame, PlusCircle, Layers, DollarSign, History, BarChart2, Send, UserCheck, Sparkles, Trash2 } from 'lucide-react';
import { OrderItem, JobStatus, Priority, PaymentStatus } from '../types';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addDays, isBefore, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { syncService } from '../services/syncService';
import DailyMotivation from '../components/DailyMotivation';

interface DashboardProps {
  orders: OrderItem[];
  onScanClick: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDarkMode: boolean;
  onViewHistory: (id?: string) => void;
  toggleDarkMode?: () => void;
  onUpdateStatus?: (id: string, status: JobStatus) => void;
  onUpdateOrder?: (order: OrderItem) => void;
  onDelete?: (id: string, searchResults?: OrderItem[]) => void;
  unreadCount?: number;
  onShowNotifications?: () => void;
  triggerConfirm?: (config: any) => void;
}

const MOTIVATIONAL_QUOTES = [
  "Detail adalah kunci kualitas sejati.",
  "Setiap jahitan menceritakan dedikasi Anda.",
  "Kualitas Bradwear ada di tangan Anda.",
  "Kerja keras hari ini, sukses hari esok.",
  "Fokus pada proses, hasil mengikuti.",
  "Jadikan setiap pakaian karya seni.",
  "Disiplin adalah jembatan menuju prestasi.",
  "Menabung hari ini, tenang di masa depan.",
  "Satu jahitan, satu langkah menuju impian.",
  "Rezeki yang ditabung adalah rezeki yang terjaga.",
  "Kualitas kerja mendatangkan pelanggan, hemat uang menjaga masa depan.",
  "Jangan habiskan semua yang kau hasilkan hari ini.",
  "Sedikit demi sedikit, lama-lama menjadi bukit.",
  "Semangat menjahit, semangat menyisihkan untuk masa depan."
];

const INDO_MONTHS: Record<string, number> = {
  'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
  'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
};

const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

const parseIndoDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  try {
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = INDO_MONTHS[parts[1]];
      const year = parseInt(parts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(dateStr);
    return isValidDate(d) ? d : null;
  } catch {
    return null;
  }
};

interface ReminderCardProps {
  order: any;
  urgencyType: 'late' | 'upcoming';
  isDarkMode: boolean;
  onClick: () => void;
  index: number;
}

const ReminderCard: React.FC<ReminderCardProps> = ({ order, urgencyType, isDarkMode, onClick, index }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const urgencyLabel = urgencyType === 'late' ? 'TERLAMBAT' : order.daysLeft === 0 ? 'HARI INI' : `${order.daysLeft} HARI LAGI`;
  const urgencyColor = urgencyType === 'late' ? 'bg-[#ef4444]' : order.daysLeft === 0 ? 'bg-orange-500' : 'bg-blue-500';

  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className={`w-full p-3 md:p-5 rounded-[1.5rem] md:rounded-[2.5rem] border shadow-sm transition-all mb-2 md:mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'}`}
    >
      <div className="flex justify-between items-start mb-2 md:mb-3">
        <span className={`text-[7px] md:text-[9px] font-black px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-tighter ${urgencyColor} text-white ${urgencyType === 'late' ? 'animate-pulse' : ''}`}>
          {urgencyLabel}
        </span>
        <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase">#{order.kodeBarang}</span>
      </div>

      <h5 className={`font-black text-xs md:text-sm truncate mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{order.model} • {order.warna}</h5>
      <div className="flex items-center gap-1 md:gap-1.5 mb-2 md:mb-3">
        <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <Package size={6} className="md:hidden text-emerald-500" />
          <Package size={8} className="hidden md:block text-emerald-500" />
        </div>
        <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase truncate">PJ: <span className="text-emerald-500">{order.namaPenjahit || 'NULL'}</span></p>
      </div>

      <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl flex items-center justify-between ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tight">TARGET:</span>
        <span className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase tracking-tight">{order.tanggalTargetSelesai}</span>
      </div>

      {/* Dropdown Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className={`w-full mt-2 md:mt-3 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-dashed flex items-center justify-center gap-1 md:gap-2 text-[7px] md:text-[8px] font-black uppercase transition-all ${isDarkMode ? 'border-slate-700 text-slate-500 hover:border-slate-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
      >
        <ChevronDown className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} size={12} />
        {isExpanded ? 'SEMBUNYIKAN' : 'LIHAT DETAIL'}
      </button>

      {/* Expanded Details */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px] mt-2 md:mt-3' : 'max-h-0'}`}>
        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl space-y-1.5 md:space-y-2 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
          {order.konsumen && (
            <div className="flex justify-between items-center">
              <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase">Konsumen:</span>
              <span className="text-[7px] md:text-[8px] font-bold text-slate-600 truncate max-w-[60%]">{order.konsumen}</span>
            </div>
          )}
          {order.cs && (
            <div className="flex justify-between items-center">
              <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase">CS:</span>
              <span className="text-[7px] md:text-[8px] font-bold text-slate-600">{order.cs}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase">Jumlah:</span>
            <span className="text-[7px] md:text-[8px] font-bold text-emerald-600">{order.jumlahPesanan} PCS</span>
          </div>
          {order.deskripsiPekerjaan && (
            <div className="pt-1 md:pt-2 border-t border-slate-200/50">
              <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase block mb-1">Deskripsi:</span>
              <p className="text-[7px] md:text-[8px] font-medium text-slate-600 leading-relaxed">{order.deskripsiPekerjaan}</p>
            </div>
          )}
          <button
            onClick={onClick}
            className={`w-full mt-2 py-1.5 md:py-2 rounded-lg md:rounded-xl font-black text-[7px] md:text-[8px] uppercase transition-all active:scale-95 ${isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'}`}
          >
            BUKA DETAIL LENGKAP
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ icon, label, value, subValue, isDarkMode, isLongText, onClick, className }: any) => (
  <div
    onClick={onClick}
    className={`flex items-start gap-4 p-5 rounded-3xl border transition-all ${className ? className : isDarkMode ? 'bg-slate-800 border-slate-700 shadow-lg' : 'bg-white border-slate-100 shadow-sm'} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
  >
    <div className={`flex-shrink-0 p-2.5 rounded-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {icon}
    </div>
    <div className="flex-1 flex flex-col gap-0.5 min-w-0">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</span>
      <span className={`font-bold leading-relaxed break-words ${isLongText ? 'text-[10px]' : 'text-xs uppercase'} ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
        {value}
      </span>
      {subValue && (
        <span className="text-[9px] font-medium text-slate-400 italic mt-1 leading-tight">
          "{subValue}"
        </span>
      )}
    </div>
    {onClick && <ChevronRight size={14} className="text-slate-300 self-center" />}
  </div>
);
const Calendar3D = ({ orders, isDarkMode }: { orders: OrderItem[], isDarkMode: boolean }) => {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = getDay(monthStart);
  const blanks = Array(startDay).fill(null);

  const getOrdersForDay = (date: Date) => {
    return orders.filter(o => {
      const targetDate = parseIndoDate(o.tanggalTargetSelesai);
      return targetDate && isSameDay(targetDate, date) && o.status !== JobStatus.BERES && !o.deletedAt;
    });
  };

  const getDayStatusColor = (date: Date, dayOrders: OrderItem[]) => {
    if (dayOrders.length === 0) return { bg: '', text: '' };

    const isLate = dayOrders.some(o => {
      const targetDate = parseIndoDate(o.tanggalTargetSelesai);
      return targetDate && isBefore(targetDate, today);
    });

    if (isLate) return { bg: 'bg-red-500 shadow-md shadow-red-500/30', text: 'text-white', pulse: 'animate-pulse-fast' };

    const daysLeft = differenceInDays(date, today);

    if (daysLeft < 0) return { bg: 'bg-red-500 shadow-md shadow-red-500/30', text: 'text-white', pulse: 'animate-pulse-fast' };
    if (daysLeft >= 3) return { bg: 'bg-emerald-500 shadow-md shadow-emerald-500/30', text: 'text-white', pulse: '' };
    if (daysLeft < 3 && daysLeft >= 0) return { bg: 'bg-orange-500 shadow-md shadow-orange-500/30', text: 'text-white', pulse: 'animate-pulse-slow' };

    return { bg: '', text: '', pulse: '' };
  };

  return (
    <div className={`w-full max-w-sm p-6 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'}`} style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-900' : 'bg-emerald-50'}`}>
            <Calendar className="text-emerald-500" size={20} />
          </div>
          <h4 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            {format(today, 'MMMM yyyy', { locale: idLocale })}
          </h4>
        </div>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => (
          <div key={i} className="text-[8px] font-black text-slate-400 text-center uppercase tracking-tighter">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {blanks.map((_, i) => <div key={`blank-${i}`} />)}
        {days.map((day, i) => {
          const dayOrders = getOrdersForDay(day);
          const { bg: colorClass, text: textColorClass, pulse: pulseClass } = getDayStatusColor(day, dayOrders);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={i}
              className={`relative flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-300 group h-12 ${colorClass ? `${colorClass} scale-105 z-10 ${pulseClass}` : isDarkMode ? 'bg-slate-900/50 hover:bg-slate-900' : 'bg-slate-50 hover:bg-slate-100'} ${isToday ? 'border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : ''}`}
            >
              <span className={`text-[11px] font-black leading-tight ${colorClass ? 'text-white' : isToday ? 'text-emerald-600' : isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {format(day, 'd')}
              </span>

              {dayOrders.length > 0 && (
                <div className="flex flex-col items-center">
                  <span className={`text-[6px] font-bold leading-none text-center ${colorClass ? 'text-white/80' : 'text-emerald-500'}`}>
                    {dayOrders[0].kodeBarang.slice(-4)}
                  </span>
                  {dayOrders.length > 1 && (
                    <span className={`text-[5px] font-bold ${colorClass ? 'text-white/60' : 'text-slate-400'}`}>
                      +{dayOrders.length - 1}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100/10 flex justify-between items-center">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
          {orders.filter(o => o.status !== JobStatus.BERES).length} Pekerjaan Berjalan
        </p>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span className="text-[7px] font-black text-slate-400 uppercase">Telat</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
            <span className="text-[7px] font-black text-slate-400 uppercase">Deadline</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-[7px] font-black text-slate-400 uppercase">Aman</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ orders, searchQuery, setSearchQuery, isDarkMode, onViewHistory, toggleDarkMode, onScanClick, onUpdateStatus, onUpdateOrder, onDelete, unreadCount = 0, onShowNotifications, triggerConfirm }) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [globalResults, setGlobalResults] = useState<OrderItem[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [showFullUserResults, setShowFullUserResults] = useState(false);
  const [fullUserResults, setFullUserResults] = useState<OrderItem[]>([]);
  const [searchedUserName, setSearchedUserName] = useState('');

  // ── Deadline popup state ──────────────────────────────────────
  const [overduePopupOrders, setOverduePopupOrders] = useState<OrderItem[]>([]);
  const [showOverduePopup, setShowOverduePopup] = useState(false);

  const activeOnly = useMemo(() => orders.filter(o => !o.deletedAt), [orders]);

  const getProfileName = () => localStorage.getItem('profileName')?.toLowerCase().trim() || 'nama anda';

  // ── Cek order yang sudah 3+ hari melewati deadline dan belum selesai ──
  useEffect(() => {
    const popupShownKey = 'bradwear_overdue_popup_shown';
    const lastShown = localStorage.getItem(popupShownKey);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Hanya tampilkan sekali per hari
    if (lastShown === todayStr) return;

    const overdue = orders.filter(o => {
      if (o.deletedAt || o.status === JobStatus.BERES) return false;
      const targetDate = parseIndoDate(o.tanggalTargetSelesai);
      if (!targetDate) return false;
      const daysOverdue = differenceInDays(today, targetDate);
      return daysOverdue >= 3; // sudah 3+ hari melewati deadline
    });

    if (overdue.length > 0) {
      setOverduePopupOrders(overdue);
      setShowOverduePopup(true);
      localStorage.setItem(popupShownKey, todayStr);
    }
  }, [orders]);

  useEffect(() => {
    const searchGlobal = async () => {
      if (localSearch.length >= 2) {
        setIsSearchingGlobal(true);
        const results = await syncService.searchGlobalOrders(localSearch);
        // Filter out orders that are already in the local 'orders' list to avoid duplicates
        const filteredGlobal = results.filter(go => !orders.some(lo => lo.id === go.id));
        setGlobalResults(filteredGlobal);
        setIsSearchingGlobal(false);
      } else {
        setGlobalResults([]);
      }
    };

    const timer = setTimeout(searchGlobal, 500);
    return () => clearTimeout(timer);
  }, [localSearch, orders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    const local = orders.find(o => o.id === selectedOrderId);
    if (local) return local;
    return globalResults.find(o => o.id === selectedOrderId) || null;
  }, [selectedOrderId, orders, globalResults]);

  const dailyQuote = useMemo(() => {
    const day = new Date().getDate();
    const hour = new Date().getHours();
    // Use day and hour to pick 2 quotes per day
    // e.g. Morning (0-11) and Afternoon (12-23)
    const quoteIndex = (day * 2 + (hour >= 12 ? 1 : 0)) % MOTIVATIONAL_QUOTES.length;
    return MOTIVATIONAL_QUOTES[quoteIndex];
  }, []);

  const stats = useMemo(() => {
    const alive = orders.filter(o => !o.deletedAt);
    const active = alive.filter(o => o.status === JobStatus.PROSES).length;
    const completed = alive.filter(o => o.status === JobStatus.BERES).length;
    const totalPcs = alive.reduce((sum, o) => sum + o.jumlahPesanan, 0);
    return { active, completed, totalPcs, total: alive.length };
  }, [orders]);

  const filteredResults = useMemo(() => {
    if (!localSearch.trim()) return [];
    return activeOnly.filter(o =>
      o.kodeBarang.toLowerCase().includes(localSearch.toLowerCase()) ||
      o.namaPenjahit.toLowerCase().includes(localSearch.toLowerCase())
    ).slice(0, 5);
  }, [localSearch, activeOnly]);

  const { lateReminders, upcomingReminders } = useMemo(() => {
    const activeReminders = orders
      .filter(o => !o.deletedAt && o.status === JobStatus.PROSES)
      .map(o => {
        const targetDate = parseIndoDate(o.tanggalTargetSelesai);
        const days = targetDate ? differenceInDays(targetDate, new Date()) : 999;
        return { ...o, daysLeft: days };
      });

    const late = activeReminders
      .filter(o => o.daysLeft < 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const upcoming = activeReminders
      .filter(o => o.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return { lateReminders: late, upcomingReminders: upcoming };
  }, [orders]);

  const isOwner = useMemo(() => {
    if (!selectedOrder) return false;
    const currentProfile = getProfileName();
    const orderTailor = selectedOrder.namaPenjahit.toLowerCase().trim();
    return orderTailor === currentProfile;
  }, [selectedOrder]);

  const handleToggleStatus = () => {
    if (!selectedOrder || !onUpdateStatus) return;
    if (!isOwner) {
      alert(`Hanya ${selectedOrder.namaPenjahit} yang bisa merubah status order ini.`);
      return;
    }
    const nextStatus = selectedOrder.status === JobStatus.BERES ? JobStatus.PROSES : JobStatus.BERES;
    onUpdateStatus(selectedOrder.id, nextStatus);
  };

  const handleToggleEmbroidery = () => {
    if (!selectedOrder || !onUpdateOrder) return;
    if (!isOwner) {
      alert(`Hanya ${selectedOrder.namaPenjahit} yang bisa merubah rincian order ini.`);
      return;
    }
    const nextStatus = selectedOrder.embroideryStatus === 'Kurang' ? 'Lengkap' : 'Kurang';
    onUpdateOrder({ ...selectedOrder, embroideryStatus: nextStatus as 'Lengkap' | 'Kurang' });
  };

  return (
    <div className="relative animate-in fade-in duration-500">
      {/* ── CSS animasi bernafas ── */}
      <style>{`
        @keyframes breatheSlow {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px 2px rgba(249,115,22,0.5); }
          50% { opacity: 0.75; box-shadow: 0 0 18px 6px rgba(249,115,22,0.8); }
        }
        @keyframes breatheFast {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px 2px rgba(239,68,68,0.5); }
          50% { opacity: 0.7; box-shadow: 0 0 20px 8px rgba(239,68,68,0.9); }
        }
        .animate-pulse-slow { animation: breatheSlow 2.5s ease-in-out infinite; }
        .animate-pulse-fast { animation: breatheFast 1.2s ease-in-out infinite; }
      `}</style>

      {/* ── Modal Deadline 3+ Hari ── */}
      {showOverduePopup && overduePopupOrders.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-16 px-5 pb-5 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertCircle size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">Cek Status Deadline!</h3>
                  <p className="text-[9px] text-white/70 font-bold uppercase">Order berikut sudah 3+ hari melewati deadline</p>
                </div>
              </div>
            </div>

            {/* List order overdue */}
            <div className="p-4 space-y-2 max-h-52 overflow-y-auto">
              {overduePopupOrders.map(o => {
                const targetDate = parseIndoDate(o.tanggalTargetSelesai);
                const daysOver = targetDate ? differenceInDays(new Date(), targetDate) : 0;
                return (
                  <div key={o.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-red-50 border-red-100'}`}>
                    <div>
                      <span className="text-xs font-black text-red-500">{o.kodeBarang}</span>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{o.konsumen || '-'} • {o.model}</p>
                    </div>
                    <span className="text-[8px] font-black text-red-400 bg-red-100 px-2 py-1 rounded-lg">+{daysOver} hari</span>
                  </div>
                );
              })}
            </div>

            {/* Pertanyaan */}
            <div className={`px-4 pb-2 pt-1 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <p className={`text-[10px] font-black uppercase text-center mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Apakah order di atas sudah selesai?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Tandai semua sebagai Selesai & Lunas
                    overduePopupOrders.forEach(o => {
                      if (onUpdateStatus) onUpdateStatus(o.id, JobStatus.BERES);
                      if (onUpdateOrder) onUpdateOrder({ ...o, status: JobStatus.BERES, paymentStatus: PaymentStatus.BAYAR, completedAt: new Date().toISOString() });
                    });
                    setShowOverduePopup(false);
                    setOverduePopupOrders([]);
                  }}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  ✓ Ya, Sudah Selesai
                </button>
                <button
                  onClick={() => setShowOverduePopup(false)}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
                >
                  Belum
                </button>
              </div>
              <p className="text-[7px] text-slate-400 text-center mt-2 pb-1">Jika Ya, order akan pindah ke Selesai & Lunas di History</p>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`relative w-full max-sm rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <button
              onClick={() => setSelectedOrderId(null)}
              className={`absolute top-6 right-6 p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
            >
              <X size={24} />
            </button>

            <div className="space-y-6 overflow-y-auto mt-4 pb-4 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`
                div::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="flex flex-col items-center gap-4 text-center">
                <h3 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  {selectedOrder.kodeBarang}
                </h3>

                <button
                  onClick={handleToggleStatus}
                  className={`px-8 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2 border-2 ${!isOwner ? 'opacity-70 grayscale' : ''} ${selectedOrder.status === JobStatus.BERES ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/20' : 'bg-[#ef4444] border-red-400 shadow-red-500/20'} text-white`}
                >
                  {!isOwner && <Lock size={10} />}
                  <div className={`w-2 h-2 rounded-full bg-white ${selectedOrder.status === JobStatus.PROSES ? 'animate-pulse' : ''}`} />
                  {selectedOrder.status === JobStatus.BERES ? 'Pekerjaan Selesai' : 'Sedang Diproses'}
                </button>

                {!isOwner && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <Shield size={10} className="text-amber-500" />
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider">Hanya Bisa Dilihat (Milik {selectedOrder.namaPenjahit})</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <DetailRow
                  icon={<Package size={20} className="text-[#10b981]" />}
                  label="Model & Warna"
                  value={`${selectedOrder.model} • ${selectedOrder.warna}`}
                  isDarkMode={isDarkMode}
                />
                <DetailRow
                  icon={<User size={20} className="text-[#3b82f6]" />}
                  label="Penjahit"
                  value={selectedOrder.namaPenjahit}
                  isDarkMode={isDarkMode}
                />
                <DetailRow
                  icon={<ShieldCheck size={20} className="text-[#10b981]" />}
                  label="Nama CS (Admin)"
                  value={selectedOrder.cs || '-'}
                  isDarkMode={isDarkMode}
                />
                <DetailRow
                  icon={<UserCheck size={20} className="text-pink-500" />}
                  label="Nama Konsumen"
                  value={selectedOrder.konsumen || '-'}
                  isDarkMode={isDarkMode}
                />
                <DetailRow
                  icon={<Calendar size={20} className="text-[#f59e0b]" />}
                  label="Target Selesai"
                  value={selectedOrder.tanggalTargetSelesai}
                  isDarkMode={isDarkMode}
                />

                <DetailRow
                  onClick={handleToggleEmbroidery}
                  icon={<Scissors size={20} className="text-[#8b5cf6]" />}
                  label="Status Bordir"
                  value={selectedOrder.embroideryStatus || 'Lengkap'}
                  subValue={selectedOrder.embroideryNotes}
                  isDarkMode={isDarkMode}
                  className={`${selectedOrder.embroideryStatus === 'Kurang' ? 'border-red-200 bg-red-50/10' : ''} ${!isOwner ? 'cursor-not-allowed opacity-80' : ''}`}
                />

                <DetailRow
                  icon={<Info size={20} className="text-[#64748b]" />}
                  label="Keterangan"
                  value={selectedOrder.deskripsiPekerjaan || 'Tidak ada catatan khusus.'}
                  isDarkMode={isDarkMode}
                  isLongText
                />

                <div className="mt-4 space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Rincian Size & Item</h5>
                  <div className="flex flex-col gap-3">
                    {selectedOrder.sizeDetails.map((sd, i) => (
                      <div key={i} className={`p-4 rounded-3xl border flex flex-col gap-3 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-center opacity-60">
                          <span className="text-[8px] font-bold uppercase tracking-widest">Detail Item #{i + 1}</span>
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500 shadow-sm'}`}>{sd.gender}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-white border-emerald-100 text-emerald-600 shadow-sm'}`}>
                              <span className="text-[8px] font-black opacity-40 leading-none">SIZE</span>
                              <span className="text-sm font-black leading-none">{sd.size}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Tangan</span>
                              <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{sd.tangan}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Jumlah</span>
                            <span className="text-sm font-black text-emerald-500">{sd.jumlah} PCS</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 p-4 rounded-2xl flex justify-between items-center border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                    <span className="text-[10px] font-black text-emerald-600/60 uppercase">Total Pesanan</span>
                    <span className="text-base font-black text-emerald-600">{selectedOrder.jumlahPesanan} PCS</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 mt-4">
                <button
                  onClick={() => {
                    const o = selectedOrder;
                    const tanggal = format(new Date(), 'd MMM yyyy', { locale: idLocale });
                    let panjangQty = 0, pendekQty = 0;
                    const panjangSizes: string[] = [];
                    const pendekSizes: string[] = [];

                    o.sizeDetails.forEach((sd: any) => {
                      const sizes = (sd.sizes && sd.sizes.length > 0) ? sd.sizes : [{ size: sd.size, jumlah: sd.jumlah }];
                      sizes.forEach((sz: any) => {
                        const entry = `${sz.size}: ${sz.jumlah} pcs`;
                        if (sd.tangan === 'Panjang') { panjangSizes.push(entry); panjangQty += sz.jumlah; }
                        else { pendekSizes.push(entry); pendekQty += sz.jumlah; }
                      });
                    });

                    let text = `*REKAPAN KERJA BRADWEAR*\n`;
                    text += `📅 ${tanggal}\n`;
                    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
                    text += `*${o.kodeBarang}*\n`;
                    text += `👤 Konsumen : ${o.konsumen || '-'}\n`;
                    text += `🧑‍💼 CS       : ${o.cs || '-'}\n`;
                    text += `👕 Model    : ${o.model}${o.warna ? ` (${o.warna})` : ''}\n\n`;
                    if (panjangSizes.length > 0) {
                      text += `🌀 *Lengan Panjang* (${panjangQty} pcs)\n`;
                      panjangSizes.forEach(s => { text += `   • ${s}\n`; });
                    }
                    if (pendekSizes.length > 0) {
                      text += `💠 *Lengan Pendek* (${pendekQty} pcs)\n`;
                      pendekSizes.forEach(s => { text += `   • ${s}\n`; });
                    }
                    text += `\n📦 *TOTAL: ${o.jumlahPesanan} PCS*\n`;
                    text += `━━━━━━━━━━━━━━━━━━━━\n`;
                    text += `🙏 _Terimakasih._`;

                    window.open(`https://wa.me/6283194190156?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="col-span-2 py-3.5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[8px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Send size={15} /> WhatsApp
                </button>
                <button
                  onClick={() => { onViewHistory(selectedOrder.id); setSelectedOrderId(null); }}
                  className={`col-span-2 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[8px] transition-all active:scale-95 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'} flex items-center justify-center gap-1.5`}
                >
                  <History size={15} /> Riwayat
                </button>
                <button
                  onClick={() => {
                    if (onDelete && isOwner) {
                      if (triggerConfirm) {
                        triggerConfirm({
                          title: 'Hapus Pesanan?',
                          message: 'Data ini akan dihapus secara permanen dari server dan riwayat.',
                          type: 'danger',
                          onConfirm: () => {
                            if (onDelete) onDelete(selectedOrder.id, globalResults || [], true);
                            setSelectedOrderId(null);
                          }
                        });
                      } else if (confirm("Hapus data ini?")) {
                        onDelete(selectedOrder.id, globalResults || []);
                        setSelectedOrderId(null);
                      }
                    }
                  }}
                  disabled={!isOwner}
                  className={`col-span-1 py-3.5 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center ${!isOwner ? 'opacity-20 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-red-500 text-white shadow-lg shadow-red-500/20 active:bg-red-600'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFullUserResults && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-slate-900 text-white border border-slate-800' : 'bg-white text-slate-800'}`}>
            <button
              onClick={() => setShowFullUserResults(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500"
            >
              <X size={24} />
            </button>

            <div className="mb-6 pr-8">
              <h3 className="text-xl font-black uppercase tracking-tight">Rincian Kerja</h3>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">
                {searchedUserName} <span className="text-slate-400 opacity-50">•</span> {fullUserResults.length} Item
              </p>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-2 no-scrollbar">
              {fullUserResults.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tidak ada data</p>
                </div>
              ) : fullUserResults.map((order, idx) => (
                <div
                  key={order.id}
                  className={`group relative flex flex-col gap-2 p-5 rounded-[2.5rem] border shadow-sm transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex justify-between items-center w-full">
                    <div
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setShowFullUserResults(false);
                      }}
                      className="flex-1 flex items-center gap-2 cursor-pointer"
                    >
                      <span className={`text-[11px] font-black px-4 py-1.5 rounded-full border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-white border-emerald-100 text-emerald-600'}`}>
                        {order.kodeBarang}
                      </span>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${order.status === JobStatus.BERES ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {order.status}
                      </span>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${order.namaPenjahit.toLowerCase().trim() === getProfileName() ? 'bg-emerald-500 text-white' : 'bg-amber-500/10 text-amber-500'}`}>
                        {order.namaPenjahit.toLowerCase().trim() === getProfileName() ? 'Milik Anda' : 'Public'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onDelete && order.namaPenjahit.toLowerCase().trim() === getProfileName() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDelete) onDelete(order.id, fullUserResults);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <ChevronRight onClick={() => { setSelectedOrderId(order.id); setShowFullUserResults(false); }} size={14} className="text-slate-300 cursor-pointer" />
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setShowFullUserResults(false);
                    }}
                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                  >
                    <p className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{order.model} • {order.warna}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={10} className="text-slate-400" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{order.tanggalTargetSelesai || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Package size={10} className="text-slate-400" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{order.jumlahPesanan} PCS</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`sticky top-0 z-30 mt-[10px] px-4 py-2 flex justify-between items-center backdrop-blur-md border-b transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-800 shadow-[0_0_8px_rgba(57,255,20,0.15)]' : 'border-slate-100 bg-white shadow-sm'}`}>
            <div className="w-5 h-5 bg-black rounded flex items-center justify-center p-0.5 border border-[#39FF14]/50">
              <span className="text-[5px] font-black leading-none text-center" style={{ color: '#39FF14', textShadow: '0 0 2px #39FF14' }}>BRAD<br />WEAR</span>
            </div>
            <span className={`text-xs font-black ${isDarkMode ? 'text-[#39FF14]' : 'text-[#10b981]'}`}>{format(new Date(), 'HH:mm')}</span>
          </div>
          <h2 className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Bradwear Flow</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onShowNotifications}
            className={`relative p-2 rounded-lg shadow-sm border transition-all active:scale-90 ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-500 border-slate-100'}`}
          >
            <BellRing size={16} className={unreadCount > 0 ? 'animate-bounce text-emerald-500' : ''} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[6px] font-black border border-white shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg shadow-sm border transition-all active:scale-90 ${isDarkMode ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-white text-slate-500 border-slate-100'}`}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Daily Motivation Component */}
      <DailyMotivation isDarkMode={isDarkMode} />

      <div className="p-6 space-y-6 flex flex-col items-center">
        {/* Hero Section */}
        <div className="w-full max-sm text-center mb-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className={`text-2xl font-black tracking-tighter mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Halo, {localStorage.getItem('profileName') || 'Penjahit'}!
          </h1>
          <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">Tetap Semangat & Pantau Target Produksi</p>
        </div>

        {/* Dynamic Motivation Card */}
        <div className={`w-full max-w-sm rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl animate-in fade-in zoom-in duration-700 delay-100 ${new Date().getDay() % 3 === 0 ? 'bg-gradient-to-br from-indigo-600 to-purple-700' :
          new Date().getDay() % 3 === 1 ? 'bg-gradient-to-br from-emerald-600 to-teal-700' :
            'bg-gradient-to-br from-orange-500 to-pink-600'
          } text-white`}>
          <Sparkles size={40} className="absolute -top-4 -right-4 opacity-20 rotate-12" />
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-4 block">Daily Motivation</span>
            <p className="text-lg font-black leading-tight italic mb-6">
              "{dailyQuote}"
            </p>
            <div className="flex items-center gap-3">
              <div className="h-0.5 flex-1 bg-white/20 rounded-full" />
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <Flame size={16} className="text-white animate-pulse" />
              </div>
            </div>
          </div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className={`w-full max-sm p-6 rounded-[2.5rem] border shadow-lg relative overflow-hidden animate-in slide-in-from-bottom-4 duration-700 delay-200 ${isDarkMode ? 'bg-slate-900 border-emerald-500/20 shadow-emerald-500/5' : 'bg-white border-slate-100'}`}>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <Target size={24} />
              </div>
              <div className="text-right">
                <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400`}>Pekerjaan Aktif</p>
                <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Target Produksi</p>
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
                <div className={`flex items-center gap-1 text-xs font-bold text-emerald-500`}>
                  <ArrowUpRight size={14} />
                  <span>{(stats.completed / Math.max(stats.total, 1) * 100).toFixed(0)}% Selesai</span>
                </div>
              </div>

              <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div
                  className={`h-full transition-all duration-1000 bg-emerald-500`}
                  style={{ width: `${(stats.completed / Math.max(stats.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <Calendar3D orders={orders} isDarkMode={isDarkMode} />

        <div className="w-full max-w-sm overflow-hidden relative py-1 rounded-full border border-dashed border-slate-300 animate-in fade-in duration-1000 delay-500">
          <div className="flex animate-[marquee_25s_linear_infinite] whitespace-nowrap">
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              PANTAU PEKERJAAN • BRADWEAR FLOW • PENJAHIT PRODUCTION • SEMANGAT BEKERJA • QUALITY FIRST
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm relative z-40 animate-in fade-in duration-700 delay-200">
          <div className="relative group mb-3">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${localSearch ? 'text-[#10b981]' : 'text-slate-400'}`} size={18} />
            <input
              type="text"
              placeholder="Cari Kode Barang / Penjahit..."
              value={localSearch}
              onFocus={() => setShowSearchResults(true)}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setSearchQuery(e.target.value);
              }}
              className={`w-full border rounded-[1.5rem] py-4 pl-11 pr-10 focus:outline-none focus:ring-4 transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:ring-emerald-500/10' : 'bg-white border-slate-100 text-slate-800 focus:ring-emerald-500/5'}`}
            />
            {localSearch && (
              <button onClick={() => { setLocalSearch(''); setSearchQuery(''); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 p-1">
                <X size={16} />
              </button>
            )}
          </div>

          {showSearchResults && localSearch.trim() && (
            <div className={`absolute left-0 right-0 mt-2 p-2 rounded-3xl border shadow-2xl animate-in slide-in-from-top-2 duration-300 z-50 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              {(filteredResults.length === 0 && globalResults.length === 0) ? (
                <div className="p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    {isSearchingGlobal ? 'Mencari Antar Perangkat...' : 'Tidak ditemukan'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {/* Local Results */}
                  {filteredResults.map(order => (
                    <div
                      key={order.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'}`}
                    >
                      <div
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setShowSearchResults(false);
                        }}
                        className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                      >
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-emerald-50'} text-[#10b981]`}>
                          <Package size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-black uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{order.kodeBarang}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate">PJ: {order.namaPenjahit}</p>
                            <span className={`text-white text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${order.status === JobStatus.BERES ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {onDelete && order.namaPenjahit.toLowerCase().trim() === getProfileName() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDelete) onDelete(order.id, filteredResults);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <ChevronRight
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setShowSearchResults(false);
                          }}
                          size={14} className="text-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Global Results */}
                  {globalResults.map(order => (
                    <div
                      key={order.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all border border-dashed ${isDarkMode ? 'border-slate-700 hover:bg-slate-900' : 'border-blue-100 bg-blue-50/20 hover:bg-blue-50'}`}
                    >
                      <div
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setShowSearchResults(false);
                        }}
                        className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                      >
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-900' : 'bg-blue-50'} text-blue-500`}>
                          <PlusCircle size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-black uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{order.kodeBarang}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate">PJ: {order.namaPenjahit}</p>
                            <span className={`text-white text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${order.status === JobStatus.BERES ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                              {order.status}
                            </span>
                            <span className={`text-white text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${order.namaPenjahit.toLowerCase().trim() === getProfileName() ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                              {order.namaPenjahit.toLowerCase().trim() === getProfileName() ? 'Milik Anda' : 'Public'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {onDelete && order.namaPenjahit.toLowerCase().trim() === getProfileName() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(order.id, globalResults);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <ChevronRight
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setShowSearchResults(false);
                          }}
                          size={14} className="text-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="h-[1px] bg-slate-100/10 mx-2 my-1" />
                  <button
                    onClick={() => {
                      // Jika pencarian mengandung nama user, tampilkan popup rincian user
                      const lowerSearch = localSearch.toLowerCase();
                      const allRelated = [...orders, ...globalResults].filter(o =>
                        o.namaPenjahit.toLowerCase().includes(lowerSearch) ||
                        o.kodeBarang.toLowerCase().includes(lowerSearch)
                      );

                      // Cari nama user yang paling pas dari hasil
                      const userMatch = allRelated.find(o => o.namaPenjahit.toLowerCase().includes(lowerSearch));

                      if (userMatch) {
                        setFullUserResults(allRelated);
                        setSearchedUserName(userMatch.namaPenjahit);
                        setShowFullUserResults(true);
                      } else {
                        // Fallback ke history jika tidak ada user match yang jelas
                        setSearchQuery(localSearch);
                        onViewHistory();
                      }
                      setShowSearchResults(false);
                    }}
                    className="w-full py-3 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] text-center hover:bg-emerald-500/5 transition-colors"
                  >
                    Lihat Semua Hasil
                  </button>
                </div>
              )}
            </div>
          )}
          {showSearchResults && (
            <div className="fixed inset-0 z-[-1]" onClick={() => setShowSearchResults(false)} />
          )}
        </div>

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

        <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-2 duration-700 delay-300">
          <div className="px-2">
            <h4 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 mb-4">
              <BellRing size={14} className="text-orange-500" /> Pengingat Target
            </h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Flame size={12} className="text-red-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Terlambat</span>
            </div>
            {lateReminders.length === 0 ? (
              <div className={`mx-2 p-5 rounded-[2rem] border border-dashed flex items-center justify-center gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'}`}>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aman, Tidak ada yang terlambat</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-2">
                {lateReminders.map((order, idx) => (
                  <ReminderCard key={order.id} order={order} urgencyType="late" isDarkMode={isDarkMode} onClick={() => setSelectedOrderId(order.id)} index={idx} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Clock size={12} className="text-blue-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Mendatang</span>
            </div>
            {upcomingReminders.length === 0 ? (
              <div className={`mx-2 p-5 rounded-[2rem] border border-dashed flex items-center justify-center gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'}`}>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Belum ada target baru</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-2">
                {upcomingReminders.map((order, idx) => (
                  <ReminderCard key={order.id} order={order} urgencyType="upcoming" isDarkMode={isDarkMode} onClick={() => setSelectedOrderId(order.id)} index={idx} />
                ))}
              </div>
            )}
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
