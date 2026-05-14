
import React, { useState, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Search, Trash2, CheckCircle, Send, FileText, Info, Calendar, User, UserCheck, X, Package, ShieldCheck, Clock, Filter, CalendarDays, ArrowUpDown, ListFilter, CloudUpload, Globe, Edit3, CreditCard, Wallet, AlertCircle, Lock, DollarSign, Sparkles, Layers, RotateCcw, AlertTriangle, ChevronDown } from 'lucide-react';
import { PRICE_LIST as DEFAULT_PRICE_LIST, OrderItem, JobStatus, Priority, PaymentStatus } from '../types';
import { syncService } from '../services/syncService';
import { differenceInDays, format, isSameWeek, isSameMonth, isSameYear, startOfWeek } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

interface HistoryScreenProps {
  orders: OrderItem[];
  onDelete: (id: string, searchResults?: OrderItem[]) => void;
  onBulkDelete?: (ids: string[], permanent: boolean) => void;
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onBulkUpdateStatus?: (ids: string[], status: JobStatus, paymentStatus?: PaymentStatus) => void;
  onUpdatePayment?: (id: string, status: PaymentStatus) => void;
  onEdit: (order: OrderItem) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDarkMode: boolean;
  targetId?: string | null;
  clearTargetId?: () => void;
  triggerConfirm: (config: any) => void;
}

type FilterMode = 'TERDEKAT' | 'SUDAH DIBAYAR' | 'BELUM DIBAYAR' | 'SEMUA';

const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ orders, onDelete, onBulkDelete, onUpdateStatus, onBulkUpdateStatus, onUpdatePayment, onEdit, searchQuery, setSearchQuery, isDarkMode, targetId, clearTargetId, triggerConfirm }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>('SEMUA');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderItem | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEarningOrder, setSelectedEarningOrder] = useState<OrderItem | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const closeModal = () => {
    setIsModalClosing(true);
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedOrderDetails(null);
      setIsModalClosing(false);
    }, 320);
  };

  // Trigger open animation setelah mount
  React.useEffect(() => {
    if (selectedOrderDetails) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsModalOpen(true));
      });
    }
  }, [selectedOrderDetails?.id]);
  const itemsRef = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (targetId) {
      setTimeout(() => {
        const el = itemsRef.current[targetId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-emerald-500', 'ring-opacity-50');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-emerald-500', 'ring-opacity-50');
            if (clearTargetId) clearTargetId();
          }, 2000);
        }
      }, 300);
    }
  }, [targetId]);

  const processedOrders = useMemo(() => {
    const now = new Date();
    // Deduplicate: hapus duplikat berdasarkan id saja
    const seenIds = new Set<string>();
    const deduped = orders.filter(o => {
      if (seenIds.has(o.id)) return false;
      seenIds.add(o.id);
      return true;
    });
    let filtered = deduped.filter(o => {
      const matchSearch =
        o.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.namaPenjahit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.konsumen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.sizeDetails.some(s => s.size.toLowerCase().includes(searchQuery.toLowerCase()) || s.namaPerSize?.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      const orderStatusMatch = true; // Placeholder for other filters if needed

      const targetDateStr = o.tanggalTargetSelesai;
      let daysLeft = 999;
      try {
        if (targetDateStr) {
          const targetDate = targetDateStr.includes('-')
            ? new Date(targetDateStr.split('-').reverse().join('-'))
            : new Date(targetDateStr);
          if (isValidDate(targetDate)) {
            daysLeft = differenceInDays(targetDate, now);
          }
        }
      } catch (e) { }

      switch (filterMode) {
        case 'TERDEKAT': return daysLeft >= 0 && daysLeft <= 7;
        case 'SUDAH DIBAYAR': return o.paymentStatus === PaymentStatus.BAYAR;
        case 'BELUM DIBAYAR': return o.paymentStatus === PaymentStatus.BELUM || !o.paymentStatus;
        default: return true;
      }
    });

    if (filterMode === 'TERDEKAT') {
      return filtered.sort((a, b) => {
        const da = differenceInDays(new Date(a.tanggalTargetSelesai), now);
        const db = differenceInDays(new Date(b.tanggalTargetSelesai), now);
        return da - db;
      });
    }
    return filtered;
  }, [orders, searchQuery, filterMode]);

  const { activeItems, completedPaidItems, completedUnpaidItems, groupedPaidItems, groupedUnpaidItems } = useMemo(() => {
    const active = processedOrders.filter(o => o.status !== JobStatus.BERES);
    const completed = processedOrders.filter(o => o.status === JobStatus.BERES);
    const completedPaid = completed.filter(o => o.paymentStatus === PaymentStatus.BAYAR);
    const completedUnpaid = completed.filter(o => o.paymentStatus !== PaymentStatus.BAYAR);

    // Helper: get week key "YYYY-Www" from a date (Monday-based)
    const getWeekKey = (d: Date) => {
      const monday = startOfWeek(d, { weekStartsOn: 1 });
      return format(monday, 'yyyy-MM-dd'); // key = monday of that week
    };

    // Grouping completedPaid by WEEK based on completedAt
    const groupedPaid: Record<string, OrderItem[]> = {};
    completedPaid.forEach(o => {
      let weekKey = 'Tanpa Tanggal';
      if (o.completedAt) {
        try { weekKey = getWeekKey(new Date(o.completedAt)); } catch { }
      }
      if (!groupedPaid[weekKey]) groupedPaid[weekKey] = [];
      groupedPaid[weekKey].push(o);
    });

    // Grouping completedUnpaid by DATE (full date) based on completedAt
    const groupedUnpaid: Record<string, OrderItem[]> = {};
    completedUnpaid.forEach(o => {
      let dateKey = 'Tanpa Tanggal';
      if (o.completedAt) {
        try {
          const d = new Date(o.completedAt);
          dateKey = format(d, 'yyyy-MM-dd');
        } catch { dateKey = 'Tanpa Tanggal'; }
      }
      if (!groupedUnpaid[dateKey]) groupedUnpaid[dateKey] = [];
      groupedUnpaid[dateKey].push(o);
    });

    // Sort by date descending (newest first)
    const sortedGroupedPaid = Object.entries(groupedPaid).sort((a, b) => b[0].localeCompare(a[0]));
    const sortedGroupedUnpaid = Object.entries(groupedUnpaid).sort((a, b) => b[0].localeCompare(a[0]));

    return { 
      activeItems: active, 
      completedPaidItems: completedPaid, 
      completedUnpaidItems: completedUnpaid, 
      groupedPaidItems: sortedGroupedPaid,
      groupedUnpaidItems: sortedGroupedUnpaid
    };
  }, [processedOrders]);

  // Set all groups as collapsed by default
  React.useEffect(() => {
    const allDateKeys = [
      ...groupedPaidItems.map(([date]) => `paid-${date}`),
      ...groupedUnpaidItems.map(([date]) => `unpaid-${date}`)
    ];
    setCollapsedGroups(new Set(allDateKeys));
  }, [groupedPaidItems.length, groupedUnpaidItems.length]); // Only run when number of groups changes

  const calculateOrderEarning = (order: OrderItem) => {
    const prices = JSON.parse(localStorage.getItem('bradwear_price_list') || JSON.stringify(DEFAULT_PRICE_LIST));
    const modelName = order.model.toUpperCase();
    const isCelana = modelName.includes('CELANA');
    const isRompi = modelName.includes('ROMPI');
    
    return order.sizeDetails.reduce((sum, sd) => {
      let price = 0;
      if (isRompi) price = prices['ROMPI'] || prices['DEFAULT'] || 0;
      else if (isCelana) {
        const isFormal = modelName.includes('FORMAL');
        const key = isFormal ? 'CELANA_FORMAL' : 'CELANA_PDL';
        price = prices[key] || prices['CELANA_PDL'] || prices['DEFAULT'] || 0;
      } else {
        const cat = sd.tangan === 'Panjang' ? 'KPLJ' : 'KLPD';
        price = prices[`${modelName}_${cat}`] || prices[modelName] || prices['DEFAULT'] || 0;
      }
      
      const qty = sd.sizes && sd.sizes.length > 0 ? sd.sizes.reduce((s, si) => s + (si.jumlah || 0), 0) : (sd.jumlah || 0);
      return sum + (price * qty);
    }, 0);
  };

  const toggleGroupCollapse = (dateKey: string) => {
    const next = new Set(collapsedGroups);
    if (next.has(dateKey)) {
      next.delete(dateKey);
    } else {
      next.add(dateKey);
    }
    setCollapsedGroups(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (itemIds: string[]) => {
    const next = new Set(selectedIds);
    const allSelected = itemIds.every(id => next.has(id));
    if (allSelected) itemIds.forEach(id => next.delete(id)); else itemIds.forEach(id => next.add(id));
    setSelectedIds(next);
  };

  const handleShareWhatsApp = () => {
    const selected = orders.filter(o => selectedIds.has(o.id));
    if (selected.length === 0) return;
    
    triggerConfirm({
      title: 'Kirim ke WhatsApp?',
      message: `${selected.length} item akan dikirim ke WhatsApp dan status pembayaran otomatis berubah menjadi Lunas. Lanjutkan?`,
      type: 'warning',
      onConfirm: () => {
        const modelTanganTotals: Record<string, number> = {};
        let grandTotal = 0;

        const tanggal = format(new Date(), 'EEEE, d MMMM yyyy', { locale: idLocale });
        const jam = format(new Date(), 'HH:mm', { locale: idLocale });

        let text = '';
        text += `╔══════════════════════╗\n`;
        text += `║  🧵 *REKAPAN BRADWEAR* 🧵  ║\n`;
        text += `╚══════════════════════╝\n`;
        text += `📅 *${tanggal}*\n`;
        text += `🕐 Dikirim pukul ${jam} WIB\n`;
        text += `\n`;

        selected.forEach((o, idx) => {
          let panjangQty = 0, pendekQty = 0;
          const panjangSizes: string[] = [];
          const pendekSizes: string[] = [];

          o.sizeDetails.forEach(sd => {
            const sizes = (sd.sizes && sd.sizes.length > 0) ? sd.sizes : [{ size: sd.size, jumlah: sd.jumlah }];
            sizes.forEach(sz => {
              const entry = `${sz.size} → ${sz.jumlah} pcs`;
              if (sd.tangan === 'Panjang') {
                panjangSizes.push(entry);
                panjangQty += sz.jumlah;
              } else {
                pendekSizes.push(entry);
                pendekQty += sz.jumlah;
              }
            });
          });

          const itemTotal = panjangQty + pendekQty;

          text += `┌─────────────────────\n`;
          text += `│ 🏷️ *Order #${idx + 1}* — Kode *${o.kodeBarang}*\n`;
          text += `├─────────────────────\n`;
          text += `│ 👤 Konsumen  : *${o.konsumen || '-'}*\n`;
          text += `│ 🧑‍💼 CS Admin  : ${o.cs || '-'}\n`;
          text += `│ 👕 Model     : *${o.model}*${o.warna ? ` (${o.warna})` : ''}\n`;
          text += `│ 📦 Total     : *${itemTotal} pcs*\n`;
          text += `├─────────────────────\n`;

          if (panjangSizes.length > 0) {
            text += `│ 🟦 *Lengan Panjang* (${panjangQty} pcs)\n`;
            panjangSizes.forEach(s => { text += `│    • ${s}\n`; });
          }
          if (pendekSizes.length > 0) {
            text += `│ � *Lengan Pendek* (${pendekQty} pcs)\n`;
            pendekSizes.forEach(s => { text += `│    • ${s}\n`; });
          }

          text += `└─────────────────────\n`;
          text += `\n`;

          const modelKey = o.model.toUpperCase();
          if (panjangQty > 0) {
            const k = `${modelKey} - Lengan Panjang`;
            modelTanganTotals[k] = (modelTanganTotals[k] || 0) + panjangQty;
          }
          if (pendekQty > 0) {
            const k = `${modelKey} - Lengan Pendek`;
            modelTanganTotals[k] = (modelTanganTotals[k] || 0) + pendekQty;
          }
          grandTotal += itemTotal;
        });

        // Ringkasan
        text += `╔══════════════════════╗\n`;
        text += `║   📊 *RINGKASAN TOTAL*   ║\n`;
        text += `╚══════════════════════╝\n`;
        Object.entries(modelTanganTotals).forEach(([key, qty]) => {
          text += `  ✅ ${key}: *${qty} pcs*\n`;
        });
        text += `\n`;
        text += `🎯 *GRAND TOTAL: ${grandTotal} PCS*\n`;
        text += `\n`;
        text += `🙏 _Terima kasih, Bradwear!_ ✨`;

        window.open(`https://wa.me/6283194190156?text=${encodeURIComponent(text)}`, '_blank');

        // Update LUNAS → YA, pertahankan status masing-masing item
        selected.forEach(o => {
          if (onUpdatePayment) onUpdatePayment(o.id, PaymentStatus.BAYAR);
        });
        if (onBulkUpdateStatus) {
          const prosesIds = selected.filter(o => o.status === JobStatus.PROSES).map(o => o.id);
          const beresIds = selected.filter(o => o.status === JobStatus.BERES).map(o => o.id);
          if (prosesIds.length > 0) onBulkUpdateStatus(prosesIds, JobStatus.PROSES, PaymentStatus.BAYAR);
          if (beresIds.length > 0) onBulkUpdateStatus(beresIds, JobStatus.BERES, PaymentStatus.BAYAR);
        }
        setSelectedIds(new Set());
      }
    });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const handleStatusComplete = useCallback((orderId: string, kodeBarang: string) => {
    setCompletingIds(prev => new Set(prev).add(orderId));
    setTimeout(() => {
      onUpdateStatus(orderId, JobStatus.BERES);
      setCompletingIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
      showToast(`✅ ${kodeBarang} dipindahkan ke Selesai`);
    }, 500);
  }, [onUpdateStatus]);

  const formatDateIndo = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      let d = dateStr.includes('-') ? new Date(dateStr.split('-').reverse().join('-')) : new Date(dateStr);
      return isValidDate(d) ? format(d, 'EEEE, d MMMM yyyy', { locale: idLocale }) : dateStr;
    } catch { return dateStr; }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    triggerConfirm({
      title: 'PINDAHKAN KE TEMPAT SAMPAH?',
      message: `Pindahkan ${selectedIds.size} data ke tempat sampah? Anda bisa mengembalikannya dari menu Akun.`,
      type: 'warning',
      onConfirm: () => { 
        const selectedIdArray = Array.from(selectedIds);
        if (onBulkDelete) {
          // Soft delete (permanent = false)
          onBulkDelete(selectedIdArray, false);
        } else {
          // Fallback jika bulk delete tidak tersedia
          selectedIds.forEach(id => onDelete(id));
        }
        setSelectedIds(new Set());
      }
    });
  };

  const handleBulkRestore = () => {
    if (selectedIds.size === 0) return;
    triggerConfirm({
      title: 'PULIHKAN?',
      message: `Kembalikan ${selectedIds.size} data ke antrean proses?`,
      type: 'warning',
      onConfirm: () => { 
        const selectedIdArray = Array.from(selectedIds);
        if (onBulkUpdateStatus) {
          onBulkUpdateStatus(selectedIdArray, JobStatus.PROSES, PaymentStatus.BELUM);
        } else {
          // Fallback jika bulk update tidak tersedia
          selectedIds.forEach(id => { 
            onUpdateStatus(id, JobStatus.PROSES); 
            if (onUpdatePayment) onUpdatePayment(id, PaymentStatus.BELUM); 
          });
        }
        setSelectedIds(new Set());
      }
    });
  };

  const InfoBox = ({ label, value, icon, isDarkMode }: any) => (
    <div className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
      <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
      <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-slate-400">{label}</span><span className="text-[11px] font-bold uppercase">{value || '-'}</span></div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-[#f4f7f9]'}`}>
      {/* Sticky Header */}
      <div className={`sticky top-0 z-50 pt-4 pb-3 px-4 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f4f7f9]'}`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>History Kerja</h2>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Cari kode, penjahit, konsumen..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`w-full py-3 pl-10 pr-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100'}`} />
        </div>
        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(['SEMUA', 'TERDEKAT', 'SUDAH DIBAYAR', 'BELUM DIBAYAR'] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterMode(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                filterMode === f
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {f === 'SEMUA' ? 'Semua' : f === 'TERDEKAT' ? '⏰ Deadline' : f === 'SUDAH DIBAYAR' ? '✅ Lunas' : '⚠️ Belum Lunas'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-32 space-y-3">
        {activeItems.map(order => {
          const isSelected = selectedIds.has(order.id);
          const isExpanded = expandedDetails.has(order.id);
          const isCompleting = completingIds.has(order.id);
          return (
            <div
              key={order.id}
              ref={el => { itemsRef.current[order.id] = el; }}
              className={`rounded-2xl border transition-all duration-500 overflow-hidden ${
                isCompleting ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none' : 'opacity-100 scale-100'
              } ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-lg' : isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}
            >
              {/* Top row: checkbox + kode + tanggal */}
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelect(order.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
                  >
                    {isSelected && <CheckCircle size={10} strokeWidth={4} />}
                  </button>
                  <span className="text-xs font-black text-emerald-500">{order.kodeBarang}</span>
                </div>
                <span className="text-[8px] font-bold text-slate-400 uppercase">{formatDateIndo(order.tanggalTargetSelesai)}</span>
              </div>

              {/* Model + info baris */}
              <div className="px-3 pb-2">
                <h4 className={`text-sm font-black uppercase leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{order.model}{order.warna ? ` • ${order.warna}` : ''}</h4>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <span className="text-[9px] font-bold text-slate-400">Penjahit:</span>
                  <span className="text-[9px] font-black text-slate-600">{order.namaPenjahit}</span>
                  <span className="text-[9px] text-slate-300 mx-0.5">|</span>
                  <span className="text-[9px] font-bold text-slate-400">Konsumen:</span>
                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full">{order.konsumen || '-'}</span>
                </div>
              </div>

              {/* Rincian collapsible */}
              <div className={`mx-3 mb-2 rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <button
                  onClick={() => { const next = new Set(expandedDetails); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); setExpandedDetails(next); }}
                  className="w-full px-3 py-2 flex justify-between items-center"
                >
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Rincian ({order.jumlahPesanan} PCS)</span>
                  <ChevronDown className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} size={14} />
                </button>
                <div className={`overflow-hidden transition-all duration-400 ${isExpanded ? 'max-h-[600px] px-2 pb-2 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-1.5">
                    {order.sizeDetails.map((sd, i) => {
                      const sizeList = (sd.sizes && sd.sizes.length > 0) ? sd.sizes : [{ size: sd.size, jumlah: sd.jumlah }];
                      return sizeList.map((sizeItem, sIdx) => (
                        <div key={`${i}-${sIdx}`} className={`flex items-center justify-between px-2 py-1.5 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-[10px]">{sizeItem.size}</div>
                            <span className="text-xs font-black text-emerald-500">{sizeItem.jumlah} PCS</span>
                          </div>
                          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
                            <span>{sd.gender}</span>
                            <span className="text-slate-300">·</span>
                            <span>{sd.tangan || '-'}</span>
                          </div>
                        </div>
                      ));
                    })}
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between px-3 pb-3 gap-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleStatusComplete(order.id, order.kodeBarang)}
                    className="px-2.5 py-1.5 bg-orange-500 text-white rounded-lg font-black text-[8px] uppercase tracking-tight"
                  >
                    STATUS: {order.status}
                  </button>
                  <button
                    onClick={() => {
                      if (!onUpdatePayment) return;
                      const next = order.paymentStatus === PaymentStatus.BAYAR ? PaymentStatus.BELUM : PaymentStatus.BAYAR;
                      onUpdatePayment(order.id, next);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-tight transition-all ${
                      order.paymentStatus === PaymentStatus.BAYAR
                        ? 'bg-emerald-500 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    LUNAS: {order.paymentStatus === PaymentStatus.BAYAR ? 'YA' : 'TIDAK'}
                  </button>
                </div>
                <div className="flex gap-2 text-slate-400">
                  <button onClick={() => onEdit(order)}><Edit3 size={15} /></button>
                  <button onClick={() => setSelectedOrderDetails(order)}><Info size={15} /></button>
                </div>
              </div>
            </div>
          );
        })}

      {groupedUnpaidItems.length > 0 && (
        <div className="mt-12 space-y-10">
          <div className="flex items-center gap-3 px-4">
            <div className="h-[1px] flex-1 bg-slate-200" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Selesai Belum Lunas</span>
            <div className="h-[1px] flex-1 bg-slate-200" />
          </div>

          {groupedUnpaidItems.map(([date, items]) => {
            // Format tanggal untuk display
            let displayDate = 'Tanpa Tanggal';
            if (date !== 'Tanpa Tanggal') {
              try {
                const d = new Date(date);
                displayDate = format(d, 'EEEE, d MMMM yyyy', { locale: idLocale }).toUpperCase();
              } catch (e) {
                displayDate = date;
              }
            }
            const groupKey = `unpaid-${date}`;
            const isCollapsed = collapsedGroups.has(groupKey);
            
            return (
            <div key={date} className={`overflow-hidden rounded-2xl border-2 shadow-xl transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-amber-500/10'}`}>
               {/* Header Tanggal - Clickable */}
               <button 
                 onClick={() => toggleGroupCollapse(groupKey)}
                 className={`w-full flex items-center gap-2 md:gap-4 p-3 md:p-5 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-100'} hover:bg-amber-50/5 transition-colors`}
               >
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-amber-50 text-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0"><AlertCircle size={20} className="md:hidden" /><AlertCircle size={28} className="hidden md:block" /></div>
                  <div className="flex-1 text-left min-w-0">
                     <h4 className="text-xs md:text-base font-black uppercase text-amber-600 truncate">{displayDate}</h4>
                     <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">Selesai - Menunggu Pembayaran</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl px-2 py-1 md:px-4 md:py-2 flex flex-col items-center shrink-0">
                     <span className="text-sm md:text-lg font-black text-slate-400">{items.length}</span>
                     <span className="text-[6px] md:text-[7px] font-black text-slate-300">ITEM</span>
                  </div>
                  <ChevronDown className={`transition-transform duration-300 text-slate-400 shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} size={16} />
               </button>

               {/* Tabel Items - Collapsible */}
               <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-h-0' : 'max-h-[2000px]'}`}>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-50">
                           <th className="px-3 py-4 w-12">
                              <button
                                onClick={() => toggleSelectAll(items.map(o => o.id))}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${items.every(o => selectedIds.has(o.id)) && items.length > 0 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
                              >
                                {items.every(o => selectedIds.has(o.id)) && items.length > 0 && <CheckCircle size={10} strokeWidth={4} />}
                              </button>
                           </th>
                           <th className="px-3 py-4">Kode / Konsumen</th>
                           <th className="px-3 py-4">Model</th>
                           <th className="px-3 py-4 text-center w-16">Qty</th>
                           <th className="px-3 py-4 text-right w-16">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {items.map(o => {
                          const isSelected = selectedIds.has(o.id);
                          return (
                            <tr key={o.id} onClick={() => toggleSelect(o.id)} className={`text-[10px] font-bold cursor-pointer transition-colors ${isSelected ? (isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''}`}>
                               <td className="px-3 py-4">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                    {isSelected && <CheckCircle size={10} strokeWidth={4} />}
                                  </div>
                               </td>
                               <td className="px-3 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-emerald-500 font-black">{o.kodeBarang}</span>
                                    <span className="text-[8px] opacity-40">{o.konsumen || '-'}</span>
                                 </div>
                               </td>
                               <td className="px-3 py-4 uppercase truncate max-w-[100px]">{o.model}</td>
                               <td className="px-3 py-4 text-center">{o.jumlahPesanan}</td>
                               <td className="px-3 py-4 text-right">
                                  <button onClick={(e) => { e.stopPropagation(); setSelectedOrderDetails(o); }} className="p-1.5 text-blue-500 inline-flex items-center justify-center"><Info size={16} /></button>
                               </td>
                            </tr>
                          );
                        })}
                     </tbody>
                  </table>
               </div>
               {/* Totals row for selected items in this unpaid group */}
               {(() => {
                 const groupSelected = items.filter(o => selectedIds.has(o.id));
                 if (groupSelected.length === 0) return null;
                 const selPcs = groupSelected.reduce((s, o) => s + o.jumlahPesanan, 0);
                 const selHarga = groupSelected.reduce((s, o) => s + calculateOrderEarning(o), 0);
                 return (
                   <div className={`px-3 py-3 border-t flex items-center justify-between gap-2 ${isDarkMode ? 'bg-amber-500/10 border-slate-700' : 'bg-amber-50 border-amber-100'}`}>
                     <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{groupSelected.length} dipilih</span>
                     <div className="flex items-center gap-3">
                       <div className="flex flex-col items-end">
                         <span className="text-[7px] font-black text-slate-400 uppercase">Total PCS</span>
                         <span className="text-xs font-black text-amber-600">{selPcs} pcs</span>
                       </div>
                       <div className="w-px h-6 bg-amber-200" />
                       <div className="flex flex-col items-end">
                         <span className="text-[7px] font-black text-slate-400 uppercase">Est. Harga</span>
                         <span className="text-xs font-black text-emerald-600">Rp {selHarga.toLocaleString('id-ID')}</span>
                       </div>
                       <div className="w-px h-6 bg-amber-200" />
                       <button
                         onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(); }}
                         className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all"
                       >
                         <Send size={12} className="shrink-0" />
                         <span>WA</span>
                       </button>
                     </div>
                   </div>
                 );
               })()}
               </div>
            </div>
            );
          })}
        </div>
      )}

      {groupedPaidItems.length > 0 && (
        <div className="mt-12 space-y-10">
          <div className="flex items-center gap-3 px-4">
            <div className="h-[1px] flex-1 bg-slate-200" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selesai & Lunas</span>
            <div className="h-[1px] flex-1 bg-slate-200" />
          </div>

          {groupedPaidItems.map(([date, items]) => {
            // Weekly group: date = monday of the week (yyyy-MM-dd)
            let displayDate = 'Tanpa Tanggal';
            if (date !== 'Tanpa Tanggal') {
              try {
                const monday = new Date(date);
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                const fmt = (d: Date) => format(d, 'd MMM', { locale: idLocale });
                const year = format(monday, 'yyyy');
                displayDate = `${fmt(monday)} – ${fmt(sunday)} ${year}`.toUpperCase();
              } catch { displayDate = date; }
            }
            const groupKey = `paid-${date}`;
            const isCollapsed = collapsedGroups.has(groupKey);
            const weekTotalPcs = items.reduce((s, o) => s + o.jumlahPesanan, 0);
            const weekTotalHarga = items.reduce((s, o) => s + calculateOrderEarning(o), 0);
            
            return (
            <div key={date} className={`overflow-hidden rounded-2xl border-2 shadow-xl transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-emerald-500/10'}`}>
               {/* Header Tanggal - Clickable */}
               <button 
                 onClick={() => toggleGroupCollapse(groupKey)}
                 className={`w-full flex items-center gap-2 md:gap-4 p-3 md:p-5 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-100'} hover:bg-emerald-50/5 transition-colors`}
               >
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-50 text-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0"><CalendarDays size={20} className="md:hidden" /><CalendarDays size={28} className="hidden md:block" /></div>
                  <div className="flex-1 text-left min-w-0">
                     <h4 className="text-xs md:text-base font-black uppercase text-emerald-600 truncate">{displayDate}</h4>
                     <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">Laporan Mingguan • {items.length} item</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                     <span className="text-xs font-black text-slate-600">{weekTotalPcs} pcs</span>
                     <span className="text-[8px] font-black text-emerald-600">Rp {weekTotalHarga.toLocaleString('id-ID')}</span>
                  </div>
                  <ChevronDown className={`transition-transform duration-300 text-slate-400 shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} size={16} />
               </button>

               {/* Tabel Items - Collapsible */}
               <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-h-0' : 'max-h-[2000px]'}`}>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-50">
                           <th className="px-3 py-4 w-12">
                              <button
                                onClick={() => toggleSelectAll(items.map(o => o.id))}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${items.every(o => selectedIds.has(o.id)) && items.length > 0 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
                              >
                                {items.every(o => selectedIds.has(o.id)) && items.length > 0 && <CheckCircle size={10} strokeWidth={4} />}
                              </button>
                           </th>
                           <th className="px-3 py-4">Kode / Konsumen</th>
                           <th className="px-3 py-4">Model</th>
                           <th className="px-3 py-4 text-center w-16">Qty</th>
                           <th className="px-3 py-4 text-right w-16">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {items.map(o => {
                          const isSelected = selectedIds.has(o.id);
                          return (
                            <tr key={o.id} onClick={() => toggleSelect(o.id)} className={`text-[10px] font-bold cursor-pointer transition-colors ${isSelected ? (isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''}`}>
                               <td className="px-3 py-4">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                    {isSelected && <CheckCircle size={10} strokeWidth={4} />}
                                  </div>
                               </td>
                               <td className="px-3 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-emerald-500 font-black">{o.kodeBarang}</span>
                                    <span className="text-[8px] opacity-40">{o.konsumen || '-'}</span>
                                 </div>
                               </td>
                               <td className="px-3 py-4 uppercase truncate max-w-[100px]">{o.model}</td>
                               <td className="px-3 py-4 text-center">{o.jumlahPesanan}</td>
                               <td className="px-3 py-4 text-right">
                                  <button onClick={(e) => { e.stopPropagation(); setSelectedOrderDetails(o); }} className="p-1.5 text-blue-500 inline-flex items-center justify-center"><Info size={16} /></button>
                               </td>
                            </tr>
                          );
                        })}
                     </tbody>
                  </table>
               </div>
               {/* Totals row for selected items in this week group */}
               {(() => {
                 const groupSelected = items.filter(o => selectedIds.has(o.id));
                 if (groupSelected.length === 0) return null;
                 const selPcs = groupSelected.reduce((s, o) => s + o.jumlahPesanan, 0);
                 const selHarga = groupSelected.reduce((s, o) => s + calculateOrderEarning(o), 0);
                 return (
                   <div className={`px-3 py-3 border-t flex items-center justify-between gap-2 ${isDarkMode ? 'bg-amber-500/10 border-slate-700' : 'bg-amber-50 border-amber-100'}`}>
                     <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{groupSelected.length} dipilih</span>
                     <div className="flex items-center gap-3">
                       <div className="flex flex-col items-end">
                         <span className="text-[7px] font-black text-slate-400 uppercase">PCS</span>
                         <span className="text-xs font-black text-amber-600">{selPcs} pcs</span>
                       </div>
                       <div className="w-px h-6 bg-amber-200" />
                       <div className="flex flex-col items-end">
                         <span className="text-[7px] font-black text-slate-400 uppercase">Est. Harga</span>
                         <span className="text-xs font-black text-emerald-600">Rp {selHarga.toLocaleString('id-ID')}</span>
                       </div>
                     </div>
                   </div>
                 );
               })()}
               </div>
            </div>
            );
          })}
        </div>
      )}
      </div>

      {selectedIds.size > 0 && ReactDOM.createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[150] pointer-events-none">
          {/* Spacer setinggi navbar (h-24 = 96px) */}
          <div className="pointer-events-auto mx-auto max-w-4xl px-3 pb-[100px]">
            <div className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl shadow-2xl border-2 animate-in slide-in-from-bottom-4 duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0">
                {selectedIds.size}
              </div>
              <button onClick={handleBulkRestore} className="flex items-center justify-center gap-1.5 bg-amber-500 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all">
                <RotateCcw size={13} className="shrink-0" />
                <span>Restore</span>
              </button>
              <button onClick={handleBulkDelete} className="flex items-center justify-center gap-1.5 bg-red-500 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all">
                <Trash2 size={13} className="shrink-0" />
                <span>Hapus</span>
              </button>
              <button onClick={handleShareWhatsApp} className="flex items-center justify-center gap-1.5 bg-emerald-500 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all">
                <Send size={13} className="shrink-0" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-[11px] font-black flex items-center gap-2 whitespace-nowrap">
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Info Detail Popup — fullscreen, iPhone-style animation */}
      {selectedOrderDetails && (
        <div
          className={`fixed inset-0 z-[100] flex items-start justify-center transition-all duration-300 ease-out ${
            isModalOpen && !isModalClosing ? 'bg-black/50 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none'
          }`}
          onClick={closeModal}
        >
          <div
            className={`relative w-full h-full flex flex-col transition-all duration-300 ease-out ${
              isModalOpen && !isModalClosing
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-6'
            } ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}
            style={{ transformOrigin: 'top center' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={closeModal} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 z-10 transition-colors"><X size={20} /></button>
            <div className="overflow-y-auto px-5 pb-6 pt-4 max-w-lg mx-auto w-full" style={{ scrollbarWidth: 'none' }}>
              <div className="text-center mb-4">
                <h3 className="text-2xl font-black">{selectedOrderDetails.kodeBarang}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Penjahit: {selectedOrderDetails.namaPenjahit}</p>
              </div>
              {/* Info grid 2-col */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'Konsumen', value: selectedOrderDetails.konsumen, color: 'text-emerald-500' },
                  { label: 'CS / Admin', value: selectedOrderDetails.cs, color: 'text-orange-500' },
                  { label: 'Model', value: selectedOrderDetails.model, color: 'text-blue-500' },
                  { label: 'Warna', value: selectedOrderDetails.warna, color: 'text-purple-500' },
                  { label: 'Tgl Order', value: formatDateIndo(selectedOrderDetails.tanggalOrder), color: 'text-cyan-500' },
                  { label: 'Target Selesai', value: formatDateIndo(selectedOrderDetails.tanggalTargetSelesai), color: 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className={`text-[10px] font-black uppercase truncate ${color}`}>{value || '-'}</p>
                  </div>
                ))}
              </div>
              {/* Status badges */}
              <div className="flex gap-2 mb-3">
                <span className={`flex-1 text-center py-1.5 rounded-xl text-[8px] font-black uppercase ${selectedOrderDetails.status === JobStatus.BERES ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>{selectedOrderDetails.status}</span>
                <span className={`flex-1 text-center py-1.5 rounded-xl text-[8px] font-black uppercase ${selectedOrderDetails.paymentStatus === PaymentStatus.BAYAR ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'}`}>{selectedOrderDetails.paymentStatus === PaymentStatus.BAYAR ? 'Lunas' : 'Belum Lunas'}</span>
                <span className={`flex-1 text-center py-1.5 rounded-xl text-[8px] font-black uppercase ${selectedOrderDetails.embroideryStatus === 'Lengkap' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-500'}`}>Bordir: {selectedOrderDetails.embroideryStatus || 'Lengkap'}</span>
              </div>
              {/* Size details */}
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Rincian Size</p>
              <div className="space-y-1.5 mb-3">
                {selectedOrderDetails.sizeDetails.map((sd, i) => {
                  const sizes = (sd.sizes && sd.sizes.length > 0) ? sd.sizes : [{ size: sd.size, jumlah: sd.jumlah }];
                  return sizes.map((sz, j) => (
                    <div key={`${i}-${j}`} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isDarkMode ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>{sz.size}</span>
                        <span className="text-xs font-black text-emerald-500">{sz.jumlah} pcs</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase">
                        <span>{sd.gender}</span><span>·</span><span>{sd.tangan || '-'}</span>
                        {sd.namaPerSize && <><span>·</span><span className="text-blue-400">{sd.namaPerSize}</span></>}
                      </div>
                    </div>
                  ));
                })}
              </div>
              {/* Total + harga */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border mb-3 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                <span className="text-[9px] font-black text-emerald-600/60 uppercase">Total</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-emerald-600">{selectedOrderDetails.jumlahPesanan} pcs</span>
                  <div className="w-px h-4 bg-emerald-200" />
                  <span className="text-sm font-black text-emerald-600">Rp {calculateOrderEarning(selectedOrderDetails).toLocaleString('id-ID')}</span>
                </div>
              </div>
              {selectedOrderDetails.deskripsiPekerjaan && (
                <div className={`px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider mb-1">Catatan</p>
                  <p className="text-[10px] font-medium leading-relaxed">{selectedOrderDetails.deskripsiPekerjaan}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryScreen;
