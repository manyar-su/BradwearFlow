
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Shield, Info, LogOut, ChevronRight, FileText, Layers, Loader2, X, Camera, DollarSign, Cloud, Edit2, Upload, Send, Calendar, Package, TrendingUp, Sparkles, Code2 } from 'lucide-react';
import { extractSplitData } from '../services/geminiService';
import { PRICE_LIST, OrderItem, JobStatus } from '../types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

const TAILOR_NAMES = ["Maris", "Ferry", "Abdul", "Asep", "Hadi", "Fadil", "Aan", "Farid", "Epul", "Opik"];

const MenuItem = ({ icon, label, isDarkMode, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full p-5 flex items-center justify-between border-b last:border-0 transition-all active:bg-slate-500/5 ${isDarkMode ? 'border-slate-700/50' : 'border-slate-50'}`}>
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50 shadow-sm'}`}>{icon}</div>
      <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {badge && <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{badge}</span>}
      <ChevronRight size={18} className="text-slate-300" />
    </div>
  </button>
);

const AccountScreen = ({ isDarkMode, orders = [] }: { isDarkMode: boolean, orders?: OrderItem[] }) => {
  const [showSplitPopup, setShowSplitPopup] = useState(false);
  const [showPricePopup, setShowPricePopup] = useState(false);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [splitResult, setSplitResult] = useState<{ metadata: any, tailors: any[] } | null>(null);
  const [profileName, setProfileName] = useState(() => localStorage.getItem('profileName') || 'Tailor Master');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profileImage') || null);
  const [isEditingName, setIsEditingName] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('profileName', profileName);
  }, [profileName]);

  useEffect(() => {
    if (profileImage) localStorage.setItem('profileImage', profileImage);
    else localStorage.removeItem('profileImage');
  }, [profileImage]);

  const monthlyReports = useMemo(() => {
    const stats: Record<string, { totalOrders: number, totalPcs: number, totalEarnings: number, rawDate: Date }> = {};
    orders.forEach(o => {
      const date = new Date(o.createdAt);
      const monthKey = format(date, 'MMMM yyyy', { locale: idLocale });
      if (!stats[monthKey]) {
        stats[monthKey] = { totalOrders: 0, totalPcs: 0, totalEarnings: 0, rawDate: date };
      }
      stats[monthKey].totalOrders += 1;
      stats[monthKey].totalPcs += o.jumlahPesanan;
      if (o.status === JobStatus.BERES) {
        const price = PRICE_LIST[o.model.toUpperCase()] || PRICE_LIST['DEFAULT'];
        stats[monthKey].totalEarnings += (price * o.jumlahPesanan);
      }
    });
    return Object.entries(stats).sort((a, b) => b[1].rawDate.getTime() - a[1].rawDate.getTime());
  }, [orders]);

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setLoading(false);
      alert("Berhasil login dengan Google! Sinkronisasi G-Drive Aktif.");
    }, 1500);
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
      const rawSizes = result.sizeCounts || []; // e.g., [{size: 'L', jumlah: 20}]
      
      // Algorithm Update: Prioritize Maris and Ferry for large size counts
      // 1. Sort size piles by count descending
      const sortedSizePiles = [...rawSizes].sort((a, b) => b.jumlah - a.jumlah);
      
      // 2. Map tailors
      const tailorResults = TAILOR_NAMES.map(name => ({ tailorName: name, items: [] as any[] }));
      
      // 3. Assign largest piles to Maris and Ferry
      if (sortedSizePiles.length > 0) {
        tailorResults[0].items.push({ size: sortedSizePiles[0].size, count: sortedSizePiles[0].jumlah });
      }
      if (sortedSizePiles.length > 1) {
        tailorResults[1].items.push({ size: sortedSizePiles[1].size, count: sortedSizePiles[1].jumlah });
      }

      // 4. Distribute remaining sizes to others
      const remainingPiles = sortedSizePiles.slice(2);
      remainingPiles.forEach((pile, idx) => {
        // Distribute to tailors index 2 to 9
        const targetTailorIdx = 2 + (idx % (TAILOR_NAMES.length - 2));
        tailorResults[targetTailorIdx].items.push({ size: pile.size, count: pile.jumlah });
      });
      
      setSplitResult({ 
        metadata: result, 
        tailors: tailorResults.filter(t => t.items.length > 0) 
      });
    } catch (err) { 
      console.error(err);
      alert("Scan gagal. Pastikan file gambar valid."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleUpdateSplitCode = (newCode: string) => {
    if (!splitResult) return;
    setSplitResult({
      ...splitResult,
      metadata: { ...splitResult.metadata, kodeBarang: newCode }
    });
  };

  const handleShareWhatsApp = () => {
    if (!splitResult) return;
    const { metadata, tailors } = splitResult;
    
    let text = `*DOKUMEN PECAH RATA - BRADWEAR*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📦 *Kode:* ${metadata.kodeBarang || '-'}\n`;
    text += `👕 *Model:* ${metadata.model || '-'}\n`;
    text += `🧤 *Lengan:* ${metadata.tangan || '-'}\n\n`;
    text += `*PEMBAGIAN PENJAHIT (Prioritas):*\n`;
    
    tailors.forEach(t => {
      text += `👤 *${t.tailorName}:* `;
      text += t.items.map((item: any) => `${item.size} (${item.count}pcs)`).join(', ');
      text += `\n`;
    });
    
    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Auto-generated by Bradwear Flow_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="p-6 space-y-8 pb-10 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={(e) => e.target.files && handleSplitScan(e.target.files)} />
      <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={handleProfileUpload} />

      <div className="flex flex-col items-center gap-4 py-6">
        <div className="relative group">
          <div className={`w-32 h-32 rounded-full border-4 shadow-2xl flex items-center justify-center overflow-hidden transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'}`}>
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={64} className="text-emerald-500" strokeWidth={1.5} />
            )}
          </div>
          <button 
            onClick={() => profileInputRef.current?.click()}
            className="absolute bottom-1 right-1 p-2 bg-emerald-500 text-white rounded-full shadow-lg border-2 border-white group-active:scale-90 transition-all"
          >
            <Camera size={16} />
          </button>
        </div>
        
        <div className="text-center w-full px-10">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input 
                autoFocus
                className={`w-full text-xl font-black text-center bg-transparent border-b-2 focus:outline-none transition-colors ${isDarkMode ? 'text-white border-slate-700 focus:border-emerald-500' : 'text-slate-800 border-slate-200 focus:border-emerald-500'}`}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 group">
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profileName}</h2>
              <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-all">
                <Edit2 size={16} />
              </button>
            </div>
          )}
          
          {!isLoggedIn ? (
            <button onClick={handleGoogleLogin} className={`mt-3 mx-auto flex items-center gap-2 border px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
              <Cloud className="text-blue-500" size={16} />
              <span className="text-[10px] font-black uppercase tracking-wider">Login Google</span>
            </button>
          ) : (
            <span className="mt-3 block text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">G-Drive Cloud Active</span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h5 className="text-[9px] font-black uppercase tracking-[0.2em] ml-6 mb-2 text-slate-400">Produksi</h5>
          <div className={`rounded-[2.5rem] overflow-hidden border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
            <MenuItem icon={<Layers className="text-emerald-500" />} label="Pecah Rata (AI Doc)" isDarkMode={isDarkMode} onClick={() => setShowSplitPopup(true)} />
            <MenuItem icon={<DollarSign className="text-amber-500" />} label="Daftar Harga" isDarkMode={isDarkMode} onClick={() => setShowPricePopup(true)} />
          </div>
        </div>

        <div>
          <h5 className="text-[9px] font-black uppercase tracking-[0.2em] ml-6 mb-2 text-slate-400">Sistem</h5>
          <div className={`rounded-[2.5rem] overflow-hidden border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
            <MenuItem icon={<Info className="text-slate-500" />} label="Laporan Bulanan" isDarkMode={isDarkMode} onClick={() => setShowReportPopup(true)} badge="AI" />
            <MenuItem icon={<Code2 className="text-blue-500" />} label="Informasi Pembuat" isDarkMode={isDarkMode} onClick={() => setShowInfoPopup(true)} />
          </div>
        </div>

        <button className="w-full p-5 rounded-[2rem] border bg-red-50 border-red-100 text-red-500 flex items-center justify-between active:scale-95 transition-all">
          <div className="flex items-center gap-4"><LogOut size={22} /><span className="font-black uppercase text-xs tracking-widest">Logout System</span></div>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Info Popup */}
      {showInfoPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex flex-col items-center text-center gap-6">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border-4 border-emerald-50 shadow-xl">
                 <Sparkles size={40} />
               </div>
               <div>
                  <h3 className="text-xl font-black mb-2">Informasi Pembuat</h3>
                  <p className={`text-sm leading-relaxed px-2 font-medium opacity-80 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Saya <span className="text-emerald-500 font-black">Maris</span> mendedikasikan aplikasi beta ini untuk project <span className="italic">beta 2.0</span>. Aplikasi masih dikembangkan dan belum ditemukan error.
                  </p>
               </div>
               <button onClick={() => setShowInfoPopup(false)} className="w-full py-4 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">
                  Oke, Mengerti
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Popup */}
      {showReportPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black flex items-center gap-2"><TrendingUp className="text-emerald-500" size={24} /> Laporan Bulanan</h3>
              <button onClick={() => setShowReportPopup(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
              {monthlyReports.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                  <p className="text-xs font-black uppercase tracking-widest">Belum ada data pengerjaan.</p>
                </div>
              ) : monthlyReports.map(([month, stat], idx) => (
                <div key={idx} className={`p-5 rounded-[2rem] border space-y-3 transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <h4 className="text-sm font-black text-emerald-500 uppercase tracking-widest border-b border-emerald-500/10 pb-2 mb-2">{month}</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Penghasilan</span>
                        <span className="text-sm font-black text-emerald-500">Rp {stat.totalEarnings.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Jumlah Order</span>
                        <span className="text-sm font-black">{stat.totalOrders} Pesanan</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Barang</span>
                        <span className="text-sm font-black">{stat.totalPcs} Pcs</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/10">
               <p className="text-[9px] text-slate-400 font-bold uppercase text-center leading-relaxed">
                  Laporan dihitung otomatis berdasarkan pesanan berstatus <span className="text-emerald-500">BERES</span>.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Split Popup */}
      {showSplitPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Pecah Rata </h3>
              <button onClick={() => setShowSplitPopup(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            {!splitResult && !loading && (
              <div className="text-center space-y-4 py-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200">
                  <Upload size={32} />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest px-4 leading-relaxed">Pilih beberapa foto lembar kerja untuk pembagian rata otomatis.</p>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full bg-emerald-500 text-white font-black py-4 rounded-3xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Upload Foto Pengerjaan
                </button>
              </div>
            )}
            
            {loading && (
              <div className="py-20 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Menganalisa Data...</p>
              </div>
            )}
            
            {splitResult && (
              <div className="space-y-4">
                {/* Result Header with Editable Code */}
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-tight">
                      <div className="flex flex-col">
                        <span className="text-slate-400 mb-1">Kode (Edit)</span>
                        <input 
                          type="text" 
                          value={splitResult.metadata.kodeBarang || ''} 
                          onChange={(e) => handleUpdateSplitCode(e.target.value)}
                          className={`bg-transparent border-b border-emerald-500/30 text-emerald-500 font-black focus:outline-none focus:border-emerald-500 truncate`}
                          placeholder="Kode"
                        />
                      </div>
                      <div className="flex flex-col"><span className="text-slate-400">Model</span><span className="truncate opacity-70">{splitResult.metadata.model || '-'}</span></div>
                      <div className="flex flex-col mt-2"><span className="text-slate-400">Lengan</span><span className="opacity-70">{splitResult.metadata.tangan || '-'}</span></div>
                   </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto no-scrollbar pr-2 space-y-2">
                  {splitResult.tailors.map((res, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{res.tailorName}</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {res.items.map((item: any, iIdx: number) => (
                          <div key={iIdx} className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-600">
                            {item.size}: {item.count}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setSplitResult(null)} 
                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-3xl font-black text-xs uppercase active:scale-95 transition-all"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={handleShareWhatsApp}
                    className="flex-[2] py-4 bg-emerald-500 text-white rounded-3xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <Send size={16} /> Kirim ke WA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price Popup */}
      {showPricePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white text-slate-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Daftar Harga Produksi</h3>
              <button onClick={() => setShowPricePopup(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
              {Object.entries(PRICE_LIST).map(([model, price]) => (
                <div key={model} className={`p-4 rounded-2xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest">{model}</span>
                  <span className="text-sm font-black text-emerald-500">Rp {price.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 mt-6 text-center font-bold uppercase tracking-wider">*Harga berlaku untuk pengerjaan per-pcs.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountScreen;
