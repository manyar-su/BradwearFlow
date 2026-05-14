
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, Save, Plus, Trash2, ChevronLeft, AlertTriangle, Upload, FileText, Package, Scissors, RotateCcw, User, UserCheck, ShieldCheck, Calendar, Clock, Layers, Sparkles, Ruler, Info } from 'lucide-react';
import { OrderItem, SakuColor, SakuType, JobStatus, Priority, BRAD_MODELS, PaymentStatus, JenisBarang, ModelCelana, BahanCelana, BahanKemeja, JenisSakuRompi, SizeChart, ModelRompi } from '../types';
import { format, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import SizeGroupingSection from '../components/SizeGrouping/SizeGroupingSection';

import { syncService } from '../services/syncService';

interface ScanScreenProps {
  onSave: (order: OrderItem) => void;
  onCancel: () => void;
  isDarkMode: boolean;
  existingOrders?: OrderItem[];
  isScanningGlobal: boolean;
  scanResultGlobal: Partial<OrderItem> | null;
  onStartScan: (base64: string) => void;
  setScanResultGlobal: (res: Partial<OrderItem> | null) => void;
  triggerConfirm: (config: any) => void;
}

const GREETINGS = [
  "Sabar ya, BradwearFlow lagi baca Rekapan kamu...",
  "Lagi ngitung kancing nih, tunggu sebentar...",
  "Memproses Rekapan jahitan digital Anda...",
  "Dikit lagi beres, datanya lagi dirapiin...",
  "Hampir selesai! Lagi cocokin data rekapannya..."
];

const INITIAL_FORM_STATE: Partial<OrderItem> = {
  namaPenjahit: 'Nama Anda',
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
  paymentStatus: PaymentStatus.BELUM,
  priority: Priority.MEDIUM,
  embroideryStatus: 'Lengkap',
  embroideryNotes: '',
  deskripsiPekerjaan: '',
  isManual: true,
  createCalendarReminder: false,
  modelDetail: '',
  jenisBarang: undefined
};

const ScanScreen: React.FC<ScanScreenProps> = ({
  onSave, onCancel, isDarkMode, existingOrders = [],
  isScanningGlobal, scanResultGlobal, onStartScan, setScanResultGlobal, triggerConfirm
}) => {
  const [greeting, setGreeting] = useState(GREETINGS[0]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateOwner, setDuplicateOwner] = useState<string | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [selectedSizeChart, setSelectedSizeChart] = useState<string | null>(null);
  const [availableSizeCharts, setAvailableSizeCharts] = useState<SizeChart[]>([]);
  const [showSizeChartPicker, setShowSizeChartPicker] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));

  const [formData, setFormData] = useState<Partial<OrderItem>>(INITIAL_FORM_STATE);
  const [kodeBarangError, setKodeBarangError] = useState(false);
  const kodeBarangRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to get custom measurement fields based on jenis barang
  const getCustomMeasurementFields = (jenisBarang?: JenisBarang) => {
    if (jenisBarang === JenisBarang.CELANA) {
      return [
        { label: 'T', key: 'tinggi', fullName: 'Tinggi/Panjang' },
        { label: 'LP', key: 'lingkarPaha', fullName: 'Lingkar Paha' },
        { label: 'LPG', key: 'lingkarPinggang', fullName: 'Lingkar Pinggang' },
        { label: 'LPH', key: 'lingkarPinggul', fullName: 'Lingkar Pinggul' },
        { label: 'LBW', key: 'lingkarBawah', fullName: 'Lingkar Bawah' }
      ];
    } else if (jenisBarang === JenisBarang.ROMPI) {
      return [
        { label: 'T', key: 'tinggi', fullName: 'Tinggi Badan' },
        { label: 'LD', key: 'lebarDada', fullName: 'Lebar Dada' },
        { label: 'LB', key: 'lebarBahu', fullName: 'Lebar Bahu' },
        { label: 'K', key: 'kerah', fullName: 'Kerah' },
        { label: 'M', key: 'manset', fullName: 'Manset' }
      ];
    } else {
      // Kemeja (default)
      return [
        { label: 'T', key: 'tinggi', fullName: 'Tinggi Badan' },
        { label: 'LD', key: 'lebarDada', fullName: 'Lebar Dada' },
        { label: 'LB', key: 'lebarBahu', fullName: 'Lebar Bahu' },
        { label: 'LPj', key: 'lenganPanjang', fullName: 'Lengan Panjang' },
        { label: 'LPd', key: 'lenganPendek', fullName: 'Lengan Pendek' },
        { label: 'K', key: 'kerah', fullName: 'Kerah' },
        { label: 'M', key: 'manset', fullName: 'Manset' },
        { label: 'LPr', key: 'lingPerut', fullName: 'Lingkar Perut' },
        { label: 'LPg', key: 'lingPinggul', fullName: 'Lingkar Pinggul' }
      ];
    }
  };

  // Helper function to check if custom measurements has any non-zero values
  const hasCustomMeasurements = (measurements?: any) => {
    if (!measurements) return false;
    return Object.values(measurements).some(val => val && val !== 0);
  };

  useEffect(() => {
    const profileName = localStorage.getItem('profileName') || 'Nama Anda';
    setFormData(prev => ({ ...prev, namaPenjahit: profileName }));
    
    // Load size charts
    const savedCharts = localStorage.getItem('bradwear_size_charts');
    if (savedCharts) {
      setAvailableSizeCharts(JSON.parse(savedCharts));
    }
  }, []);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [formData.deskripsiPekerjaan]);

  useEffect(() => {
    let interval: any;
    if (isScanningGlobal) {
      interval = setInterval(() => {
        setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isScanningGlobal]);

  useEffect(() => {
    if (scanResultGlobal) {
      // Auto-detect jenis barang dari deskripsi atau dari hasil scan langsung
      let detectedJenis: JenisBarang | undefined = scanResultGlobal.jenisBarang as JenisBarang;
      
      // Jika belum terdeteksi dari scan, coba deteksi dari deskripsi
      if (!detectedJenis) {
        const desc = (scanResultGlobal.deskripsiPekerjaan || '').toLowerCase();
        
        if (desc.includes('celana') || desc.includes('pant') || desc.includes('trouser')) {
          detectedJenis = JenisBarang.CELANA;
        } else if (desc.includes('rompi') || desc.includes('vest')) {
          detectedJenis = JenisBarang.ROMPI;
        } else if (desc.includes('kemeja') || desc.includes('shirt') || desc.includes('brad')) {
          detectedJenis = JenisBarang.KEMEJA;
        }
      }

      // Auto-detect bahan kemeja dari deskripsi
      let detectedBahan: BahanKemeja | undefined;
      if (!detectedJenis || detectedJenis === JenisBarang.KEMEJA) {
        const desc = (scanResultGlobal.deskripsiPekerjaan || '').toLowerCase();
        
        if (desc.includes('denim')) {
          detectedBahan = BahanKemeja.DENIM;
        } else if (desc.includes('maryland')) {
          detectedBahan = BahanKemeja.MARYLAND;
        } else if (desc.includes('american drill') || desc.includes('american dril')) {
          detectedBahan = BahanKemeja.AMERICAN_DRILL;
        } else if (desc.includes('japan drill') || desc.includes('japan dril')) {
          detectedBahan = BahanKemeja.JAPAN_DRILL;
        } else if (desc.includes('drill') || desc.includes('dril')) {
          detectedBahan = BahanKemeja.AMERICAN_DRILL;
        } else if (desc.includes('oxford')) {
          detectedBahan = BahanKemeja.OXFORD;
        } else if (desc.includes('katun') || desc.includes('cotton')) {
          detectedBahan = BahanKemeja.KATUN;
        } else if (desc.includes('polyester') || desc.includes('poly')) {
          detectedBahan = BahanKemeja.POLYESTER;
        } else if (desc.includes('tropical')) {
          detectedBahan = BahanKemeja.TROPICAL;
        }
      }

      setFormData(prev => ({
        ...prev,
        ...scanResultGlobal,
        namaPenjahit: scanResultGlobal.namaPenjahit || prev.namaPenjahit || '',
        isManual: false,
        jenisBarang: detectedJenis || prev.jenisBarang,
        bahanKemeja: detectedBahan || scanResultGlobal.bahanKemeja || prev.bahanKemeja,
        sizeDetails: scanResultGlobal.sizeDetails?.map(sd => ({
          ...sd,
          bahanKemeja: sd.bahanKemeja || detectedBahan
        })) || prev.sizeDetails
      }));
      setIsManualMode(false);
      setKodeBarangError(false); // reset error saat scan baru masuk
    }
  }, [scanResultGlobal]);

  useEffect(() => {
    const checkDuplicate = async () => {
      if (formData.kodeBarang) {
        // Jangan tampilkan warning untuk kode barang TDP
        const isTDPCode = formData.kodeBarang.toUpperCase().includes('TDP');
        
        if (isTDPCode) {
          setShowDuplicateWarning(false);
          setDuplicateOwner(null);
          return;
        }

        // Local check
        const localDup = existingOrders.find(o => o.kodeBarang === formData.kodeBarang && !o.deletedAt);
        // Global check (async)
        const globalDup = await syncService.checkDuplicateCode(formData.kodeBarang);

        // Check if duplicate exists (from any user, including same user)
        const hasDuplicate = localDup || globalDup;
        
        if (hasDuplicate) {
          const ownerName = (globalDup?.namaPenjahit || localDup?.namaPenjahit || null);
          const isDifferentOwner = ownerName && ownerName !== formData.namaPenjahit;
          
          setShowDuplicateWarning(true);
          setDuplicateOwner(ownerName);
        } else {
          setShowDuplicateWarning(false);
          setDuplicateOwner(null);
        }
      } else {
        setShowDuplicateWarning(false);
        setDuplicateOwner(null);
      }
    };

    checkDuplicate();
  }, [formData.kodeBarang, existingOrders]);

  useEffect(() => {
    if (formData.sizeDetails) {
      const total = formData.sizeDetails.reduce((sum, item) => {
        if (item.sizes && item.sizes.length > 0) {
          // Hitung dari array sizes
          return sum + item.sizes.reduce((s, sz) => s + (sz.jumlah || 0), 0);
        }
        // Hitung dari jumlah langsung
        return sum + (item.jumlah || 0);
      }, 0);
      setFormData(prev => ({ ...prev, jumlahPesanan: total }));
    }
  }, [formData.sizeDetails]);

  // Auto-detect bahan kemeja dari deskripsi pekerjaan
  useEffect(() => {
    if (formData.deskripsiPekerjaan && (!formData.jenisBarang || formData.jenisBarang === JenisBarang.KEMEJA)) {
      const desc = formData.deskripsiPekerjaan.toLowerCase();
      let detectedBahan: BahanKemeja | undefined;

      // Deteksi kata kunci bahan
      if (desc.includes('denim')) {
        detectedBahan = BahanKemeja.DENIM;
      } else if (desc.includes('maryland')) {
        detectedBahan = BahanKemeja.MARYLAND;
      } else if (desc.includes('american drill') || desc.includes('american dril')) {
        detectedBahan = BahanKemeja.AMERICAN_DRILL;
      } else if (desc.includes('japan drill') || desc.includes('japan dril')) {
        detectedBahan = BahanKemeja.JAPAN_DRILL;
      } else if (desc.includes('drill') || desc.includes('dril')) {
        // Default drill ke American Drill
        detectedBahan = BahanKemeja.AMERICAN_DRILL;
      } else if (desc.includes('oxford')) {
        detectedBahan = BahanKemeja.OXFORD;
      } else if (desc.includes('katun') || desc.includes('cotton')) {
        detectedBahan = BahanKemeja.KATUN;
      } else if (desc.includes('polyester') || desc.includes('poly')) {
        detectedBahan = BahanKemeja.POLYESTER;
      } else if (desc.includes('tropical')) {
        detectedBahan = BahanKemeja.TROPICAL;
      }

      // Auto-fill ke semua sizeDetails jika terdeteksi
      if (detectedBahan && formData.sizeDetails && formData.sizeDetails.length > 0) {
        const needsUpdate = formData.sizeDetails.some(sd => !sd.bahanKemeja);
        
        if (needsUpdate) {
          setFormData(prev => ({
            ...prev,
            bahanKemeja: detectedBahan,
            sizeDetails: prev.sizeDetails?.map(sd => ({
              ...sd,
              bahanKemeja: sd.bahanKemeja || detectedBahan
            }))
          }));
        }
      }
    }
  }, [formData.deskripsiPekerjaan, formData.jenisBarang]);

  const handleResetForm = () => {
    const message = scanResultGlobal
      ? "Batalkan hasil scan dan kembali ke pemilihan metode?"
      : "Hapus semua input dan kembali ke pemilihan metode?";

    triggerConfirm({
      title: 'Reset Form?',
      message: message,
      type: 'warning',
      onConfirm: () => {
        setScanResultGlobal(null);
        setIsManualMode(false);
        setFormData(INITIAL_FORM_STATE);
      }
    });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageInput = async (file: File) => {
    setIsManualMode(false);
    try {
      const compressedBase64 = await compressImage(file);
      onStartScan(compressedBase64);
    } catch (err) {
      const reader = new FileReader();
      reader.onloadend = () => onStartScan((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    }
  };

  const handleManualEntry = () => {
    setIsManualMode(true);
    setScanResultGlobal(null);
    setFormData(prev => ({
      ...prev, 
      isManual: true,
      namaPenjahit: 'Nama Anda',
      jenisBarang: undefined,
      sizeDetails: [{
        size: '', 
        jumlah: 0, 
        gender: 'Pria', 
        tangan: 'Pendek', 
        namaPerSize: '',
        model: prev.model || 'Brad V2',
        warna: prev.warna || '',
        sakuType: prev.sakuType || SakuType.POLOS,
        sakuColor: prev.sakuColor || SakuColor.ABU,
        isCustomSize: false,
        customMeasurements: { tinggi: 0, lebarDada: 0, lebarBahu: 0, lenganPanjang: 0, lenganPendek: 0, kerah: 0, manset: 0 }
      }]
    }));
  };

  const handleAddSize = () => {
    setFormData(prev => {
      const baseDetail = {
        size: '', 
        jumlah: 1, 
        gender: 'Pria' as const, 
        tangan: 'Pendek' as const, 
        namaPerSize: '',
        warna: (prev.sizeDetails?.[prev.sizeDetails.length - 1]?.warna) || prev.warna || '',
        isCustomSize: false,
        customMeasurements: { tinggi: 0, lebarDada: 0, lebarBahu: 0, lenganPanjang: 0, lenganPendek: 0, kerah: 0, manset: 0 }
      };

      let newDetail: any = { ...baseDetail };

      // Tambahkan field sesuai jenis barang
      if (prev.jenisBarang === JenisBarang.KEMEJA || !prev.jenisBarang) {
        newDetail = {
          ...newDetail,
          model: (prev.sizeDetails?.[prev.sizeDetails.length - 1]?.model) || prev.model || 'Brad V2',
          sakuType: (prev.sizeDetails?.[prev.sizeDetails.length - 1]?.sakuType) || prev.sakuType || SakuType.POLOS,
          sakuColor: (prev.sizeDetails?.[prev.sizeDetails.length - 1]?.sakuColor) || prev.sakuColor || SakuColor.ABU,
        };
      } else if (prev.jenisBarang === JenisBarang.ROMPI) {
        newDetail = {
          ...newDetail,
          jenisSakuRompi: (prev.sizeDetails?.[prev.sizeDetails.length - 1]?.jenisSakuRompi) || JenisSakuRompi.DALAM,
        };
      } else if (prev.jenisBarang === JenisBarang.CELANA) {
        newDetail = {
          ...newDetail,
          modelCelana: (prev.sizeDetails?.[prev.sizeDetails.length - 1]?.modelCelana) || ModelCelana.WARRIOR,
          bahanCelana: (prev.sizeDetails?.[prev.sizeDetails.length - 1]?.bahanCelana) || BahanCelana.AMERICAN_DRILL,
        };
      }

      return {
        ...prev,
        sizeDetails: [...(prev.sizeDetails || []), newDetail]
      };
    });
    
    // Expand item yang baru ditambahkan
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      newSet.add((formData.sizeDetails?.length || 0));
      return newSet;
    });
  };

  const handleAddSizeToItem = (itemIndex: number) => {
    setFormData(prev => {
      const next = [...(prev.sizeDetails || [])];
      const currentItem = next[itemIndex];
      
      if (!currentItem) return prev;

      // Inisialisasi array sizes jika belum ada
      if (!currentItem.sizes) {
        currentItem.sizes = [
          { size: currentItem.size, jumlah: currentItem.jumlah }
        ];
      }

      // Tambah size baru
      currentItem.sizes.push({ size: '', jumlah: 1 });

      return { ...prev, sizeDetails: next };
    });
  };

  const handleRemoveSizeFromItem = (itemIndex: number, sizeIndex: number) => {
    setFormData(prev => {
      const next = [...(prev.sizeDetails || [])];
      const currentItem = next[itemIndex];
      
      if (!currentItem?.sizes) return prev;

      // Hapus size
      currentItem.sizes.splice(sizeIndex, 1);

      // Jika hanya tersisa 1 size, kembalikan ke format normal
      if (currentItem.sizes.length === 1) {
        currentItem.size = currentItem.sizes[0].size;
        currentItem.jumlah = currentItem.sizes[0].jumlah;
        delete currentItem.sizes;
      }

      return { ...prev, sizeDetails: next };
    });
  };

  const handleUpdateSize = (itemIndex: number, sizeIndex: number, field: 'size' | 'jumlah' | 'gender' | 'tangan', value: any) => {
    setFormData(prev => {
      const next = [...(prev.sizeDetails || [])];
      const currentItem = next[itemIndex];
      
      if (!currentItem?.sizes) return prev;

      if (field === 'jumlah') {
        currentItem.sizes[sizeIndex].jumlah = parseInt(value) || 0;
      } else if (field === 'gender') {
        currentItem.sizes[sizeIndex].gender = value;
      } else if (field === 'tangan') {
        currentItem.sizes[sizeIndex].tangan = value;
      } else {
        currentItem.sizes[sizeIndex].size = value;
      }

      return { ...prev, sizeDetails: next };
    });
  };

  const handleRemoveSize = (index: number) => {
    setFormData(prev => ({ ...prev, sizeDetails: prev.sizeDetails?.filter((_, i) => i !== index) }));
  };

  const handleApplySizeChart = (itemIndex: number, chartId: string, sizeFromChart: string) => {
    const chart = availableSizeCharts.find(c => c.id === chartId);
    if (!chart) return;

    const entry = chart.entries.find(e => e.size === sizeFromChart);
    if (!entry) return;

    setFormData(prev => {
      const next = [...(prev.sizeDetails || [])];
      
      // Tentukan measurements berdasarkan jenis barang
      let customMeasurements: any = {};
      
      if (prev.jenisBarang === JenisBarang.CELANA) {
        // Field untuk celana
        customMeasurements = {
          tinggi: entry.tinggi || (entry as any).panjang || 0,
          lingkarPaha: (entry as any).lingkarPaha || (entry as any).LP || 0,
          lingkarPinggang: (entry as any).lingkarPinggang || (entry as any).LPG || 0,
          lingkarPinggul: (entry as any).lingkarPinggul || (entry as any).LPH || 0,
          lingkarBawah: (entry as any).lingkarBawah || (entry as any).LBW || 0
        };
      } else {
        // Field untuk kemeja (default)
        customMeasurements = {
          tinggi: entry.tinggi || 0,
          lebarDada: entry.lebarDada || 0,
          lebarBahu: entry.lebarBahu || 0,
          lenganPanjang: entry.lenganPanjang || 0,
          lenganPendek: entry.lenganPendek || 0,
          kerah: entry.kerah || 0,
          manset: entry.manset || 0
        };
      }
      
      next[itemIndex] = {
        ...next[itemIndex],
        size: entry.size,
        isCustomSize: true,
        customMeasurements
      };
      return { ...prev, sizeDetails: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPenjahit || !formData.kodeBarang) {
      if (!formData.kodeBarang) {
        setKodeBarangError(true);
        setTimeout(() => setKodeBarangError(false), 3000);
        // Scroll ke field kode barang
        kodeBarangRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (!formData.namaPenjahit) {
        triggerConfirm({
          title: 'Data Tidak Lengkap',
          message: 'Nama Penjahit wajib diisi!',
          type: 'danger',
          onConfirm: () => { }
        });
      }
      return;
    }

    if (showDuplicateWarning) {
      setShowConfirmPopup(true);
    } else {
      const orderToSave = formData as OrderItem;
      onSave(orderToSave);
    }
  };

  const handleConfirmDuplicate = () => {
    const orderToSave = formData as OrderItem;
    onSave(orderToSave);
    setShowConfirmPopup(false);
  };

  const daysUntilDeadline = formData.tanggalTargetSelesai ? differenceInDays(new Date(formData.tanggalTargetSelesai), new Date()) : 999;
  const isUrgent = daysUntilDeadline <= 1;

  return (
    <div className={`p-4 md:p-8 pb-32 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        
        @keyframes urgentCycle {
          0% { background-color: #ef4444; border-color: #f87171; box-shadow: 0 0 20px 5px rgba(239, 68, 68, 0.3); }
          50% { background-color: #f97316; border-color: #fb923c; box-shadow: 0 0 30px 10px rgba(249, 115, 22, 0.4); }
          100% { background-color: #ef4444; border-color: #f87171; box-shadow: 0 0 20px 5px rgba(239, 68, 68, 0.3); }
        }

        @keyframes normalCycle {
          0% { background-color: #f97316; border-color: #fb923c; }
          50% { background-color: #fbbf24; border-color: #fcd34d; }
          100% { background-color: #f97316; border-color: #fb923c; }
        }

        .animate-urgent-cycle {
          animation: urgentCycle 1.5s infinite ease-in-out;
        }

        .animate-normal-cycle {
          animation: normalCycle 4s infinite ease-in-out;
        }

        @keyframes kodeBarangPulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); background-color: rgba(239,68,68,0.08); }
          40%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); background-color: rgba(239,68,68,0.15); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); background-color: rgba(239,68,68,0.08); }
        }

        .animate-kode-error {
          animation: kodeBarangPulse 0.7s ease-in-out 3;
          border-color: #ef4444 !important;
        }
      `}</style>

      {showConfirmPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col text-center space-y-6 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border-4 border-red-100 shadow-inner">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Peringatan Kode Barang</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {duplicateOwner === formData.namaPenjahit ? (
                  <>
                    Kode <span className="text-amber-500 font-black">{formData.kodeBarang}</span> sudah pernah kamu simpan sebelumnya.
                    <br /><br />
                    Apakah ini pekerjaan baru dengan kode yang sama?
                    {isDarkMode ? <br /> : ' '}Jika iya, data akan ditambahkan sebagai entry baru.
                  </>
                ) : (
                  <>
                    Kode ini sudah di simpan oleh <span className="text-emerald-500 font-black">{duplicateOwner || 'user lain'}</span>.
                    <br /><br />
                    Apakah kamu mengerjakan kode barang yang sama?
                    {isDarkMode ? <br /> : ' '}Jika iya maka kode barang bisa di simpan.
                  </>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleConfirmDuplicate}
                className="py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                Iya, Simpan
              </button>
              <button
                onClick={() => setShowConfirmPopup(false)}
                className={`py-4 rounded-2xl font-black text-[10px] uppercase transition-all active:scale-95 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
              >
                Tidak, Ubah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Popup - Singkatan Ukuran */}
      {showInfoPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`relative w-full max-w-md rounded-[3rem] p-8 shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                  <Info size={20} />
                </div>
                <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Singkatan Ukuran</h4>
              </div>
              <button onClick={() => setShowInfoPopup(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <ChevronLeft size={24} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Kemeja */}
              <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-emerald-50'}`}>
                <h5 className="text-[10px] font-black text-emerald-600 uppercase mb-3">Kemeja</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="font-black text-slate-400">T</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Tinggi Badan</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LD</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lebar Dada</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LB</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lebar Bahu</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LPj</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lengan Panjang</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LPd</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lengan Pendek</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">K</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Kerah</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">M</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Manset</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LPr</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lingkar Perut</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LPg</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lingkar Pinggul</span></div>
                </div>
              </div>

              {/* Celana */}
              <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-purple-50'}`}>
                <h5 className="text-[10px] font-black text-purple-600 uppercase mb-3">Celana</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="font-black text-slate-400">T</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Tinggi/Panjang Celana</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LPG</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lingkar Pinggang</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LPH</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lingkar Pinggul</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LPA</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lingkar Paha</span></div>
                  <div className="flex justify-between"><span className="font-black text-slate-400">LBW</span><span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Lingkar Bawah</span></div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInfoPopup(false)}
              className="w-full mt-6 py-4 bg-blue-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className={`p-2.5 rounded-2xl transition-all ${isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-slate-100' : 'bg-white text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100'}`}><ChevronLeft /></button>
          <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Input Kerja Baru</h2>
        </div>

        {/* Tombol Reset/Restore di Header sesuai instruksi visual */}
        {(formData.kodeBarang || isManualMode) && !isScanningGlobal && (
          <button
            type="button"
            onClick={handleResetForm}
            title={scanResultGlobal ? "Restore data scan asli" : "Reset form"}
            className={`flex items-center gap-2 p-3 rounded-2xl transition-all shadow-sm active:scale-95 border-2 ${scanResultGlobal ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : isDarkMode ? 'bg-slate-900 text-red-400 border-slate-800' : 'bg-white text-red-500 border-slate-100'}`}
          >
            <RotateCcw size={20} className={scanResultGlobal ? "text-emerald-500" : ""} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{scanResultGlobal ? "Batal Simpan" : "Reset"}</span>
          </button>
        )}
      </div>

      {isScanningGlobal ? (
        <div className="flex flex-col items-center justify-center py-32 gap-10 text-center">
          <div className="relative"><Loader2 className="animate-spin text-emerald-500" size={80} strokeWidth={3} /><div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" /></div>
          <div className="space-y-4 px-10 max-w-md"><p className={`font-black text-xl leading-snug ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{greeting}</p></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
          {!formData.kodeBarang && !isManualMode && !scanResultGlobal && (
            <div className="space-y-8">
              <div className="bg-[#10b981] rounded-[3.5rem] p-10 md:p-14 text-white flex flex-col items-center justify-center gap-8 shadow-2xl text-center">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30"><FileText size={40} strokeWidth={2.5} /></div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black">Pilih Metode Input</h3>
                  <p className="text-emerald-50/80 text-sm font-medium">Gunakan AI untuk memindai dokumen secara otomatis</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <button type="button" onClick={() => cameraInputRef.current?.click()} className="bg-white text-[#10b981] p-4 rounded-3xl font-black text-sm shadow-xl flex flex-col items-center gap-3 transition-all active:scale-95 hover:brightness-105"><Camera size={24} /> Kamera</button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 text-white p-4 rounded-3xl font-black text-sm shadow-xl flex flex-col items-center gap-3 border border-emerald-400/30 transition-all active:scale-95 hover:brightness-105"><Upload size={24} /> Berkas</button>
                </div>
              </div>
              <button type="button" onClick={handleManualEntry} className={`w-full py-6 rounded-[2.5rem] border-2 border-dashed flex items-center justify-center gap-3 font-black text-sm uppercase transition-all active:scale-95 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-500' : 'bg-white border-slate-200 text-slate-400 shadow-sm hover:border-emerald-500 hover:text-emerald-500'}`}><Package size={20} /> Ketik Manual</button>
            </div>
          )}

          <input type="file" ref={cameraInputRef} onChange={(e) => e.target.files?.[0] && handleImageInput(e.target.files[0])} hidden accept="image/*" capture="environment" />
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageInput(e.target.files[0])} hidden accept="image/*" />

          {(formData.kodeBarang || isManualMode || scanResultGlobal) && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

              {!formData.isManual && formData.kodeBarang && (
                <div className="sticky top-0 z-[60] -mx-2 mb-6 px-2 animate-in slide-in-from-top duration-500">
                  <div className={`p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-between border-2 ring-8 backdrop-blur-md text-white ${isUrgent ? 'animate-urgent-cycle ring-red-500/20' : 'animate-normal-cycle ring-orange-500/20'}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white/20 rounded-2xl">
                        <AlertTriangle size={24} className={isUrgent ? "animate-bounce" : ""} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight">
                        NIH KERJAAN BELUM DISIMPEN!<br /><span className="opacity-80">NANTI HILANG!</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setScanResultGlobal(null);
                          setFormData(INITIAL_FORM_STATE);
                          setIsManualMode(false);
                        }}
                        className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-all active:scale-95"
                        title="Scan Ulang"
                      >
                        <Camera size={20} className="opacity-80" />
                      </button>
                      <div className="p-3 bg-white/20 rounded-2xl">
                        <Save size={20} className="opacity-80" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={`p-8 rounded-[3rem] shadow-xl border space-y-6 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="grid grid-cols-1 gap-6">
                  <FormInput label="Penjahit (Otomatis)" value={formData.namaPenjahit} readOnly isDarkMode={isDarkMode} placeholder="Nama Penjahit" icon={<User size={14} className="text-emerald-500" />} className="opacity-70 bg-slate-100/50" />

                  <div ref={kodeBarangRef} className={`p-1 rounded-[2.5rem] border transition-all ${kodeBarangError ? 'animate-kode-error border-red-500 bg-red-50/30' : isDarkMode ? 'bg-amber-500/5 border-amber-200/50' : 'bg-amber-50/50 border-amber-200/50'}`}>
                    <FormInput
                      label="Kode Barang (4 Digit)"
                      value={formData.kodeBarang}
                      onChange={(v: string) => {
                        setFormData({ ...formData, kodeBarang: v });
                        if (v) setKodeBarangError(false);
                      }}
                      required
                      isDarkMode={isDarkMode}
                      placeholder="Contoh: 1843"
                      error={showDuplicateWarning || kodeBarangError}
                      icon={<FileText size={14} className={kodeBarangError ? "text-red-500" : "text-amber-500"} />}
                      className="!bg-transparent border-none ring-0 focus:ring-0"
                    />
                    {kodeBarangError && (
                      <div className="flex items-center gap-2 px-4 pb-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertTriangle size={12} className="text-red-500 shrink-0" />
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-wide">
                          Isi kode barang 4 digit terlebih dahulu!
                        </span>
                      </div>
                    )}
                  </div>

                  <FormInput label="CS (Admin)" value={formData.cs} onChange={v => setFormData({ ...formData, cs: v })} isDarkMode={isDarkMode} placeholder="Nama CS" icon={<ShieldCheck size={14} />} />
                  <FormInput label="Konsumen" value={formData.konsumen} onChange={v => setFormData({ ...formData, konsumen: v })} isDarkMode={isDarkMode} placeholder="Nama Konsumen" icon={<UserCheck size={14} />} />
                  <FormInput label="Tgl Order" value={formData.tanggalOrder} onChange={v => setFormData({ ...formData, tanggalOrder: v })} isDarkMode={isDarkMode} icon={<Calendar size={14} />} />
                  <FormInput label="Target Selesai" value={formData.tanggalTargetSelesai} onChange={v => setFormData({ ...formData, tanggalTargetSelesai: v })} isDarkMode={isDarkMode} placeholder="12 Jan 2026" icon={<Clock size={14} />} />
                </div>
              </div>

              {/* Pilihan Jenis Barang */}
              <div className={`p-8 rounded-[3rem] shadow-xl border space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <h3 className="text-[12px] font-black text-slate-400 uppercase flex items-center gap-2 ml-2 tracking-[0.2em]">
                  <Package size={14} /> Jenis Barang
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(JenisBarang).map(jenis => (
                    <button
                      key={jenis}
                      type="button"
                      onClick={() => setFormData({ ...formData, jenisBarang: jenis })}
                      className={`py-5 rounded-2xl text-xs font-black uppercase transition-all ${
                        formData.jenisBarang === jenis
                          ? 'bg-[#10b981] text-white shadow-lg scale-[1.02]'
                          : isDarkMode
                          ? 'bg-slate-950 text-slate-400 border border-slate-800'
                          : 'bg-slate-50 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {jenis}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-8 rounded-[3rem] shadow-xl border space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-center mb-2 px-2">
                  <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Rincian Kerja</h3>
                  {formData.jumlahPesanan > 0 && (
                    <div className="bg-[#10b981]/10 text-[#10b981] px-4 py-1.5 rounded-full border border-[#10b981]/20 animate-in zoom-in shadow-sm">
                      <span className="text-[10px] font-black uppercase tracking-widest">{formData.jumlahPesanan} PCS TOTAL</span>
                    </div>
                  )}
                </div>

                <SizeGroupingSection
                  jenisBarang={formData.jenisBarang}
                  sizeDetails={formData.sizeDetails || []}
                  onSizeDetailsChange={(newSizeDetails) => {
                    setFormData({ ...formData, sizeDetails: newSizeDetails });
                  }}
                  isDarkMode={isDarkMode}
                />
              </div>

              <div className={`p-8 rounded-[3rem] shadow-xl border space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <h3 className="text-[12px] font-black text-slate-400 uppercase flex items-center gap-2 ml-2 tracking-[0.2em]"><Scissors size={14} /> Keterangan Bordir</h3>
                <div className={`flex gap-3 p-2 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <button type="button" onClick={() => setFormData({ ...formData, embroideryStatus: 'Lengkap' })} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${formData.embroideryStatus === 'Lengkap' ? 'bg-[#10b981] text-white shadow-lg scale-[1.02]' : 'text-slate-400 font-bold'}`}>Lengkap</button>
                  <button type="button" onClick={() => setFormData({ ...formData, embroideryStatus: 'Kurang' })} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${formData.embroideryStatus === 'Kurang' ? 'bg-[#ef4444] text-white shadow-lg scale-[1.02]' : 'text-slate-400 font-bold'}`}>Kurang</button>
                </div>
                {formData.embroideryStatus === 'Kurang' && (
                  <textarea
                    className={`w-full p-6 rounded-[2rem] text-xs font-bold border min-h-[120px] transition-all outline-none focus:ring-2 focus:ring-[#ef4444]/10 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white text-slate-800 border-slate-200 shadow-inner'}`}
                    placeholder="Detail kekurangan bordir..."
                    value={formData.embroideryNotes}
                    onChange={e => setFormData({ ...formData, embroideryNotes: e.target.value })}
                  />
                )}
              </div>

              <div className={`p-8 rounded-[3rem] shadow-xl border space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Ingin buat reminder di kalender?</span>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Akan diingatkan sesuai tanggal target</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, createCalendarReminder: true })}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.createCalendarReminder ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                      Iya
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, createCalendarReminder: false })}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!formData.createCalendarReminder ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                      Tidak Perlu
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button type="submit" className="w-full bg-[#10b981] text-white font-black py-7 rounded-[3rem] shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all text-xl uppercase tracking-widest hover:brightness-105">
                  <Save size={28} /> SIMPAN PEKERJAAN
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

const FormInput = ({ label, type = 'text', value, onChange, required, isDarkMode, placeholder, readOnly, children, error, icon, className }: any) => (
  <div className="flex flex-col gap-2 flex-1">
    <label className={`text-[11px] font-black uppercase ml-2 tracking-widest transition-colors flex items-center gap-2 ${error ? 'text-red-500' : 'text-slate-400'}`}>
      {icon} {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children ? children : (
      <input
        type={type}
        readOnly={readOnly}
        className={`border rounded-2xl px-6 py-4 text-sm font-black transition-all outline-none focus:ring-4 ${error ? 'border-red-500 bg-red-50/10 focus:ring-red-500/10' : 'focus:ring-[#10b981]/5'} ${isDarkMode ? (error ? 'text-red-300' : 'bg-slate-950 border-slate-800 text-white placeholder-slate-800') : (error ? 'text-red-600' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-inner')} ${className}`}
        value={value || ''}
        onChange={e => !readOnly && onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    )}
  </div>
);

export default ScanScreen;
