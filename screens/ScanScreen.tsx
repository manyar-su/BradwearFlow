
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, Save, Plus, Trash2, ChevronLeft, RefreshCw, AlertTriangle, X, Upload, FileText, UserCircle, User, Package } from 'lucide-react';
import { OrderItem, SakuColor, SakuType, JobStatus, Priority, BRAD_MODELS } from '../types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

interface ScanScreenProps {
  onSave: (order: OrderItem) => void;
  onCancel: () => void;
  isDarkMode: boolean;
  existingOrders?: OrderItem[];
  isScanningGlobal: boolean;
  scanResultGlobal: Partial<OrderItem> | null;
  onStartScan: (base64: string) => void;
  setScanResultGlobal: (res: Partial<OrderItem> | null) => void;
}

const GREETINGS = [
  "Sabar ya, BradwearFlow lagi baca Rekapan kamu...",
  "Lagi ngitung kancing nih, tunggu sebentar...",
  "Memproses Rekapan jahitan digital Anda...",
  "Dikit lagi beres, datanya lagi dirapiin...",
  "Hampir selesai! Lagi cocokin data rekapannya..."
];

const ScanScreen: React.FC<ScanScreenProps> = ({ 
  onSave, onCancel, isDarkMode, existingOrders = [], 
  isScanningGlobal, scanResultGlobal, onStartScan, setScanResultGlobal 
}) => {
  const [greeting, setGreeting] = useState(GREETINGS[0]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  
  const [formData, setFormData] = useState<Partial<OrderItem>>({
    namaPenjahit: '',
    kodeBarang: '',
    tanggalOrder: format(new Date(), 'd MMMM yyyy', { locale: idLocale }),
    tanggalTargetSelesai: '',
    cs: '',
    konsumen: '',
    jumlahPesanan: 0,
    sizeDetails: [],
    model: 'Brad V2',
    warna: '',
    sakuType: SakuType.POLOS,
    sakuColor: SakuColor.ABU,
    status: JobStatus.PROSES,
    priority: Priority.MEDIUM,
    deskripsiPekerjaan: '',
    isManual: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (isScanningGlobal) {
      interval = setInterval(() => {
        setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isScanningGlobal]);

  // Sync with global scan result
  useEffect(() => {
    if (scanResultGlobal) {
      setFormData(prev => ({ ...prev, ...scanResultGlobal, isManual: false }));
    }
  }, [scanResultGlobal]);

  useEffect(() => {
    if (formData.kodeBarang && existingOrders.some(o => o.kodeBarang === formData.kodeBarang)) {
      setShowDuplicateWarning(true);
    } else {
      setShowDuplicateWarning(false);
    }
  }, [formData.kodeBarang, existingOrders]);

  useEffect(() => {
    if (formData.sizeDetails) {
      const total = formData.sizeDetails.reduce((sum, item) => sum + (item.jumlah || 0), 0);
      setFormData(prev => ({ ...prev, jumlahPesanan: total }));
    }
  }, [formData.sizeDetails]);

  /**
   * Utility to compress and resize image for faster processing
   */
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; // Optimal for OCR while being small
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Use JPEG with 0.7 quality for great compression
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageInput = async (file: File) => {
    setIsManualMode(false);
    try {
      // Faster process by compressing before sending to Gemini
      const compressedBase64 = await compressImage(file);
      onStartScan(compressedBase64);
    } catch (err) {
      console.error("Compression failed", err);
      // Fallback to original reader if compression fails
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        onStartScan(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualEntry = () => {
    setIsManualMode(true);
    setScanResultGlobal(null);
    setFormData(prev => ({
      ...prev,
      isManual: true,
      sizeDetails: [{ size: '', jumlah: 0, gender: 'Pria', tangan: 'Pendek', namaPerSize: '' }]
    }));
  };

  const handleAddSize = () => {
    setFormData(prev => ({
      ...prev,
      sizeDetails: [...(prev.sizeDetails || []), { size: '', jumlah: 0, gender: 'Pria', tangan: 'Pendek', namaPerSize: '' }]
    }));
  };

  const handleRemoveSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizeDetails: prev.sizeDetails?.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPenjahit || !formData.kodeBarang) {
      alert("Nama Penjahit dan Kode Barang wajib diisi!");
      return;
    }
    onSave(formData as OrderItem);
  };

  return (
    <div className={`p-6 pb-32 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>

      {showDuplicateWarning && (
        <div className="fixed inset-x-6 top-20 z-[100] animate-in slide-in-from-top duration-500">
           <div className={`p-5 rounded-[2rem] border-2 shadow-2xl flex items-center gap-4 ${isDarkMode ? 'bg-slate-800 border-red-500/50 text-white' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg">
                <AlertTriangle size={24} strokeWidth={3} />
              </div>
              <div className="flex-1">
                 <h4 className="font-black text-sm uppercase">Item Duplikat!</h4>
                 <p className="text-[10px] font-bold opacity-80">Kode {formData.kodeBarang} sudah ada di database.</p>
              </div>
              <button onClick={() => setShowDuplicateWarning(false)} className="p-2 text-slate-400"><X size={20} /></button>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <button onClick={onCancel} className={`p-2 -ml-2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}><ChevronLeft /></button>
           <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Input Kerja Baru</h2>
        </div>
        {!isScanningGlobal && (formData.kodeBarang || isManualMode) && (
          <button onClick={() => cameraInputRef.current?.click()} className={`text-[10px] font-black uppercase px-4 py-2 rounded-full flex items-center gap-2 border shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
            <RefreshCw size={12} strokeWidth={3} /> Scan Ulang
          </button>
        )}
      </div>

      {isScanningGlobal ? (
        <div className="flex flex-col items-center justify-center py-32 gap-8 text-center">
          <div className="relative">
            <Loader2 className="animate-spin text-emerald-500" size={64} strokeWidth={3} />
            <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
          </div>
          <div className="space-y-2 px-6">
            <p className={`font-black text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{greeting}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Membedah Pola Digital</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {!formData.kodeBarang && !isManualMode && (
             <div className="space-y-6">
               <div className="bg-emerald-600 rounded-[3rem] p-8 text-white flex flex-col items-center justify-center gap-6 shadow-2xl shadow-emerald-600/30 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                    <FileText size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-1">Pilih Metode Input</h3>
                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider">Fast Scan & OCR Technology</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button 
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="bg-white text-emerald-600 p-4 rounded-3xl font-black text-xs shadow-xl active:scale-90 transition-all uppercase flex flex-col items-center gap-2"
                    >
                      <Camera size={20} /> Kamera
                    </button>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-500 text-white p-4 rounded-3xl font-black text-xs shadow-xl active:scale-90 transition-all uppercase flex flex-col items-center gap-2 border border-emerald-400/30"
                    >
                      <Upload size={20} /> Berkas
                    </button>
                  </div>
               </div>
               
               <button 
                type="button"
                onClick={handleManualEntry}
                className={`w-full py-5 rounded-3xl border border-dashed flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400 shadow-sm'}`}
               >
                 <Package size={18} /> Ketik Manual
               </button>
             </div>
          )}

          <input type="file" ref={cameraInputRef} onChange={(e) => e.target.files?.[0] && handleImageInput(e.target.files[0])} hidden accept="image/*" capture="environment" />
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageInput(e.target.files[0])} hidden accept="image/*" />

          { (formData.kodeBarang || isManualMode) && (
            <>
              <div className={`p-6 rounded-[2.5rem] shadow-sm border space-y-4 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <FormInput label="Penjahit" value={formData.namaPenjahit} onChange={v => setFormData({...formData, namaPenjahit: v})} required isDarkMode={isDarkMode} placeholder="Nama Penjahit" />
                <FormInput label="Kode Barang" value={formData.kodeBarang} onChange={v => setFormData({...formData, kodeBarang: v})} required isDarkMode={isDarkMode} placeholder="Contoh: 1716" />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="CS (Admin)" value={formData.cs} onChange={v => setFormData({...formData, cs: v})} isDarkMode={isDarkMode} placeholder="Nama CS" />
                  <FormInput label="Konsumen" value={formData.konsumen} onChange={v => setFormData({...formData, konsumen: v})} isDarkMode={isDarkMode} placeholder="Nama Konsumen" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Tgl Order" value={formData.tanggalOrder} onChange={v => setFormData({...formData, tanggalOrder: v})} isDarkMode={isDarkMode} placeholder="Contoh: 1 Januari 2026" />
                  <FormInput label="Target Selesai" value={formData.tanggalTargetSelesai} onChange={v => setFormData({...formData, tanggalTargetSelesai: v})} isDarkMode={isDarkMode} placeholder="Contoh: 12 Januari 2026" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Model" isDarkMode={isDarkMode}>
                    <select 
                      className={`w-full h-12 px-4 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                    >
                      {BRAD_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </FormInput>
                  <FormInput label="Warna" value={formData.warna} onChange={v => setFormData({...formData, warna: v})} isDarkMode={isDarkMode} placeholder="Contoh Putih" />
                </div>

                {/* Restored Saku Section */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <FormInput label="Tipe Saku" isDarkMode={isDarkMode}>
                    <select 
                      className={`w-full h-12 px-4 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                      value={formData.sakuType}
                      onChange={(e) => setFormData({...formData, sakuType: e.target.value as SakuType})}
                    >
                      <option value={SakuType.POLOS}>Polos</option>
                      <option value={SakuType.SKOTLAIT}>Skotlait</option>
                      <option value={SakuType.PETERBAN}>Peterban</option>
                    </select>
                  </FormInput>
                  <FormInput label="Warna Saku" isDarkMode={isDarkMode}>
                    <select 
                      className={`w-full h-12 px-4 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                      value={formData.sakuColor}
                      onChange={(e) => setFormData({...formData, sakuColor: e.target.value as SakuColor})}
                    >
                      <option value={SakuColor.ABU}>Abu-abu</option>
                      <option value={SakuColor.HITAM}>Hitam</option>
                      <option value={SakuColor.CREAM}>Cream</option>
                      <option value={SakuColor.OREN}>Oren</option>
                    </select>
                  </FormInput>
                </div>
              </div>

              {/* Advanced Work Details */}
              <div className={`p-6 rounded-[2.5rem] shadow-sm border space-y-4 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                 <div className="flex justify-between items-center mb-2 px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rincian Kerja (Size-Qty-G-L)</h3>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{formData.jumlahPesanan} TOTAL PCS</span>
                 </div>
                 
                 <div className="space-y-3">
                   {formData.sizeDetails?.map((sd, i) => (
                      <div key={i} className={`p-4 rounded-3xl border space-y-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                         <div className="flex gap-2">
                           <input 
                             className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold uppercase ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800 shadow-sm'}`} 
                             value={sd.size} 
                             placeholder="Size (E.g. XL)" 
                             onChange={e => {
                                const next = [...formData.sizeDetails!];
                                next[i].size = e.target.value;
                                setFormData({...formData, sizeDetails: next});
                             }} 
                           />
                           <input 
                             type="number" 
                             className={`w-20 px-4 py-3 rounded-xl text-xs font-black text-center ${isDarkMode ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-white border-slate-100 text-emerald-600 shadow-sm'}`} 
                             value={sd.jumlah || ''} 
                             placeholder="Qty" 
                             onChange={e => {
                                const next = [...formData.sizeDetails!];
                                next[i].jumlah = parseInt(e.target.value) || 0;
                                setFormData({...formData, sizeDetails: next});
                             }} 
                           />
                           <button type="button" onClick={() => handleRemoveSize(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           <select 
                             className={`px-3 py-2 rounded-xl text-[10px] font-bold ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-600 shadow-sm'}`}
                             value={sd.gender}
                             onChange={(e) => {
                               const next = [...formData.sizeDetails!];
                               next[i].gender = e.target.value as any;
                               setFormData({...formData, sizeDetails: next});
                             }}
                           >
                             <option value="Pria">Pria</option>
                             <option value="Wanita">Wanita</option>
                           </select>
                           <select 
                             className={`px-3 py-2 rounded-xl text-[10px] font-bold ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-600 shadow-sm'}`}
                             value={sd.tangan}
                             onChange={(e) => {
                               const next = [...formData.sizeDetails!];
                               next[i].tangan = e.target.value as any;
                               setFormData({...formData, sizeDetails: next});
                             }}
                           >
                             <option value="Pendek">Pendek</option>
                             <option value="Panjang">Panjang</option>
                           </select>
                         </div>
                      </div>
                   ))}
                   <button type="button" onClick={handleAddSize} className="w-full py-4 border-2 border-dashed rounded-3xl flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-emerald-300 transition-all">
                     <Plus size={16} /> Tambah Item
                   </button>
                 </div>
              </div>

              <div className={`p-6 rounded-[2.5rem] shadow-sm border space-y-4 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2 block">Deskripsi Detail</label>
                   <textarea 
                     className={`w-full border rounded-[2rem] px-5 py-4 text-sm font-bold transition-all focus:outline-none focus:ring-4 min-h-[140px] overflow-hidden resize-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500 shadow-sm'}`} 
                     value={formData.deskripsiPekerjaan || ''} 
                     onChange={e => setFormData({...formData, deskripsiPekerjaan: e.target.value})}
                     onInput={(e: any) => {
                       e.target.style.height = 'auto';
                       e.target.style.height = e.target.scrollHeight + 'px';
                     }}
                   />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-500 text-white font-black py-5 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-lg uppercase tracking-widest hover:bg-emerald-600">
                <Save size={24} /> Simpan Pekerjaan
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
};

const FormInput = ({ label, type = 'text', value, onChange, required, isDarkMode, placeholder, readOnly, children }: any) => (
  <div className="flex flex-col gap-1.5 flex-1">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{label} {required && '*'}</label>
    {children ? children : (
      <input 
        type={type} 
        readOnly={readOnly} 
        className={`border rounded-2xl px-5 py-3.5 text-xs font-bold transition-all focus:outline-none focus:ring-4 ${readOnly ? 'opacity-70 bg-slate-200/50' : ''} ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800 shadow-sm'}`} 
        value={value || ''} 
        onChange={e => !readOnly && onChange(e.target.value)} 
        required={required} 
        placeholder={placeholder} 
      />
    )}
  </div>
);

export default ScanScreen;
