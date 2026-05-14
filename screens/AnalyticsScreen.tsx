
import React, { useState, useMemo } from 'react';
import { OrderItem, PRICE_LIST, JobStatus, PaymentStatus } from '../types';
import { format, isSameDay, isSameMonth, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { Wallet, TrendingUp, Package, ChevronDown, Plus, Minus, X, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface AnalyticsScreenProps {
  orders: OrderItem[];
  isDarkMode: boolean;
  currentPenjahit?: string;
}

interface KasbonEntry {
  id: string;
  type: 'kasbon' | 'bayar';
  nominal: number;
  keterangan: string;
  tanggal: string;
}

const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

// Hitung total gaji dari semua order selesai & lunas
const calculateTotalGaji = (orders: OrderItem[]): number => {
  const prices = JSON.parse(localStorage.getItem('bradwear_price_list') || JSON.stringify(PRICE_LIST));
  const paidDoneOrders = orders.filter(o =>
    o.status === JobStatus.BERES && o.paymentStatus === PaymentStatus.BAYAR && !o.deletedAt
  );
  return paidDoneOrders.reduce((sum, o) => {
    const modelName = (o.model || '').toUpperCase();
    const isCelana = modelName.includes('CELANA');
    const isRompi = modelName.includes('ROMPI');
    return sum + o.sizeDetails.reduce((s, sd) => {
      let price = 0;
      if (isRompi) price = prices['ROMPI'] || prices['DEFAULT'] || 0;
      else if (isCelana) {
        const isFormal = modelName.includes('FORMAL');
        price = prices[isFormal ? 'CELANA_FORMAL' : 'CELANA_PDL'] || prices['DEFAULT'] || 0;
      } else {
        const cat = sd.tangan === 'Panjang' ? 'KPLJ' : 'KLPD';
        price = prices[`${modelName}_${cat}`] || prices[modelName] || prices['DEFAULT'] || 0;
      }
      const qty = sd.sizes && sd.sizes.length > 0
        ? sd.sizes.reduce((a, si) => a + (si.jumlah || 0), 0)
        : (sd.jumlah || 0);
      return s + price * qty;
    }, 0);
  }, 0);
};

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ orders, isDarkMode, currentPenjahit }) => {
  const [timeframe, setTimeframe] = useState<'WEEK' | 'MONTH'>('WEEK');

  // ── Kasbon state ──────────────────────────────────────────────
  const kasbonKey = `bradwear_kasbon_${currentPenjahit || 'default'}`;

  const [kasbonHistory, setKasbonHistory] = useState<KasbonEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(kasbonKey) || '[]'); } catch { return []; }
  });

  const [showKasbonModal, setShowKasbonModal] = useState(false);
  const [kasbonMode, setKasbonMode] = useState<'kasbon' | 'bayar'>('kasbon');
  const [kasbonInput, setKasbonInput] = useState('');
  const [kasbonKet, setKasbonKet] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const sisaKasbon = useMemo(() =>
    kasbonHistory.reduce((sum, e) => e.type === 'kasbon' ? sum + e.nominal : sum - e.nominal, 0),
    [kasbonHistory]
  );

  const saveKasbon = (entries: KasbonEntry[]) => {
    setKasbonHistory(entries);
    localStorage.setItem(kasbonKey, JSON.stringify(entries));
  };

  const handleSubmitKasbon = () => {
    const nominal = parseInt(kasbonInput.replace(/\D/g, '')) || 0;
    if (nominal <= 0) return;
    if (kasbonMode === 'bayar' && nominal > sisaKasbon) return;

    const entry: KasbonEntry = {
      id: Date.now().toString(),
      type: kasbonMode,
      nominal,
      keterangan: kasbonKet.trim() || (kasbonMode === 'kasbon' ? 'Kasbon' : 'Pembayaran'),
      tanggal: new Date().toISOString(),
    };
    saveKasbon([entry, ...kasbonHistory]);
    setKasbonInput('');
    setKasbonKet('');
    setShowKasbonModal(false);
  };

  // ── Stats ─────────────────────────────────────────────────────
  const totalGaji = useMemo(() => calculateTotalGaji(orders), [orders]);

  const totalPcs = useMemo(() =>
    orders.filter(o => o.status === JobStatus.BERES && o.paymentStatus === PaymentStatus.BAYAR && !o.deletedAt)
      .reduce((s, o) => s + (o.jumlahPesanan || 0), 0),
    [orders]
  );

  // ── Chart ─────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const now = new Date();
    if (timeframe === 'WEEK') {
      const monday = new Date(now);
      const day = monday.getDay();
      monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
      monday.setHours(0, 0, 0, 0);
      const dayLabels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return [0, 1, 2, 3, 4, 5].map(offset => {
        const date = addDays(monday, offset);
        const dayOrders = orders.filter(o => {
          if (o.status !== JobStatus.BERES || !o.completedAt) return false;
          const d = new Date(o.completedAt);
          return isValidDate(d) && isSameDay(d, date);
        });
        return { label: dayLabels[offset], count: dayOrders.reduce((s, o) => s + (o.jumlahPesanan || 0), 0), orderCount: dayOrders.length, date };
      });
    } else {
      return [5, 4, 3, 2, 1, 0].map(i => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthOrders = orders.filter(o => {
          if (o.status !== JobStatus.BERES || !o.completedAt) return false;
          const d = new Date(o.completedAt);
          return isValidDate(d) && isSameMonth(d, date);
        });
        return { label: format(date, 'MMM', { locale: idLocale }), count: monthOrders.reduce((s, o) => s + (o.jumlahPesanan || 0), 0), orderCount: monthOrders.length, date };
      });
    }
  }, [orders, timeframe]);

  const maxProduction = useMemo(() => Math.max(...chartData.map(d => d.count), 1), [chartData]);

  return (
    <div className="p-6 space-y-6 pb-24">
      <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Performance Stats</h2>

      {/* Timeframe toggle */}
      <div className="flex gap-2">
        {(['WEEK', 'MONTH'] as const).map(tf => (
          <button key={tf} onClick={() => setTimeframe(tf)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${timeframe === tf ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`}>
            {tf === 'WEEK' ? 'Pekan Ini' : '6 Bulan'}
          </button>
        ))}
      </div>

      {/* ── Management Keuangan Card ── */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Management Keuangan</span>

          {/* Total Gaji */}
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase opacity-60">Total Gaji (Terbayar)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Wallet className="opacity-40" size={16} />
              <span className="text-2xl font-black">Rp {totalGaji.toLocaleString('id-ID')}</span>
            </div>
            <span className="text-[7px] opacity-40 mt-0.5">{totalPcs} pcs × harga per pcs (selesai & lunas)</span>
          </div>

          <div className="border-t border-white/10" />

          {/* Kasbon */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[8px] font-black uppercase opacity-60">Kasbon</span>
                {currentPenjahit && (
                  <span className="ml-2 text-[7px] font-black bg-white/10 px-1.5 py-0.5 rounded-full uppercase">{currentPenjahit}</span>
                )}
              </div>
              <div className="flex gap-1.5">
                {/* Tombol Bayar */}
                <button
                  onClick={() => { setKasbonMode('bayar'); setShowKasbonModal(true); }}
                  disabled={sisaKasbon <= 0}
                  className="flex items-center gap-1 bg-emerald-500 disabled:opacity-30 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all active:scale-95"
                >
                  <Minus size={10} /> Bayar
                </button>
                {/* Tombol Tambah Kasbon */}
                <button
                  onClick={() => { setKasbonMode('kasbon'); setShowKasbonModal(true); }}
                  className="flex items-center gap-1 bg-white/20 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all active:scale-95"
                >
                  <Plus size={10} /> Kasbon
                </button>
              </div>
            </div>

            {/* Saldo kasbon */}
            <div className="flex items-center gap-2">
              <AlertCircle className={sisaKasbon > 0 ? 'text-amber-400' : 'text-emerald-400'} size={14} />
              <span className={`text-2xl font-black ${sisaKasbon > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                Rp {sisaKasbon.toLocaleString('id-ID')}
              </span>
            </div>
            <span className="text-[7px] opacity-40">{sisaKasbon > 0 ? 'Sisa kasbon belum terbayar' : 'Tidak ada kasbon'}</span>

            {/* Dropdown riwayat */}
            {kasbonHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 mt-1 text-[8px] font-black uppercase text-white/60 hover:text-white/90 transition-colors"
              >
                <ChevronDown size={12} className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`} />
                {showHistory ? 'Sembunyikan' : 'Lihat'} Riwayat ({kasbonHistory.length})
              </button>
            )}

            {/* Riwayat list */}
            {showHistory && kasbonHistory.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 animate-in slide-in-from-top-2 duration-300">
                {kasbonHistory.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${entry.type === 'kasbon' ? 'bg-amber-400/20' : 'bg-emerald-400/20'}`}>
                        {entry.type === 'kasbon'
                          ? <Plus size={9} className="text-amber-400" />
                          : <CheckCircle size={9} className="text-emerald-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black truncate">{entry.keterangan}</p>
                        <p className="text-[7px] opacity-40">{format(new Date(entry.tanggal), 'd MMM yyyy, HH:mm', { locale: idLocale })}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black shrink-0 ml-2 ${entry.type === 'kasbon' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {entry.type === 'kasbon' ? '+' : '-'}Rp {entry.nominal.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <Package className="text-blue-500 mb-2" size={20} />
          <p className="text-[9px] text-slate-400 font-black uppercase">Total Produksi</p>
          <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{totalPcs} Pcs</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <TrendingUp className="text-orange-500 mb-2" size={20} />
          <p className="text-[9px] text-slate-400 font-black uppercase">Efisiensi</p>
          <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>94%</p>
        </div>
      </div>

      {/* Detail Produksi */}
      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'} p-6 rounded-2xl shadow-xl border`}>
        <div className="flex justify-between items-center mb-6 px-2">
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Detail Produksi Harian</h4>
            <span className="text-[8px] font-bold text-emerald-500 uppercase mt-1">Berdasarkan Jumlah Pcs Beres</span>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
        </div>
        <div className="space-y-4">
          {chartData.map((data, idx) => {
            const percentage = (data.count / maxProduction) * 100;
            const isToday = timeframe === 'WEEK' && isSameDay(data.date, new Date());
            return (
              <div key={idx} className={`relative flex flex-col gap-1.5 p-3 rounded-2xl transition-all ${isToday ? (isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50') : ''}`}>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${isToday ? 'text-emerald-500' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {data.label} {isToday && '• HARI INI'}
                    </span>
                    <span className={`text-[8px] font-medium ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>{data.orderCount} Kerjaan selesai</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-black leading-none ${isToday ? 'text-emerald-600' : isDarkMode ? 'text-white' : 'text-slate-800'}`}>{data.count}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Pcs</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${isToday ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-500/50'}`}
                    style={{ width: `${Math.max(percentage, 5)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        {chartData.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest opacity-50">Belum ada data produksi</p>
          </div>
        )}
      </div>

      {/* Quote card */}
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-900'} rounded-2xl p-8 text-white relative overflow-hidden`}>
        <div className="relative z-10">
          <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-emerald-500 mb-3">Menabung Untuk Masa Depan</h4>
          <p className="text-sm font-black italic leading-tight">"Rezeki yang ditabung adalah rezeki yang terjaga. Kualitas kerja mendatangkan pelanggan, hemat uang menjaga masa depan."</p>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-500 animate-bounce" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Target Menabung</span>
              <span className="text-[10px] font-bold text-emerald-400">Jangan habiskan semua yang kau hasilkan hari ini!</span>
            </div>
          </div>
        </div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* ── Modal Input Kasbon / Bayar ── */}
      {showKasbonModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowKasbonModal(false); }}>
          <div className={`w-full max-w-md rounded-t-2xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${isDarkMode ? 'bg-slate-900 border-t border-slate-700' : 'bg-white border-t border-slate-100'}`}>

            {/* Handle bar */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`text-sm font-black uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  {kasbonMode === 'kasbon' ? '+ Tambah Kasbon' : '✓ Bayar Kasbon'}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                  {kasbonMode === 'bayar' ? `Sisa kasbon: Rp ${sisaKasbon.toLocaleString('id-ID')}` : 'Input nominal kasbon baru'}
                </p>
              </div>
              <button onClick={() => setShowKasbonModal(false)} className="p-2 rounded-xl bg-slate-100 text-slate-500">
                <X size={14} />
              </button>
            </div>

            {/* Mode toggle */}
            <div className={`flex gap-1 p-1 rounded-xl mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              {(['kasbon', 'bayar'] as const).map(m => (
                <button key={m} onClick={() => setKasbonMode(m)}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${kasbonMode === m ? (m === 'kasbon' ? 'bg-amber-500 text-white shadow' : 'bg-emerald-500 text-white shadow') : 'text-slate-400'}`}>
                  {m === 'kasbon' ? '+ Kasbon' : '✓ Bayar'}
                </button>
              ))}
            </div>

            {/* Input nominal */}
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Nominal (Rp)</label>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 100000"
                  value={kasbonInput ? `Rp ${parseInt(kasbonInput.replace(/\D/g, '') || '0').toLocaleString('id-ID')}` : ''}
                  onChange={e => setKasbonInput(e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
                {kasbonMode === 'bayar' && parseInt(kasbonInput || '0') > sisaKasbon && (
                  <p className="text-[9px] text-red-500 font-black mt-1">Nominal melebihi sisa kasbon!</p>
                )}
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Keterangan (opsional)</label>
                <input
                  type="text"
                  placeholder={kasbonMode === 'kasbon' ? 'Contoh: Kasbon minggu ini' : 'Contoh: Bayar sebagian'}
                  value={kasbonKet}
                  onChange={e => setKasbonKet(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitKasbon}
              disabled={!kasbonInput || parseInt(kasbonInput) <= 0 || (kasbonMode === 'bayar' && parseInt(kasbonInput) > sisaKasbon)}
              className={`w-full mt-5 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all active:scale-[0.98] disabled:opacity-40 ${kasbonMode === 'kasbon' ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-emerald-500 shadow-lg shadow-emerald-500/20'}`}
            >
              {kasbonMode === 'kasbon' ? 'Simpan Kasbon' : 'Konfirmasi Bayar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsScreen;
