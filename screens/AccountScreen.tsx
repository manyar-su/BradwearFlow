
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Shield, Info, LogOut, ChevronRight, FileText, Layers, Loader2, X, Camera, DollarSign, Cloud, Edit2, Upload, Send, Calendar, Package, TrendingUp, Sparkles, Code2, Users, Plus, Minus, Trash2, Check, Save, RotateCcw, Scissors, ArrowUpRight, AlertTriangle, MessageSquare, Key, CheckCircle2, Ruler } from 'lucide-react';
import { extractSplitData } from '../services/geminiService';
import { PRICE_LIST as DEFAULT_PRICE_LIST, OrderItem, JobStatus } from '../types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

const DEFAULT_TAILOR_NAMES = [
  "Maris", "Ferry", "Aan", "Farid", "Opik",
  "Fadil", "Asep", "Abdul", "Hadi", "Epul"
];

const DEFAULT_SIZE_CHART = [
  {
    id: 'default-kemeja',
    name: 'KEMEJA BRADWEAR',
    entries: [
      { size: 'S', tinggi: 70, lebarDada: 50, lebarBahu: 42, lenganPanjang: 59, lenganPendek: 22, kerah: 44, manset: 24 },
      { size: 'M', tinggi: 72, lebarDada: 52, lebarBahu: 44, lenganPanjang: 60, lenganPendek: 23, kerah: 45, manset: 25 },
      { size: 'L', tinggi: 74, lebarDada: 54, lebarBahu: 46, lenganPanjang: 61, lenganPendek: 24, kerah: 46, manset: 26 },
      { size: 'XL', tinggi: 76, lebarDada: 56, lebarBahu: 48, lenganPanjang: 62, lenganPendek: 25, kerah: 47, manset: 27 },
      { size: 'XXL', tinggi: 78, lebarDada: 58, lebarBahu: 50, lenganPanjang: 63, lenganPendek: 26, kerah: 48, manset: 28 },
      { size: 'XXXL', tinggi: 80, lebarDada: 60, lebarBahu: 52, lenganPanjang: 64, lenganPendek: 27, kerah: 49, manset: 29 },
      { size: 'XXXXL', tinggi: 82, lebarDada: 62, lebarBahu: 54, lenganPanjang: 65, lenganPendek: 28, kerah: 50, manset: 30 },
      { size: 'XXXXXL', tinggi: 84, lebarDada: 64, lebarBahu: 56, lenganPanjang: 66, lenganPendek: 29, kerah: 51, manset: 31 }
    ]
  },
  {
    id: 'default-celana',
    name: 'CELANA BRADWEAR',
    entries: [
      { size: '28', tinggi: 102, lingkarPinggang: 82, lingkarPinggul: 92, lingkarPaha: 59, lingkarBawah: 36 },
      { size: '30', tinggi: 102, lingkarPinggang: 86, lingkarPinggul: 96, lingkarPaha: 61, lingkarBawah: 38 },
      { size: '32', tinggi: 104, lingkarPinggang: 90, lingkarPinggul: 100, lingkarPaha: 63, lingkarBawah: 40 },
      { size: '34', tinggi: 104, lingkarPinggang: 94, lingkarPinggul: 104, lingkarPaha: 65, lingkarBawah: 42 },
      { size: '36', tinggi: 106, lingkarPinggang: 98, lingkarPinggul: 108, lingkarPaha: 67, lingkarBawah: 44 },
      { size: '38', tinggi: 106, lingkarPinggang: 102, lingkarPinggul: 112, lingkarPaha: 69, lingkarBawah: 46 },
      { size: '40', tinggi: 108, lingkarPinggang: 106, lingkarPinggul: 116, lingkarPaha: 71, lingkarBawah: 48 }
    ]
  }
];

const MenuItem = ({ icon, label, isDarkMode, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full p-4 flex items-center justify-between transition-all active:bg-slate-50`}>
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#f4f7f9] border-transparent shadow-sm'}`}>{icon}</div>
      <span className={`text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-[#334155]'}`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {badge && <span className="bg-[#10b981] text-white text-[8px] font-black px-2 py-0.5 rounded-full">{badge}</span>}
      <ChevronRight size={16} className="text-[#cbd5e1]" />
    </div>
  </button>
);

const AccountScreen = ({ isDarkMode, orders = [], deletedOrders = [], onRestore, onPermanentDelete, onBulkPermanentDelete, onUpdateOrder, onViewChange, triggerConfirm }: { isDarkMode: boolean, orders?: OrderItem[], deletedOrders: OrderItem[], onRestore: (id: string) => void, onPermanentDelete: (id: string) => void, onBulkPermanentDelete?: (ids: string[]) => void, onUpdateOrder: (order: OrderItem) => void, onViewChange: (view: any) => void, triggerConfirm: (config: any) => void }) => {
  const [showSplitPopup, setShowSplitPopup] = useState(false);
  const [showPricePopup, setShowPricePopup] = useState(false);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showRecyclePopup, setShowRecyclePopup] = useState(false);
  const [trashSelectedIds, setTrashSelectedIds] = useState<Set<string>>(new Set());
  const [showEmbroideryPopup, setShowEmbroideryPopup] = useState(false);
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(false);
  const [showSizeChartPopup, setShowSizeChartPopup] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profileName, setProfileName] = useState(() => localStorage.getItem('profileName') || 'Nama Anda');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profileImage') || null);
  const [isEditingName, setIsEditingName] = useState(false);

  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('bradwear_price_list');
    return saved ? JSON.parse(saved) : DEFAULT_PRICE_LIST;
  });
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null);
  const [newPriceName, setNewPriceName] = useState('');
  const [newPriceValue, setNewPriceValue] = useState('');
  const [isAddingNewPrice, setIsAddingNewPrice] = useState(false);

  // API Key State
  const [tempGeminiKey, setTempGeminiKey] = useState(() => localStorage.getItem('bradwear_gemini_key') || '');

  // Embroidery Edit State
  const [editingEmbroideryOrder, setEditingEmbroideryOrder] = useState<OrderItem | null>(null);

  // Size Chart State
  const [sizeCharts, setSizeCharts] = useState<any[]>(() => {
    const saved = localStorage.getItem('bradwear_size_charts');
    let current: any[] = [];
    if (saved) {
      current = JSON.parse(saved);
    }
    
    // Ensure default charts are present
    const final = [...current];
    DEFAULT_SIZE_CHART.forEach(def => {
      if (!final.some(c => c.id === def.id)) {
        final.push(def);
      }
    });
    return final;
  });
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [newChartName, setNewChartName] = useState('');
  const [selectedIndicesForShare, setSelectedIndicesForShare] = useState<Set<number>>(new Set());
  const [splitResult, setSplitResult] = useState<{ orders: any[], totalPcs: number } | null>(null);
  const [viewingChartId, setViewingChartId] = useState<string | null>(null);

  const [customNames, setCustomNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('pecah_rata_names');
    return saved ? JSON.parse(saved) : DEFAULT_TAILOR_NAMES;
  });
  const [newNameInput, setNewNameInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('profileName', profileName);
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
    if (profileImage) localStorage.setItem('profileImage', profileImage);
    else localStorage.removeItem('profileImage');
    localStorage.setItem('pecah_rata_names', JSON.stringify(customNames));
    localStorage.setItem('bradwear_price_list', JSON.stringify(prices));
    localStorage.setItem('bradwear_size_charts', JSON.stringify(sizeCharts));
  }, [profileName, isLoggedIn, profileImage, customNames, prices, sizeCharts]);

  const monthlyReports = useMemo(() => {
    const stats: Record<string, { totalOrders: number, totalPcs: number, totalEarnings: number, rawDate: Date, ordersList: OrderItem[] }> = {};

    const allOrdersForEarning = [...orders, ...deletedOrders];

    allOrdersForEarning.forEach(o => {
      const date = new Date(o.createdAt);
      const monthKey = format(date, 'MMMM yyyy', { locale: idLocale });
      if (!stats[monthKey]) {
        stats[monthKey] = { totalOrders: 0, totalPcs: 0, totalEarnings: 0, rawDate: date, ordersList: [] };
      }
      stats[monthKey].totalOrders += 1;
      stats[monthKey].totalPcs += o.jumlahPesanan;
      stats[monthKey].ordersList.push(o);
      if (o.status === JobStatus.BERES) {
        let orderEarnings = 0;
        if (o.sizeDetails && o.sizeDetails.length > 0) {
          o.sizeDetails.forEach(sd => {
            const m = o.model.toUpperCase();
            const category = sd.tangan === 'Panjang' ? 'KPLJ' : 'KLPD';
            const priceKey = `${m}_${category}`;
            const price = prices[priceKey] || prices[m] || prices['DEFAULT'] || 0;
            orderEarnings += (price * sd.jumlah);
          });
        } else {
          const price = prices[o.model.toUpperCase()] || prices['DEFAULT'] || 0;
          orderEarnings = (price * o.jumlahPesanan);
        }
        stats[monthKey].totalEarnings += orderEarnings;
      }
    });
    return Object.entries(stats).sort((a, b) => b[1].rawDate.getTime() - a[1].rawDate.getTime());
  }, [orders, deletedOrders, prices]);

  const handleSaveApiKey = () => {
    localStorage.setItem('bradwear_gemini_key', tempGeminiKey);
    setShowApiKeyPopup(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const [loginPin, setLoginPin] = useState('');
  const [storedPin, setStoredPin] = useState(() => localStorage.getItem('bradflow_pin') || '');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const handleLogin = () => {
    if (pinInput === storedPin) {
      setIsLoggedIn(true);
      setPinInput('');
    } else {
      alert("PIN Salah! Coba lagi.");
      setPinInput('');
    }
  };

  const handleSetPin = () => {
    if (pinInput.length < 4) {
      alert("PIN minimal 4 angka!");
      return;
    }
    localStorage.setItem('bradflow_pin', pinInput);
    setStoredPin(pinInput);
    setIsLoggedIn(true);
    setPinInput('');
    setShowPinSetup(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleExitApp = () => {
    triggerConfirm({
      title: 'Keluar Akun?',
      message: 'Anda akan keluar dari sesi saat ini.',
      type: 'warning',
      onConfirm: () => setIsLoggedIn(false)
    });
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSplitScan = async (files: FileList) => {
    setLoading(true);
    try {
      const base64Images = await Promise.all(
        Array.from(files).map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });
        })
      );
      const result = await extractSplitData(base64Images);

      const rawOrders = (result.orders || []).map((order: any) => ({
        ...order,
        sizeCounts: (order.sizeCounts || []).map((s: any) => ({
          size: s.size,
          jumlah: parseInt(s.jumlah) || 0
        }))
      }));

      // MERGE DUPLICATES (Orders & Sizes)
      const mergedOrders: any[] = [];
      rawOrders.forEach((raw: any) => {
        const existingOrder = mergedOrders.find(o => 
          o.kodeBarang === raw.kodeBarang && 
          (o.model || '').toLowerCase() === (raw.model || '').toLowerCase()
        );

        if (existingOrder) {
          raw.sizeCounts.forEach((s: any) => {
            const existingSize = existingOrder.sizeCounts.find((es: any) => es.size === s.size);
            if (existingSize) {
              existingSize.jumlah += s.jumlah;
            } else {
              existingOrder.sizeCounts.push({ ...s });
            }
          });
        } else {
          // Deep copy sizeCounts to avoid mutation issues
          mergedOrders.push({
            ...raw,
            sizeCounts: raw.sizeCounts.map((s: any) => ({ ...s }))
          });
        }
      });

      const ordersData = mergedOrders;

      const totalPcs = ordersData.reduce((sum: number, order: any) =>
        sum + order.sizeCounts.reduce((sSum: number, s: any) => sSum + s.jumlah, 0), 0
      );

      setSplitResult({ orders: ordersData, totalPcs });
      setSelectedIndicesForShare(new Set());
    } catch (err) {
      alert("Scan gagal.");
    } finally { setLoading(false); }
  };

  const calculatedDistribution = useMemo(() => {
    if (!splitResult) return [];
    const { orders, totalPcs } = splitResult;
    const namesToUse = customNames;
    if (namesToUse.length === 0) return [];

    let distributionPool: any[] = [];
    orders.forEach(order => {
      order.sizeCounts.forEach((sc: any) => {
        if (sc.jumlah > 0) {
          distributionPool.push({
            kodeBarang: order.kodeBarang,
            model: order.model,
            size: sc.size,
            jumlah: sc.jumlah
          });
        }
      });
    });

    distributionPool.sort((a, b) => b.jumlah - a.jumlah);

    const targetPerPerson = Math.floor(totalPcs / namesToUse.length);
    let remainder = totalPcs % namesToUse.length;

    const tailorResults = namesToUse.map((name, i) => ({
      tailorName: name,
      items: [] as any[],
      totalItems: 0,
      target: targetPerPerson + (i < remainder ? 1 : 0)
    }));

    tailorResults.forEach((tailor) => {
      let needed = tailor.target;

      while (needed > 0 && distributionPool.length > 0) {
        let bestPileIdx = -1;
        for (let i = 0; i < distributionPool.length; i++) {
          if (distributionPool[i].jumlah <= needed) {
            bestPileIdx = i;
            break;
          }
        }

        if (bestPileIdx !== -1) {
          const pile = distributionPool[bestPileIdx];
          tailor.items.push({
            kodeBarang: pile.kodeBarang,
            model: pile.model,
            size: pile.size,
            count: pile.jumlah
          });
          tailor.totalItems += pile.jumlah;
          needed -= pile.jumlah;
          distributionPool.splice(bestPileIdx, 1);
        } else {
          const largestPile = distributionPool[0];
          const take = needed;
          tailor.items.push({
            kodeBarang: largestPile.kodeBarang,
            model: largestPile.model,
            size: largestPile.size,
            count: take
          });
          tailor.totalItems += take;
          largestPile.jumlah -= take;
          needed = 0;
          if (largestPile.jumlah <= 0) distributionPool.splice(0, 1);
        }
      }
    });

    return tailorResults;
  }, [splitResult, customNames]);

  const handleAddNewTailor = () => {
    if (!newNameInput.trim()) return;
    setCustomNames([...customNames, newNameInput.trim()]);
    setNewNameInput('');
  };

  const handleRemoveTailor = (index: number) => {
    setCustomNames(customNames.filter((_, i) => i !== index));
  };

  const toggleShareSelection = (index: number) => {
    const next = new Set(selectedIndicesForShare);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndicesForShare(next);
  };

  const handleShareWhatsAppSplits = () => {
    if (selectedIndicesForShare.size === 0) {
      alert("Pilih minimal satu penjahit untuk dikirim!");
      return;
    }

    const selectedResults = Array.from(selectedIndicesForShare).map(i => calculatedDistribution[i]);
    const tanggal = format(new Date(), 'd MMM yyyy', { locale: idLocale });

    let text = `*PEMBAGIAN KERJA BRADWEAR*\n`;
    text += `📅 ${tanggal}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    selectedResults.forEach(res => {
      text += `👤 *${res.tailorName.toUpperCase()}*\n`;
      text += `📦 Total: *${res.totalItems} PCS*\n\n`;

      const groupedByCode: Record<string, any[]> = {};
      res.items.forEach((it: any) => {
        if (!groupedByCode[it.kodeBarang]) groupedByCode[it.kodeBarang] = [];
        groupedByCode[it.kodeBarang].push(it);
      });

      Object.entries(groupedByCode).forEach(([code, its]) => {
        const subtotal = its.reduce((s: number, i: any) => s + i.count, 0);
        text += `  📋 *${code}* — ${its[0].model} (${subtotal} pcs)\n`;
        its.forEach((it: any) => {
          text += `     • ${it.size}: ${it.count} pcs\n`;
        });
      });
      text += `────────────────────\n\n`;
    });

    // Ringkasan total per model
    const modelTotals: Record<string, number> = {};
    selectedResults.forEach(res => {
      res.items.forEach((it: any) => {
        const k = it.model?.toUpperCase() || 'LAINNYA';
        modelTotals[k] = (modelTotals[k] || 0) + it.count;
      });
    });
    const grandTotal = selectedResults.reduce((s, r) => s + r.totalItems, 0);

    text += `*RINGKASAN TOTAL*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    Object.entries(modelTotals).forEach(([model, qty]) => {
      text += `• ${model}: *${qty} pcs*\n`;
    });
    text += `\n📦 *GRAND TOTAL: ${grandTotal} PCS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🙏 _Terimakasih._`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleUpdatePrice = (key: string, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setPrices(prev => ({ ...prev, [key]: numValue }));
    }
    setEditingPriceKey(null);
  };

  const handleDeletePrice = (key: string) => {
    triggerConfirm({
      title: 'Hapus Harga?',
      message: `Hapus harga untuk model ${key}?`,
      type: 'danger',
      onConfirm: () => {
        setPrices(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    });
  };

  const handleAddNewPrice = () => {
    if (!newPriceName.trim() || !newPriceValue.trim()) {
      alert("Nama model dan harga wajib diisi!");
      return;
    }
    const numValue = parseInt(newPriceValue);
    if (isNaN(numValue)) {
      alert("Harga harus berupa angka!");
      return;
    }
    setPrices(prev => ({ ...prev, [newPriceName.trim().toUpperCase()]: numValue }));
    setNewPriceName('');
    setNewPriceValue('');
    setIsAddingNewPrice(false);
  };

  const handleEmbroiderySubmit = () => {
    if (editingEmbroideryOrder) {
      onUpdateOrder(editingEmbroideryOrder);
      setEditingEmbroideryOrder(null);
    }
  };

  const handleShareMonthlyReport = (month: string, data: any) => {
    let text = `*LAPORAN PRODUKSI BRADWEAR FLOW*\n`;
    text += `*Bulan:* ${month}\n\n`;
    text += `📦 *Total Produksi:* ${data.totalPcs} PCS\n`;
    text += `💰 *Perkiraan Omset (Beres):* Rp ${data.totalEarnings.toLocaleString()}\n`;
    text += `📋 *Jumlah Pesanan:* ${data.totalOrders}\n\n`;
    text += `_Detail Pesanan:_\n`;

    data.ordersList.forEach((o: OrderItem, i: number) => {
      text += `${i + 1}. [${o.kodeBarang}] ${o.model} - ${o.jumlahPesanan} Pcs (${o.status})\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-[#f4f7f9]'}`}>

      {/* SUCCESS TOAST ALREADY IN SCREEN */}
      {showSuccessToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top duration-500">
          <div className="bg-[#10b981] text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 border-2 border-white/20">
            <CheckCircle2 size={24} className="animate-bounce" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Berhasil Disimpan</span>
              <span className="text-[8px] font-bold text-emerald-100 uppercase mt-1">Konfigurasi API diperbarui</span>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-8 pb-32 animate-in fade-in duration-500">
        <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={(e) => e.target.files && handleSplitScan(e.target.files)} />
        <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={handleProfileUpload} />

        {/* Profile Header */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative group">
            <div className={`w-28 h-28 rounded-full border-[6px] shadow-xl flex items-center justify-center overflow-hidden transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#e6f7ef]'}`}>
              {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#10b981]"><User size={54} strokeWidth={1.5} /></div>}
            </div>
            <button onClick={() => profileInputRef.current?.click()} className="absolute bottom-1 right-1 p-2 bg-[#10b981] text-white rounded-full shadow-lg border-2 border-white active:scale-90 transition-all"><Camera size={14} strokeWidth={2.5} /></button>
          </div>
          <div className="text-center w-full px-10">
            {isEditingName ? <input autoFocus className={`w-full text-xl font-black text-center bg-transparent border-b-2 focus:outline-none transition-colors ${isDarkMode ? 'text-white border-slate-700 focus:border-[#10b981]' : 'text-[#334155] border-slate-200 focus:border-[#10b981]'}`} value={profileName} onChange={(e) => setProfileName(e.target.value)} onBlur={() => setIsEditingName(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)} /> : <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}><h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#334155]'}`}>{profileName}</h2><Edit2 size={14} className="text-slate-300 opacity-0 group-hover:opacity-100" /></div>}
            <div className="mt-2 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 bg-[#e6f7ef] px-4 py-1.5 rounded-full border border-[#10b981]/20">
                <Cloud className="text-[#10b981]" size={14} />
                <span className="text-[10px] font-black text-[#10b981] uppercase tracking-widest">{isLoggedIn ? 'Online' : 'Offline Mode'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login / Setup PIN Overlay */}
        {!isLoggedIn && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-8 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20">
              <Key size={40} />
            </div>

            <div className="text-center space-y-2">
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                {storedPin ? 'Masukkan PIN' : 'Setel PIN Keamanan'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {storedPin ? 'Gunakan PIN 4 Digit Anda' : 'Buat PIN untuk mengunci akses akun'}
              </p>
            </div>

            <div className="w-full max-w-[240px] space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className={`w-full text-center py-5 text-2xl font-black rounded-[2rem] border-2 transition-all outline-none tracking-[0.5em] ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-100 focus:border-emerald-500 shadow-sm'}`}
              />

              <button
                onClick={storedPin ? handleLogin : handleSetPin}
                className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
              >
                {storedPin ? 'Masuk' : 'Simpan & Aktifkan'}
              </button>
            </div>

            {storedPin && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lupa PIN? Hubungi Pembuat Aplikasi</p>
            )}
          </div>
        )}

        {isLoggedIn && (
          <div className="space-y-6">
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] ml-4 mb-3 text-[#94a3b8]">Produksi</h5>
              <div className={`rounded-3xl overflow-hidden border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#f1f5f9] shadow-sm'}`}>
                <MenuItem icon={<Layers className="text-[#10b981]" />} label="Pecah Rata " isDarkMode={isDarkMode} onClick={() => setShowSplitPopup(true)} />
                <div className="h-[1px] mx-4 bg-[#f8fafc]" />
                <MenuItem icon={<DollarSign className="text-amber-500" />} label="Daftar Harga" isDarkMode={isDarkMode} onClick={() => setShowPricePopup(true)} />
                <div className="h-[1px] mx-4 bg-[#f8fafc]" />
                <MenuItem icon={<Ruler className="text-purple-500" />} label="Size Chart" isDarkMode={isDarkMode} onClick={() => setShowSizeChartPopup(true)} />
                <div className="h-[1px] mx-4 bg-[#f8fafc]" />
                <MenuItem icon={<Scissors className="text-blue-500" />} label="Manajemen Bordir" isDarkMode={isDarkMode} onClick={() => setShowEmbroideryPopup(true)} badge="Check" />
              </div>
            </div>

            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] ml-4 mb-3 text-[#94a3b8]">Sistem</h5>
              <div className={`rounded-3xl overflow-hidden border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#f1f5f9] shadow-sm'}`}>
                <MenuItem icon={<Users className="text-[#10b981]" />} label="Team Chatting" isDarkMode={isDarkMode} onClick={() => onViewChange('FORUM_CHAT')} badge="LIVE" />
                <div className="h-[1px] mx-4 bg-[#f8fafc]" />
                <MenuItem icon={<Key className="text-amber-600" />} label="API KEY Management" isDarkMode={isDarkMode} onClick={() => setShowApiKeyPopup(true)} badge="NEW" />
                <div className="h-[1px] mx-4 bg-[#f8fafc]" />
                <MenuItem icon={<Info className="text-blue-500" />} label="Laporan Bulanan" isDarkMode={isDarkMode} onClick={() => setShowReportPopup(true)} badge="AI" />
                <div className="h-[1px] mx-4 bg-[#f8fafc]" />
                <MenuItem icon={<Trash2 className="text-red-500" />} label="Tempat Sampah" isDarkMode={isDarkMode} onClick={() => setShowRecyclePopup(true)} badge={deletedOrders.length.toString()} />
                <div className="h-[1px] mx-4 bg-[#f8fafc]" />
                <MenuItem icon={<Code2 className="text-[#10b981]" />} label="Informasi Pembuat" isDarkMode={isDarkMode} onClick={() => setShowInfoPopup(true)} />
              </div>
            </div>

            <button onClick={handleExitApp} className="w-full p-4 rounded-3xl bg-red-50 text-red-500 flex items-center justify-between active:scale-95 transition-all border border-red-100 shadow-sm">
              <div className="flex items-center gap-4"><div className="p-2 bg-white rounded-xl shadow-sm"><LogOut size={20} /></div><span className="font-black uppercase text-[11px] tracking-widest">Keluar Akun</span></div>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* API KEY POPUP */}
      {showApiKeyPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col gap-6 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black">Konfigurasi API</h3>
              <button onClick={() => setShowApiKeyPopup(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3">
                <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-widest">Kunci ini digunakan untuk fitur pemindaian AI. Pastikan kunci valid untuk menghindari error.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Provider: Google Gemini</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="password"
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl text-xs font-black border outline-none focus:ring-4 focus:ring-amber-500/10 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                    placeholder="AIzaSyB..."
                    value={tempGeminiKey}
                    onChange={e => setTempGeminiKey(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApiKeyPopup(false)}
                className={`flex-1 py-4 rounded-3xl font-black text-[10px] uppercase border transition-all ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'}`}
              >
                Batal
              </button>
              <button
                onClick={handleSaveApiKey}
                className="flex-[2] py-4 bg-[#10b981] text-white rounded-3xl font-black text-[10px] uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} /> Simpan Kunci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split AI Popup */}
      {showSplitPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Pecah Rata</h3>
              <button onClick={() => setShowSplitPopup(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-2">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Daftar Penjahit</h5>
                    <button
                      onClick={() => {
                        triggerConfirm({
                          title: 'Reset Nama?',
                          message: 'Kembalikan ke 10 nama penjahit asli dari sistem?',
                          type: 'warning',
                          onConfirm: () => setCustomNames(DEFAULT_TAILOR_NAMES)
                        });
                      }}
                      className="p-1.5 bg-amber-50 rounded-lg text-amber-600 active:scale-95 transition-all"
                      title="Kembalikan 10 Nama Asli"
                    >
                      <RotateCcw size={10} strokeWidth={3} />
                    </button>
                  </div>
                  <span className="text-[10px] font-black text-[#10b981]">{customNames.length} Aktif</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customNames.map((name, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border animate-in zoom-in duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] font-black uppercase">{name}</span>
                      <button onClick={() => handleRemoveTailor(i)} className="text-red-400 hover:text-red-500"><X size={12} strokeWidth={3} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={`flex-1 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase border outline-none focus:ring-2 focus:ring-[#10b981]/10 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                    placeholder="Nama Penjahit Baru..."
                    value={newNameInput}
                    onChange={e => setNewNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddNewTailor()}
                  />
                  <button onClick={handleAddNewTailor} className="p-3 bg-[#10b981] text-white rounded-2xl shadow-lg active:scale-90 transition-all"><Plus size={18} strokeWidth={3} /></button>
                </div>
              </div>

              <div className="h-[1px] bg-slate-100/10 mx-2" />

              {!splitResult ? (
                <div className="flex flex-col items-center justify-center gap-6 py-4">
                  <div className="w-16 h-16 bg-[#10b981]/10 text-[#10b981] rounded-full flex items-center justify-center"><Layers size={32} /></div>
                  <div className="text-center space-y-2">
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest leading-relaxed">Scan rekapan (bisa pilih banyak berkas) untuk pecah kerjaan merata.</p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-[#10b981] text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Upload Berkas Rekapan'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <h5 className="text-[10px] font-black uppercase text-[#10b981] tracking-widest tracking-[0.2em]">Hasil Pembagian</h5>
                    <button
                      onClick={handleShareWhatsAppSplits}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${selectedIndicesForShare.size > 0 ? 'bg-white text-[#10b981] border border-[#10b981]/30 shadow-sm' : 'bg-slate-100 text-slate-400'}`}
                    >
                      <MessageSquare size={12} /> Kirim WhatsApp
                    </button>
                  </div>

                  <div className="p-5 rounded-[2.5rem] bg-[#e6f7ef] border border-[#10b981]/10 flex justify-between items-center shadow-inner">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Produksi</p>
                      <p className="text-2xl font-black text-[#10b981]">{splitResult.totalPcs} PCS</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Rata-Rata</p>
                      <p className="text-sm font-black text-slate-700">± {Math.floor(splitResult.totalPcs / customNames.length)} Pcs</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {calculatedDistribution.map((t, i) => {
                      const isSelected = selectedIndicesForShare.has(i);
                      const uniqueCodes = Array.from(new Set(t.items.map(it => it.kodeBarang)));

                      return (
                        <div
                          key={i}
                          onClick={() => toggleShareSelection(i)}
                          className={`p-5 rounded-[2.5rem] border transition-all cursor-pointer animate-in slide-in-from-bottom-2 duration-300 relative ${isSelected ? 'border-[#10b981] bg-[#e6f7ef]/20 shadow-md ring-4 ring-[#10b981]/5' : isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}
                        >
                          <div className={`absolute top-6 left-6 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#10b981] border-[#10b981] text-white' : 'border-slate-300'}`}>
                            {isSelected && <Check size={10} strokeWidth={4} />}
                          </div>

                          <div className="flex justify-between items-center mb-4 pl-8">
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{t.tailorName}</span>
                            <span className="text-[11px] font-black text-[#10b981]">{t.totalItems} PCS</span>
                          </div>

                          <div className="pl-8 space-y-3">
                            {uniqueCodes.map(code => (
                              <div key={code} className="space-y-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KODE: {code}</p>
                                <div className="flex flex-wrap gap-2">
                                  {t.items.filter(it => it.kodeBarang === code).map((it, idx) => (
                                    <span key={idx} className={`px-3 py-1.5 rounded-xl text-[9px] font-bold shadow-sm ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                      {it.size}: {it.count}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setSplitResult(null)} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-[#10b981] hover:border-[#10b981] transition-all">Scan Ulang / Reset</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Laporan Bulanan Popup */}
      {showReportPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Laporan Bulanan</h3>
              <button onClick={() => setShowReportPopup(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-4">
              {monthlyReports.length === 0 ? (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                  <FileText size={48} />
                  <p className="text-[10px] font-black uppercase">Belum ada data produksi</p>
                </div>
              ) : monthlyReports.map(([month, data], i) => (
                <div key={i} className={`p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#f8fafc] border-slate-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981]">{month}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShareMonthlyReport(month, data)}
                        className={`p-2 rounded-xl shadow-sm bg-emerald-100 text-emerald-600 transition-all active:scale-90`}
                      >
                        <Send size={14} />
                      </button>
                      <button className="p-2 bg-white rounded-xl shadow-sm text-blue-500"><Upload size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Produksi</span>
                      <span className="text-lg font-black">{data.totalPcs} PCS</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Omset (Beres)</span>
                      <span className="text-lg font-black text-[#10b981]">Rp {(data.totalEarnings / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <TrendingUp size={12} className="text-[#10b981]" />
                    <span className="text-[9px] font-bold text-slate-500">{data.totalOrders} Pesanan Terdaftar</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recycle Bin Popup */}
      {showRecyclePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black">Tempat Sampah</h3>
              <button onClick={() => { setShowRecyclePopup(false); setTrashSelectedIds(new Set()); }} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>

            {/* Select all + bulk actions */}
            {deletedOrders.length > 0 && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <button
                  onClick={() => {
                    if (trashSelectedIds.size === deletedOrders.length) {
                      setTrashSelectedIds(new Set());
                    } else {
                      setTrashSelectedIds(new Set(deletedOrders.map(o => o.id)));
                    }
                  }}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${trashSelectedIds.size === deletedOrders.length && deletedOrders.length > 0 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
                >
                  {trashSelectedIds.size === deletedOrders.length && deletedOrders.length > 0 && <CheckCircle2 size={10} strokeWidth={4} />}
                </button>
                <span className="text-[9px] font-black text-slate-400 uppercase flex-1">
                  {trashSelectedIds.size > 0 ? `${trashSelectedIds.size} dipilih` : 'Pilih Semua'}
                </span>
                {trashSelectedIds.size > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        const ids: string[] = Array.from(trashSelectedIds);
                        ids.forEach(id => onRestore(id));
                        setTrashSelectedIds(new Set());
                      }}
                      className="px-2.5 py-1.5 bg-emerald-500 text-white rounded-xl font-black text-[8px] uppercase flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Pulihkan
                    </button>
                    <button
                      onClick={() => {
                        triggerConfirm({
                          title: 'HAPUS PERMANEN?',
                          message: `Hapus ${trashSelectedIds.size} data selamanya? Tidak bisa dikembalikan.`,
                          type: 'danger',
                          onConfirm: () => {
                            const ids: string[] = Array.from(trashSelectedIds);
                            if (onBulkPermanentDelete) {
                              onBulkPermanentDelete(ids);
                            } else {
                              ids.forEach(id => onPermanentDelete(id));
                            }
                            setTrashSelectedIds(new Set());
                          }
                        });
                      }}
                      className="px-2.5 py-1.5 bg-red-500 text-white rounded-xl font-black text-[8px] uppercase flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Hapus
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-3">
              {deletedOrders.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-4 opacity-30 text-center">
                  <Trash2 size={48} />
                  <p className="text-[10px] font-black uppercase">Tidak ada data terhapus</p>
                </div>
              ) : deletedOrders.map(o => {
                const isSelected = trashSelectedIds.has(o.id);
                return (
                  <div
                    key={o.id}
                    onClick={() => {
                      const next = new Set(trashSelectedIds);
                      if (next.has(o.id)) next.delete(o.id); else next.add(o.id);
                      setTrashSelectedIds(next);
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50/50' : isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#f8fafc] border-slate-100'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                        {isSelected && <CheckCircle2 size={9} strokeWidth={4} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-emerald-500 uppercase truncate">{o.kodeBarang}</p>
                        <p className="text-xs font-bold truncate">{o.model}</p>
                        <p className="text-[8px] font-bold text-slate-400 italic">Dihapus: {o.deletedAt ? format(new Date(o.deletedAt), 'd MMM HH:mm') : '-'}</p>
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onRestore(o.id)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-xl active:scale-90">
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => triggerConfirm({
                            title: 'HAPUS PERMANEN?',
                            message: `Hapus [${o.kodeBarang}] selamanya?`,
                            type: 'danger',
                            onConfirm: () => onPermanentDelete(o.id)
                          })}
                          className="p-1.5 bg-red-100 text-red-600 rounded-xl active:scale-90"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Embroidery Management Popup */}
      {showEmbroideryPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Cek Bordir</h3>
              <button onClick={() => { setShowEmbroideryPopup(false); setEditingEmbroideryOrder(null); }} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>

            {!editingEmbroideryOrder ? (
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                {orders.filter(o => o.status === JobStatus.PROSES).length === 0 ? (
                  <div className="py-20 flex flex-col items-center gap-3 opacity-30 text-center">
                    <Scissors size={40} />
                    <p className="text-[10px] font-black uppercase">Pekerjaan Aktif Tidak Ditemukan</p>
                  </div>
                ) : orders.filter(o => o.status === JobStatus.PROSES).map(o => (
                  <button
                    key={o.id}
                    onClick={() => setEditingEmbroideryOrder({ ...o })}
                    className={`w-full p-4 rounded-3xl border text-left flex justify-between items-center transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#f8fafc] border-slate-100'}`}
                  >
                    <div className="flex-1 truncate pr-4">
                      <span className="text-[8px] font-black text-[#10b981] uppercase block mb-1">{o.kodeBarang}</span>
                      <span className="text-xs font-black uppercase truncate block">{o.model} • {o.warna}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase mt-1 block">PJ: {o.namaPenjahit}</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border ${o.embroideryStatus === 'Kurang' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-emerald-50 border-emerald-100 text-emerald-500'}`}>
                      {o.embroideryStatus || 'Lengkap'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right">
                <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Editing Embroidery Status</p>
                  <p className="text-xs font-bold text-slate-800">{editingEmbroideryOrder.kodeBarang} - {editingEmbroideryOrder.model}</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Status Bordir</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingEmbroideryOrder({ ...editingEmbroideryOrder, embroideryStatus: 'Lengkap' })}
                      className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase border transition-all ${editingEmbroideryOrder.embroideryStatus === 'Lengkap' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                      Lengkap
                    </button>
                    <button
                      onClick={() => setEditingEmbroideryOrder({ ...editingEmbroideryOrder, embroideryStatus: 'Kurang' })}
                      className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase border transition-all ${editingEmbroideryOrder.embroideryStatus === 'Kurang' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                      Ada Kekurangan
                    </button>
                  </div>
                </div>

                {editingEmbroideryOrder.embroideryStatus === 'Kurang' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Detail Kekurangan (Item, Jumlah, Size)</label>
                    <textarea
                      className={`w-full p-4 rounded-2xl text-xs font-bold border min-h-[100px] focus:outline-none focus:ring-4 focus:ring-emerald-500/5 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                      placeholder="Contoh: Saku kiri kurang 2 (Size XL), Punggung kurang 1 (Size L)"
                      value={editingEmbroideryOrder.embroideryNotes || ''}
                      onChange={e => setEditingEmbroideryOrder({ ...editingEmbroideryOrder, embroideryNotes: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setEditingEmbroideryOrder(null)} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase rounded-3xl">Batal</button>
                  <button onClick={handleEmbroiderySubmit} className="flex-[2] py-4 bg-emerald-500 text-white font-black text-[10px] uppercase rounded-3xl shadow-lg active:scale-95 transition-all">Update Status</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Size Chart Popup */}
      {showSizeChartPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Size Chart</h3>
              <button onClick={() => { setShowSizeChartPopup(false); setEditingChartId(null); }} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-4 space-y-4">
              {!editingChartId ? (
                <>
                  {sizeCharts.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-4 opacity-30 text-center">
                      <Ruler size={48} />
                      <p className="text-[10px] font-black uppercase">Belum ada size chart</p>
                    </div>
                  ) : sizeCharts.map((chart) => (
                    <div 
                      key={chart.id} 
                      onClick={() => setViewingChartId(viewingChartId === chart.id ? null : chart.id)}
                      className={`group p-5 rounded-3xl border flex flex-col gap-3 transition-all cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-[#10b981]">{chart.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingChartId(chart.id); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit2 size={14} /></button>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            triggerConfirm({
                              title: 'Hapus Chart?',
                              message: `Hapus size chart ${chart.name}?`,
                              type: 'danger',
                              onConfirm: () => setSizeCharts(sizeCharts.filter(c => c.id !== chart.id))
                            });
                          }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 child:transition-all">
                        {chart.entries.map((e: any, idx: number) => (
                          <span key={idx} className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${isDarkMode ? 'bg-slate-950 text-emerald-400 border border-emerald-500/20' : 'bg-slate-50 text-slate-600 border border-slate-100 shadow-inner'}`}>
                            {e.size}
                          </span>
                        ))}
                      </div>

                      {viewingChartId === chart.id && (
                        <div className="mt-4 pt-4 border-t border-slate-500/10 space-y-3 animate-in fade-in slide-in-from-top-2">
                          <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-[8px] font-black uppercase text-center border-separate border-spacing-1">
                              <thead>
                                <tr className="text-slate-400">
                                  <th className="text-left w-6">Sz</th>
                                  <th>T</th>
                                  {chart.entries[0]?.lebarDada !== undefined && <th>LD</th>}
                                  {chart.entries[0]?.lebarBahu !== undefined && <th>LB</th>}
                                  {chart.entries[0]?.lenganPanjang !== undefined && <th>LPJ</th>}
                                  {chart.entries[0]?.lenganPendek !== undefined && <th>LPD</th>}
                                  {chart.entries[0]?.kerah !== undefined && <th>K</th>}
                                  {chart.entries[0]?.manset !== undefined && <th>M</th>}
                                  {chart.entries[0]?.lingkarPinggang !== undefined && <th>LP</th>}
                                  {chart.entries[0]?.lingkarPinggul !== undefined && <th>LPG</th>}
                                  {chart.entries[0]?.lingkarPaha !== undefined && <th>LPH</th>}
                                  {chart.entries[0]?.lingkarBawah !== undefined && <th>LBW</th>}
                                </tr>
                              </thead>
                              <tbody className={isDarkMode ? 'text-white' : 'text-slate-800'}>
                                {chart.entries.map((e: any, idx: number) => (
                                  <tr key={idx} className={idx % 2 === 0 ? (isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50') : ''}>
                                    <td className="text-left font-black text-emerald-500">{e.size}</td>
                                    <td>{e.tinggi}</td>
                                    {e.lebarDada !== undefined && <td>{e.lebarDada}</td>}
                                    {e.lebarBahu !== undefined && <td>{e.lebarBahu}</td>}
                                    {e.lenganPanjang !== undefined && <td>{e.lenganPanjang}</td>}
                                    {e.lenganPendek !== undefined && <td>{e.lenganPendek}</td>}
                                    {e.kerah !== undefined && <td>{e.kerah}</td>}
                                    {e.manset !== undefined && <td>{e.manset}</td>}
                                    {e.lingkarPinggang !== undefined && <td>{e.lingkarPinggang}</td>}
                                    {e.lingkarPinggul !== undefined && <td>{e.lingkarPinggul}</td>}
                                    {e.lingkarPaha !== undefined && <td>{e.lingkarPaha}</td>}
                                    {e.lingkarBawah !== undefined && <td>{e.lingkarBawah}</td>}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[7px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">Klik ikon pensil untuk merubah angka di atas</p>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="p-4 rounded-3xl border border-dashed border-[#10b981] space-y-3">
                    <input className={`w-full px-4 py-3 rounded-2xl text-xs font-black uppercase border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} placeholder="Nama Chart (Contoh: Kemeja)" value={newChartName} onChange={e => setNewChartName(e.target.value)} />
                    <button onClick={() => {
                      if (!newChartName.trim()) return;
                      const newChart = { id: Math.random().toString(36).substr(2, 9), name: newChartName, entries: [] };
                      setSizeCharts([...sizeCharts, newChart]);
                      setNewChartName('');
                      setEditingChartId(newChart.id);
                    }} className="w-full py-4 bg-[#10b981] text-white rounded-2xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                      <Plus size={16} /> Buat Chart Baru
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right">
                  {sizeCharts.find(c => c.id === editingChartId) && (
                    <>
                      <div className="p-4 rounded-3xl bg-purple-50 border border-purple-100">
                        <p className="text-[10px] font-black text-purple-600 uppercase mb-1">Editing Chart</p>
                        <p className="text-xs font-bold text-slate-800">{sizeCharts.find(c => c.id === editingChartId)?.name}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                          <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daftar Ukuran</h5>
                          <button onClick={() => {
                            const chart = sizeCharts.find(c => c.id === editingChartId);
                            if (chart) {
                              const newEntry = { size: 'NEW', tinggi: 0, lebarDada: 0, lebarBahu: 0, lenganPanjang: 0, lenganPendek: 0, kerah: 0, manset: 0 };
                              setSizeCharts(sizeCharts.map(c => c.id === editingChartId ? { ...c, entries: [...c.entries, newEntry] } : c));
                            }
                          }} className="flex items-center gap-1 text-[9px] font-black text-[#10b981] uppercase bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                            <Plus size={12} /> Tambah Size
                          </button>
                        </div>

                        <div className="space-y-3">
                          {sizeCharts.find(c => c.id === editingChartId)?.entries.map((entry: any, eIdx: number) => (
                            <div key={eIdx} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                              <div className="flex justify-between items-center mb-3">
                                <input
                                  className={`w-16 rounded-lg px-2 py-1 text-xs font-black text-center uppercase border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                  value={entry.size}
                                  onChange={(ev) => {
                                    const nextCharts = [...sizeCharts];
                                    const cIdx = nextCharts.findIndex(c => c.id === editingChartId);
                                    nextCharts[cIdx].entries[eIdx].size = ev.target.value.toUpperCase();
                                    setSizeCharts(nextCharts);
                                  }}
                                />
                                <button onClick={() => {
                                  setSizeCharts(sizeCharts.map(c => c.id === editingChartId ? { ...c, entries: c.entries.filter((_: any, idx: number) => idx !== eIdx) } : c));
                                }} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: 'T', key: 'tinggi' },
                                  { label: 'LD', key: 'lebarDada' },
                                  { label: 'LB', key: 'lebarBahu' },
                                  { label: 'LPj', key: 'lenganPanjang' },
                                  { label: 'LPd', key: 'lenganPendek' },
                                  { label: 'K', key: 'kerah' },
                                  { label: 'M', key: 'manset' },
                                  { label: 'LP', key: 'lingkarPinggang' },
                                  { label: 'LPG', key: 'lingkarPinggul' },
                                  { label: 'LPH', key: 'lingkarPaha' },
                                  { label: 'LBW', key: 'lingkarBawah' }
                                ].map((field) => (
                                  entry[field.key] !== undefined || (sizeCharts.find(c => c.id === editingChartId)?.name.toLowerCase().includes('celana') && ['lingkarPinggang', 'lingkarPinggul', 'lingkarPaha', 'lingkarBawah', 'tinggi'].includes(field.key)) || (sizeCharts.find(c => c.id === editingChartId)?.name.toLowerCase().includes('kemeja') && ['tinggi', 'lebarDada', 'lebarBahu', 'lenganPanjang', 'lenganPendek', 'kerah', 'manset'].includes(field.key)) ? (
                                    <div key={field.key} className="flex flex-col gap-1">
                                      <span className="text-[7px] font-black text-slate-400 text-center uppercase">{field.label}</span>
                                      <input
                                        type="number"
                                        className={`w-full rounded-lg py-1 text-[10px] font-bold text-center border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                        value={entry[field.key] || ''}
                                        onChange={(ev) => {
                                          const nextCharts = [...sizeCharts];
                                          const cIdx = nextCharts.findIndex(c => c.id === editingChartId);
                                          nextCharts[cIdx].entries[eIdx][field.key] = parseInt(ev.target.value) || 0;
                                          setSizeCharts(nextCharts);
                                        }}
                                      />
                                    </div>
                                  ) : null
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button onClick={() => setEditingChartId(null)} className="w-full py-4 bg-emerald-500 text-white font-black text-[10px] uppercase rounded-3xl shadow-lg active:scale-95 transition-all">Selesai & Simpan</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Popup */}
      {showInfoPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border-4 border-emerald-50 shadow-xl"><Sparkles size={40} /></div>
              <div>
                <h3 className="text-xl font-black mb-2">Informasi Pembuat</h3>
                <p className="text-sm px-2 font-medium opacity-80">Saya <span className="text-[#10b981] font-black">Maris</span> membuat aplikasi ini untuk mempermudah dalam pencatatan kerjaan agar tidak ada data ganda dan semoga bisa bermanfaat <span className="italic font-black text-[#10b981]">v1.0.3 Updater</span> project.</p>
              </div>
              <button onClick={() => setShowInfoPopup(false)} className="w-full py-4 bg-[#10b981] text-white rounded-3xl font-black uppercase tracking-widest text-xs">Oke, Mengerti</button>
            </div>
          </div>
        </div>
      )}

      {/* Price Management Popup */}
      {showPricePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Daftar Harga</h3>
              <button onClick={() => setShowPricePopup(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="space-y-3 overflow-y-auto no-scrollbar pr-1 pb-4">
              {Object.entries(prices).map(([model, price]) => (
                <div key={model} className={`group p-4 rounded-2xl border flex flex-col gap-3 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{model}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingPriceKey(editingPriceKey === model ? null : model)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeletePrice(model)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {editingPriceKey === model ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-2">
                      <input type="number" className={`flex-1 px-4 py-2 rounded-xl text-xs font-black border focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} defaultValue={price} autoFocus onBlur={(e) => handleUpdatePrice(model, e.target.value)} />
                      <button className="bg-[#10b981] text-white p-2 rounded-xl"><Check size={16} /></button>
                    </div>
                  ) : <span className="text-base font-black text-[#10b981]">Rp {price.toLocaleString()}</span>}
                </div>
              ))}
              {isAddingNewPrice ? (
                <div className="p-4 rounded-2xl border border-dashed border-[#10b981] space-y-3 animate-in fade-in">
                  <input className={`w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} placeholder="Nama Model" value={newPriceName} onChange={e => setNewPriceName(e.target.value)} />
                  <div className="flex gap-2">
                    <input type="number" className={`flex-1 px-3 py-2 rounded-xl text-xs font-black border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} placeholder="Harga" value={newPriceValue} onChange={e => setNewPriceValue(e.target.value)} />
                    <button onClick={handleAddNewPrice} className="bg-[#10b981] text-white px-4 py-2 rounded-xl font-black text-[10px]">SAVE</button>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={() => setIsAddingNewPrice(true)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#10b981] transition-all">
                    <Plus size={16} className="inline mr-2" /> Tambah Harga Baru
                  </button>
                  <button
                    onClick={() => {
                      triggerConfirm({
                        title: 'Gunakan Harga Default?',
                        message: 'Semua perubahan harga manual akan hilang.',
                        type: 'warning',
                        onConfirm: () => setPrices(DEFAULT_PRICE_LIST)
                      });
                    }}
                    className="w-full py-3 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:text-amber-500 transition-all"
                  >
                    <RotateCcw size={12} /> Reset ke Harga Default
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoBox = ({ label, value, icon, isDarkMode }: any) => (
  <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
    <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
    <div className="flex flex-col">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-[11px] font-bold uppercase">{value || '-'}</span>
    </div>
  </div>
);

export default AccountScreen;
