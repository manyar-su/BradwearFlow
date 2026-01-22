
import React, { useState, useMemo } from 'react';
import { Search, Trash2, CheckCircle, Send, ArrowUpDown, FileText, Info, Calendar, User, UserCheck } from 'lucide-react';
import { OrderItem, JobStatus, Priority } from '../types';
// Fix: Removed isValid from date-fns import as it was causing an export error in this environment
import { differenceInDays, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

interface HistoryScreenProps {
  orders: OrderItem[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: JobStatus) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDarkMode: boolean;
}

// Fix: Local helper to check if a date is valid since date-fns isValid might have import issues
const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ orders, onDelete, onUpdateStatus, searchQuery, setSearchQuery, isDarkMode }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'NEWEST' | 'URGENCY' | 'DEADLINE'>('NEWEST');

  const processedOrders = useMemo(() => {
    let filtered = orders.filter(o => 
      o.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.namaPenjahit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.konsumen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.sizeDetails.some(s => s.size.toLowerCase().includes(searchQuery.toLowerCase()) || s.namaPerSize?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const withUrgency = filtered.map(o => {
      let days = 999;
      try {
        let parsedDate: Date;
        if (o.tanggalTargetSelesai.includes('-') && o.tanggalTargetSelesai.split('-')[0].length === 2) {
          const parts = o.tanggalTargetSelesai.split('-');
          parsedDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else {
          parsedDate = new Date(o.tanggalTargetSelesai);
        }
        // Fix: Use the local isValidDate helper
        if (isValidDate(parsedDate)) {
          days = differenceInDays(parsedDate, new Date());
        } else {
          days = 999;
        }
      } catch { days = 999; }
      
      return { ...o, daysLeft: days, effectivePriority: (days >= 0 && days <= 2) ? Priority.HIGH : o.priority };
    });

    if (sortBy === 'URGENCY') {
      const priorityScore = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
      return withUrgency.sort((a, b) => priorityScore[b.effectivePriority] - priorityScore[a.effectivePriority] || a.daysLeft - b.daysLeft);
    } else if (sortBy === 'DEADLINE') {
      return withUrgency.sort((a, b) => a.daysLeft - b.daysLeft);
    } else {
      return withUrgency.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [orders, searchQuery, sortBy]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleShareWhatsApp = () => {
    const selected = orders.filter(o => selectedIds.has(o.id));
    if (selected.length === 0) return;
    let text = "*RINGKASAN KERJA BRADWEAR FLOW*\n\n";
    selected.forEach(o => {
      text += `📦 *Kode: ${o.kodeBarang}* - ${o.model}\n`;
      text += `Jumlah: ${o.jumlahPesanan} Pcs\n`;
      text += `Status: ${o.status}\n\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getUrgencyStyles = (days: number) => {
    if (days < 0) return 'bg-slate-900 text-white border-slate-800 shadow-lg';
    if (days <= 2) return 'bg-red-500 text-white border-red-400 shadow-[0_10px_20px_rgba(239,68,68,0.2)]';
    if (days <= 5) return 'bg-amber-500 text-white border-amber-400 shadow-md';
    return isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-400 border-slate-100';
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      let d: Date;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        d = new Date(dateStr);
      }
      // Fix: Use the local isValidDate helper
      return isValidDate(d) ? format(d, 'EEEE, d MMMM yyyy', { locale: idLocale }) : dateStr;
    } catch { return dateStr; }
  };

  return (
    <div className={`p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>History Kerja</h2>
        {selectedIds.size > 0 && (
          <div className="flex gap-2 animate-in slide-in-from-right">
            <button onClick={handleShareWhatsApp} className="p-3 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-90"><Send size={18} /></button>
            <button className="p-3 bg-slate-800 text-white rounded-2xl shadow-xl active:scale-90"><FileText size={18} /></button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Cari Kode atau Penjahit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-[1.5rem] py-3.5 pl-11 pr-4 focus:outline-none focus:ring-4 text-sm transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 focus:ring-emerald-500/10' : 'bg-white border-slate-100 focus:ring-emerald-500/5'}`}
          />
        </div>
        <button 
          className={`px-4 rounded-[1.5rem] font-black text-[10px] uppercase shadow-md flex items-center gap-2 border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-500' : 'bg-white border-slate-100 text-slate-500 hover:text-emerald-500'}`}
          onClick={() => {
            const modes: ('NEWEST' | 'URGENCY' | 'DEADLINE')[] = ['NEWEST', 'URGENCY', 'DEADLINE'];
            const currentIdx = modes.indexOf(sortBy);
            setSortBy(modes[(currentIdx + 1) % modes.length]);
          }}
        >
          <ArrowUpDown size={16} />
          <span>{sortBy}</span>
        </button>
      </div>

      <div className="space-y-4">
        {processedOrders.length === 0 ? (
          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
             <Search size={48} />
             <p className="font-black text-xs uppercase tracking-widest">Data tidak ditemukan</p>
          </div>
        ) : processedOrders.map(order => {
          const isSelected = selectedIds.has(order.id);

          return (
            <div 
              key={order.id} 
              className={`p-5 rounded-[2.5rem] border transition-all ${isSelected ? 'border-emerald-500 ring-8 ring-emerald-500/5 shadow-2xl scale-[1.02]' : isDarkMode ? 'bg-slate-800/50 border-slate-700 shadow-md' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl'}`}
            >
              <div className="flex items-start gap-4">
                <button 
                  onClick={() => toggleSelect(order.id)}
                  className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  {isSelected && <CheckCircle size={14} strokeWidth={4} />}
                </button>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-2">
                      <span className={`text-[10px] font-black px-4 py-1.5 rounded-full self-start shadow-sm border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                        {order.kodeBarang}
                      </span>
                      <div className="flex gap-2">
                         <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border ${getUrgencyStyles(order.daysLeft)}`}>
                            {order.daysLeft < 0 ? 'OVERDUE' : `${order.daysLeft} DAYS LEFT`}
                         </span>
                      </div>
                    </div>
                    <div className="text-right">
                       <Calendar className={`inline-block mr-1 mb-0.5 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} size={12} />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{formatDateIndo(order.tanggalTargetSelesai)}</span>
                    </div>
                  </div>

                  <h4 className={`text-sm font-black mb-1 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{order.model} • {order.warna}</h4>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">PJ: <span className="text-emerald-500">{order.namaPenjahit}</span></p>
                    {order.konsumen && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><User size={10} className="text-blue-500" /> Konsumen: {order.konsumen}</p>
                    )}
                    {order.cs && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><UserCheck size={10} className="text-orange-500" /> CS: {order.cs}</p>
                    )}
                  </div>
                  
                  <div className={`mt-4 rounded-3xl p-4 overflow-x-auto border transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <table className="w-full text-[9px] min-w-[280px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200/50">
                          <th className="text-left py-2 font-black uppercase tracking-widest">Detail</th>
                          <th className="text-center py-2 font-black uppercase tracking-widest">Qty</th>
                          <th className="text-center py-2 font-black uppercase tracking-widest">Gen</th>
                          <th className="text-right py-2 font-black uppercase tracking-widest">Len</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/20">
                        {order.sizeDetails.map((sd, i) => (
                          <tr key={i} className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                            <td className="py-2.5 font-black uppercase">{sd.size}</td>
                            <td className="py-2.5 text-center font-black text-emerald-500">{sd.jumlah}</td>
                            <td className="py-2.5 text-center font-bold">{sd.gender === 'Pria' ? 'M' : 'W'}</td>
                            <td className="py-2.5 text-right font-medium truncate">{sd.tangan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-5">
                    <button 
                      onClick={() => onUpdateStatus(order.id, order.status === JobStatus.BERES ? JobStatus.PROSES : JobStatus.BERES)}
                      className={`text-[10px] font-black px-6 py-2.5 rounded-2xl transition-all shadow-md uppercase tracking-widest ${order.status === JobStatus.BERES ? 'bg-emerald-500 text-white shadow-emerald-500/20' : isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
                    >
                      {order.status}
                    </button>
                    <div className="flex gap-1">
                       <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Info size={18} /></button>
                       <button onClick={() => onDelete(order.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryScreen;
