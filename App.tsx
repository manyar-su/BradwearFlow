
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Layout from './components/Layout';
import { OrderItem, ViewState, JobStatus, SakuType, SakuColor, PaymentStatus, AppNotification, ConfirmDialogConfig } from './types';
import { differenceInDays, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { extractOrderData } from './services/geminiService';
import { syncService } from './services/syncService';
import { notificationService } from './services/notificationService';
import { X, Camera, AlertTriangle, AlertCircle, Info, LogOut, ChevronRight, Loader2, Sparkles, FileText, Upload, Keyboard } from 'lucide-react';

// Lazy loading screens for performance
const Dashboard = lazy(() => import('./screens/Dashboard'));
const ScanScreen = lazy(() => import('./screens/ScanScreen'));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen'));
const AnalyticsScreen = lazy(() => import('./screens/AnalyticsScreen'));
const AccountScreen = lazy(() => import('./screens/AccountScreen'));
const ChatScreen = lazy(() => import('./screens/ChatScreen'));

const GREETINGS = [
  "Sabar ya, BradwearFlow lagi baca Rekapan kamu...",
  "Lagi ngitung kancing nih, tunggu sebentar...",
  "Memproses Rekapan jahitan digital Anda...",
  "Dikit lagi beres, datanya lagi dirapiin...",
  "Hampir selesai! Lagi cocokin data rekapannya..."
];

const INDO_MONTHS: Record<string, number> = {
  'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
  'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
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
    return !isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
};

const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>('DASHBOARD');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isScanning, setIsScanning] = useState(false);

  const [scanResult, setScanResult] = useState<Partial<OrderItem> | null>(null);
  const [showScanMethodPopup, setShowScanMethodPopup] = useState(false);
  const [loadingText, setLoadingText] = useState(GREETINGS[0]);
  const [lastBackPress, setLastBackPress] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const globalCameraInputRef = useRef<HTMLInputElement>(null);
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const isScanningRef = useRef(false);
  const lastSaveRef = useRef<string>('');

  const [globalNotification, setGlobalNotification] = useState<{ sender: string, kode: string, type?: 'ADD' | 'DELETE' } | null>(null);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('bradflow_activity_log');
    return saved ? JSON.parse(saved) : [];
  });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'warning'
  });

  const addNotification = (title: string, message: string, type: AppNotification['type']) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50);
      localStorage.setItem('bradflow_activity_log', JSON.stringify(updated));
      return updated;
    });
  };

  const triggerConfirm = (config: Omit<ConfirmDialogConfig, 'isOpen'>) => {
    setConfirmDialog({ ...config, isOpen: true });
  };

  useEffect(() => {
    const saved = localStorage.getItem('tailor_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Deduplicate lokal: cegah item kembar, prioritaskan by id
          const dedupedMap = new Map<string, any>();
          parsed.forEach((o: any) => {
            const key = o.id;
            if (!key) return;
            const prev = dedupedMap.get(key);
            if (!prev) {
              dedupedMap.set(key, o);
              return;
            }
            // Prioritaskan yang punya cloudId
            if (!prev.cloudId && o.cloudId) {
              dedupedMap.set(key, o);
            }
          });
          const deduped = Array.from(dedupedMap.values());
          setOrders(deduped.map(o => ({
            ...o,
            status: o.status || JobStatus.PROSES,
            createdAt: o.createdAt || new Date().toISOString()
          })));
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    }

    const savedPending = localStorage.getItem('pending_scan_result');
    if (savedPending) setScanResult(JSON.parse(savedPending));

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bradwear_global_notif' && e.newValue) {
        try {
          const notif = JSON.parse(e.newValue);
          if (notif && notif.sender && notif.kode) {
            const profileName = localStorage.getItem('profileName') || 'Nama Anda';
            if (notif.sender !== profileName) {
              setGlobalNotification(notif);
              setTimeout(() => setGlobalNotification(null), 5000);
            }
          }
        } catch { }
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleOnline = () => {
      setIsOffline(false);
      addNotification('Online Kembali', 'Mulai sinkronisasi data ke cloud...', 'info');
      syncLocalData();
    };
    const handleOffline = () => {
      setIsOffline(true);
      addNotification('Mode Offline', 'Anda sedang offline. Data akan disimpan lokal dan disinkronkan saat online.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const syncLocalData = async () => {
      const storedOrders = localStorage.getItem('tailor_orders');
      if (storedOrders) {
        const localOrders: OrderItem[] = JSON.parse(storedOrders);
        const unSyncedOrders = localOrders.filter(o => !o.cloudId && !o.deletedAt);
        if (unSyncedOrders.length > 0) {
          for (const order of unSyncedOrders) {
            // Background upload — hanya update cloudId, tidak inject order baru ke state
            const synced = await syncService.pushOrderToCloud(order);
            if (synced && synced.cloudId) {
              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, cloudId: synced.cloudId } : o));
            }
          }
        }
      }
    };
    
    syncLocalData();

    notificationService.init().catch(e => console.log('Notification init skipped:', e));

    const currentVersion = '1.0.3';
    const lastSyncVersion = localStorage.getItem('bradwear_last_sync_version');
    if (lastSyncVersion !== currentVersion) {
      let ordersToSync = [];
      try {
        ordersToSync = JSON.parse(localStorage.getItem('tailor_orders') || '[]');
      } catch (e) {
        console.error("Failed to parse orders for sync:", e);
      }
      if (ordersToSync.length > 0) {
        syncService.syncAllLocalToCloud(ordersToSync).then(() => {
          localStorage.setItem('bradwear_last_sync_version', currentVersion);
        });
      }
    }

    // Supabase realtime: HANYA update cloudId jika order sudah ada di local
    // TIDAK inject order baru dari cloud ke state (mencegah duplikat)
    const orderSubscription = syncService.subscribeToGlobalOrders((order, event) => {
      setOrders(prev => {
        if (event === 'DELETE') {
          return prev.filter(o => o.id !== order.id && o.cloudId !== order.id);
        }
        // Hanya update cloudId untuk order yang sudah ada — jangan tambah baru
        const localOrder = prev.find(o =>
          o.id === order.id ||
          o.id === order.cloudId ||
          (o.cloudId && (o.cloudId === order.cloudId || o.cloudId === order.id)) ||
          (o.kodeBarang === order.kodeBarang &&
           o.namaPenjahit === order.namaPenjahit &&
           Math.abs(new Date(o.createdAt || 0).getTime() - new Date(order.createdAt || 0).getTime()) < 60000)
        );
        if (localOrder) {
          return prev.map(o => o.id === localOrder.id
            ? { ...o, cloudId: o.cloudId || order.cloudId || order.id }
            : o
          );
        }
        // Order dari user lain — tidak ditambahkan ke history lokal
        return prev;
      });
    });

    // Penting: jangan inject realtime order dari Supabase ke Riwayat.
    // Riwayat utama tetap dari localStorage per penjahit login.
    // Fallback: jika lokal kosong, hydrate sekali dari cloud khusus milik penjahit login.
    const hydrateLocalFromCloudIfEmpty = async () => {
      const profileName = (localStorage.getItem('profileName') || '').trim();
      if (!profileName || profileName === 'Nama Anda') return;

      setOrders(prev => {
        const hasLocalForProfile = prev.some(
          o => (o.namaPenjahit || '').toLowerCase().trim() === profileName.toLowerCase()
        );
        if (hasLocalForProfile) return prev;
        return prev;
      });

      const currentLocal: OrderItem[] = (() => {
        try {
          const parsed = JSON.parse(localStorage.getItem('tailor_orders') || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();
      const hasLocalForProfile = currentLocal.some(
        o => (o.namaPenjahit || '').toLowerCase().trim() === profileName.toLowerCase()
      );
      if (hasLocalForProfile) return;

      const cloudOrders = await syncService.getGlobalOrders();
      const mineFromCloud = cloudOrders.filter(
        o => (o.namaPenjahit || '').toLowerCase().trim() === profileName.toLowerCase().trim()
      );
      if (mineFromCloud.length === 0) return;

      setOrders(prev => {
        const merged = [...prev];
        mineFromCloud.forEach(co => {
          const exists = merged.some(
            lo =>
              lo.id === co.id ||
              (lo.cloudId && (lo.cloudId === co.id || lo.cloudId === co.cloudId)) ||
              (
                lo.kodeBarang === co.kodeBarang &&
                (lo.namaPenjahit || '').toLowerCase().trim() === (co.namaPenjahit || '').toLowerCase().trim() &&
                Math.abs(new Date(lo.createdAt || 0).getTime() - new Date(co.createdAt || 0).getTime()) < 60000
              )
          );
          if (!exists) merged.push(co);
        });
        return merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      });
    };
    hydrateLocalFromCloudIfEmpty().catch(e => console.error('Hydrate local history failed:', e));

    const profileName = localStorage.getItem('profileName');
    if (profileName && profileName !== 'Nama Anda') {
      // Deleted orders dari cloud juga tidak di-inject ke state
      // Hanya sync status deletedAt untuk order yang sudah ada di lokal
      syncService.getDeletedOrders(profileName).then(deletedCloudOrders => {
        setOrders(prev => {
          return prev.map(o => {
            const cloudVersion = deletedCloudOrders.find(d => d.id === o.id || (o.cloudId && d.cloudId === o.cloudId));
            if (cloudVersion && cloudVersion.deletedAt && !o.deletedAt) {
              return { ...o, deletedAt: cloudVersion.deletedAt };
            }
            return o;
          });
        });
      });
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (orderSubscription) syncService.unsubscribe(orderSubscription);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('tailor_orders', JSON.stringify(orders));
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (scanResult) {
      localStorage.setItem('pending_scan_result', JSON.stringify(scanResult));
    } else {
      localStorage.removeItem('pending_scan_result');
    }
    const profileName = localStorage.getItem('profileName') || 'Nama Anda';
    notificationService.checkAndNotify(orders, profileName).catch(e => console.log('Deadline check failed:', e));
  }, [orders, isDarkMode, scanResult]);

  useEffect(() => {
    const handleBackButton = () => {
      if (activeView !== 'DASHBOARD') {
        setActiveView('DASHBOARD');
        return;
      }
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        setShowExitConfirm(true);
      } else {
        setLastBackPress(now);
      }
    };
    window.addEventListener('popstate', (e) => {
      e.preventDefault();
      handleBackButton();
      window.history.pushState(null, '', window.location.pathname);
    });
    window.history.pushState(null, '', window.location.pathname);
  }, [activeView, lastBackPress]);

  useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(() => {
        setLoadingText(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const handleGlobalScan = async (base64: string) => {
    setIsScanning(true);
    isScanningRef.current = true;
    setShowScanMethodPopup(false);

    if (isOffline) {
      alert("⚠️ MODE OFFLINE\n\nFitur scan AI memerlukan koneksi internet. Silakan gunakan 'Input Manual' sementara atau cari sinyal internet.");
      setIsScanning(false);
      isScanningRef.current = false;
      return;
    }

    const profileName = localStorage.getItem('profileName') || 'Nama Anda';
    const apiKey = localStorage.getItem('bradwear_gemini_key');
    // We let the geminiService handle the fallback to default/env keys if no user key is provided.
    
    try {
      const extracted = await extractOrderData(base64);
      if (!isScanningRef.current) return;

      if (extracted) {
        let finalSizeDetails = extracted.sizeDetails || [];
        const anyTailorMentioned = finalSizeDetails.some((sd: any) => sd.namaPenjahit && sd.namaPenjahit.trim() !== '');

        if (anyTailorMentioned && profileName) {
          // Ada nama penjahit di rekapan — ambil hanya yang cocok dengan user login
          // Size tanpa nama penjahit (kosong) tetap diambil
          const filtered = finalSizeDetails.filter((sd: any) =>
            !sd.namaPenjahit || sd.namaPenjahit.trim() === '' ||
            sd.namaPenjahit.toLowerCase().trim() === profileName.toLowerCase().trim()
          );
          // Kalau ada yang cocok, pakai yang filtered. Kalau tidak ada sama sekali, ambil semua (fallback)
          finalSizeDetails = filtered.length > 0 ? filtered : finalSizeDetails;
        }

        // Assign namaPenjahit ke profileName untuk semua size yang lolos filter
        finalSizeDetails = finalSizeDetails.map((sd: any) => ({
          ...sd,
          namaPenjahit: profileName || sd.namaPenjahit || ''
        }));

        const savedCharts = localStorage.getItem('bradwear_size_charts');
        const charts = savedCharts ? JSON.parse(savedCharts) : [];
        const mentionsSizeChart = extracted.deskripsiPekerjaan?.toLowerCase().includes('sizechart') || extracted.modelDetail?.toLowerCase().includes('sizechart');

        finalSizeDetails = finalSizeDetails.map((sd: any) => {
          if (!sd.customMeasurements && (mentionsSizeChart || sd.isCustomSize)) {
            for (const chart of charts) {
              const matchingEntry = chart.entries.find((e: any) => e.size.toLowerCase() === sd.size.toLowerCase());
              if (matchingEntry) {
                return {
                  ...sd,
                  isCustomSize: true,
                  customMeasurements: {
                    tinggi: matchingEntry.tinggi || 0,
                    lebarDada: matchingEntry.lebarDada || 0,
                    lebarBahu: matchingEntry.lebarBahu || 0,
                    lenganPanjang: matchingEntry.lenganPanjang || 0,
                    lenganPendek: matchingEntry.lenganPendek || 0,
                    kerah: matchingEntry.kerah || 0,
                    manset: matchingEntry.manset || 0
                  }
                };
              }
            }
          }
          return sd;
        });
        
        const mergedSizeDetails: any[] = [];
        finalSizeDetails.forEach((item: any) => {
          const existingIndex = mergedSizeDetails.findIndex(m => 
            m.size === item.size &&
            m.tangan === item.tangan &&
            m.gender === item.gender &&
            (m.warna || '') === (item.warna || '') &&
            (m.model || '') === (item.model || '') &&
            (m.namaPenjahit || '') === (item.namaPenjahit || '') &&
            (m.namaPerSize || '') === (item.namaPerSize || '') &&
            m.isCustomSize === item.isCustomSize &&
            JSON.stringify(m.customMeasurements || {}) === JSON.stringify(item.customMeasurements || {})
          );

          if (existingIndex > -1) {
            mergedSizeDetails[existingIndex].jumlah = (mergedSizeDetails[existingIndex].jumlah || 0) + (item.jumlah || 0);
          } else {
            mergedSizeDetails.push({ ...item });
          }
        });
        
        finalSizeDetails = mergedSizeDetails;

        const formatDateLong = (dateStr: string) => {
          if (!dateStr) return '';
          const d = new Date(dateStr);
          if (isValidDate(d)) return format(d, 'd MMMM yyyy', { locale: idLocale });
          return dateStr;
        };

        const result: Partial<OrderItem> = {
          ...extracted,
          sizeDetails: finalSizeDetails,
          jumlahPesanan: finalSizeDetails.reduce((sum, sd) => sum + (sd.jumlah || 0), 0),
          namaPenjahit: profileName,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          status: JobStatus.PROSES,
          isManual: false,
          tanggalOrder: formatDateLong(extracted.tanggalOrder) || format(new Date(), 'd MMMM yyyy', { locale: idLocale }),
          tanggalTargetSelesai: formatDateLong(extracted.tanggalTargetSelesai),
          sakuType: extracted.sakuType as SakuType || SakuType.POLOS,
          sakuColor: extracted.sakuColor as SakuColor || SakuColor.ABU,
          embroideryStatus: 'Lengkap'
        };

        setScanResult(result);
        setActiveView('SCAN');
      }
    } catch (err: any) {
      console.error("Scan error details:", err);
      if (isScanningRef.current) {
        const msg = err?.message || "Terjadi kesalahan saat memproses foto.";
        alert(`Gagal Scan: ${msg}\n\nPastikan internet stabil dan teks terlihat jelas.`);
      }
    } finally {
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const handleCancelScan = () => { setIsScanning(false); isScanningRef.current = false; };
  const handleFloatingScanClick = () => setShowScanMethodPopup(true);
  const handleManualEntryFromPopup = () => { setShowScanMethodPopup(false); setScanResult(null); setActiveView('SCAN'); };

  const handleAddOrder = (newOrder: OrderItem) => {
    // Guard: block exact double-save dalam 2 detik (klik ganda)
    const saveKey = `${newOrder.kodeBarang}-${newOrder.namaPenjahit}-${newOrder.jumlahPesanan}`;
    const now = Date.now();
    if (lastSaveRef.current === saveKey + now.toString().slice(0, -3)) {
      console.warn('Double save blocked:', saveKey);
      return;
    }
    lastSaveRef.current = saveKey + now.toString().slice(0, -3);

    const existingIndexById = orders.findIndex(o => o.id === newOrder.id);

    if (existingIndexById > -1) {
      // Edit existing order (same id) → update
      setOrders(prev => prev.map(o => o.id === newOrder.id ? newOrder : o));
      syncService.pushOrderToCloud(newOrder).catch(e => console.error('Update Sync failed:', e));
    } else {
      // Order baru → selalu tambah, biarkan user yang hapus jika duplikat
      const finalizedOrder: OrderItem = {
        ...newOrder,
        id: newOrder.id || Math.random().toString(36).substr(2, 9),
        createdAt: newOrder.createdAt || new Date().toISOString()
      };
      setOrders(prev => {
        // Hanya block jika id persis sama (double-click submit)
        if (prev.some(o => o.id === finalizedOrder.id)) return prev;
        return [finalizedOrder, ...prev];
      });
      if (finalizedOrder.createCalendarReminder && finalizedOrder.tanggalTargetSelesai) createCalendarReminder(finalizedOrder);
      syncService.pushOrderToCloud(finalizedOrder).catch(e => console.error('Initial Sync failed:', e));
    }
    setScanResult(null);
    setActiveView('HISTORY');
  };

  const handleEditFromHistory = (order: OrderItem) => { setScanResult(order); setActiveView('SCAN'); };
  const handleNavigateToHistoryItem = (id: string) => { setTargetOrderId(id); setActiveView('HISTORY'); };

  const createCalendarReminder = async (order: OrderItem) => {
    const CapCalendar = (window as any).Capacitor?.Plugins?.Calendar;
    const targetDate = parseIndoDate(order.tanggalTargetSelesai);
    if (!targetDate) return;
    const title = `Target Selesai: ${order.kodeBarang} - ${order.model}`;
    const desc = `Penjahit: ${order.namaPenjahit}\nKonsumen: ${order.konsumen}`;
    try {
      if (!CapCalendar) throw new Error();
      const hasPermission = await CapCalendar.checkPermissions();
      if (hasPermission.writeCalendar !== 'granted') await CapCalendar.requestPermissions();
      const startDate = new Date(targetDate);
      startDate.setHours(9, 0, 0, 0);
      await CapCalendar.createEvent({ title, notes: desc, startDate: startDate.getTime(), endDate: startDate.getTime() + 3600000 });
      alert("Reminder ditambahkan!");
    } catch {
      const startStr = targetDate.toISOString().replace(/-|:|\.\d+/g, '');
      const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(desc)}&dates=${startStr}/${startStr}`;
      window.open(url, '_blank');
    }
  };

  const handleDeleteOrder = (id: string, searchResults?: OrderItem[], skipConfirm = false) => {
    let order = orders.find(o => o.id === id || (o.cloudId && o.cloudId === id));
    if (!order && searchResults) order = searchResults.find(o => o.id === id || (o.cloudId && o.cloudId === id));
    if (!order) return;
    const profileName = localStorage.getItem('profileName') || '';
    if (profileName && order.namaPenjahit && order.namaPenjahit.toLowerCase().trim() !== profileName.toLowerCase().trim()) {
      if (!skipConfirm) triggerConfirm({ title: 'Akses Ditolak', message: `Hanya ${order.namaPenjahit} yang boleh menghapus.`, type: 'info', onConfirm: () => { } });
      return;
    }
    const performDelete = () => {
      const deletedAt = new Date().toISOString();
      const updatedOrder = { ...order, deletedAt };
      setOrders(prev => [updatedOrder, ...prev.filter(o => o.id !== id && o.cloudId !== id && o.id !== order?.id && o.cloudId !== order?.cloudId)]);
      syncService.pushOrderToCloud(updatedOrder).catch(e => console.error('Delete Sync failed:', e));
      addNotification('Data Dihapus', `Order #${order?.kodeBarang} dipindahkan ke sampah`, 'warning');
    };
    if (skipConfirm) performDelete();
    else triggerConfirm({ 
      title: 'HAPUS RIWAYAT?', 
      message: 'Data akan dipindahkan ke tempat sampah. Anda bisa mengembalikannya dari menu Akun.', 
      type: 'warning', 
      onConfirm: performDelete 
    });
  };

  const handleRestoreOrder = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const updated = { ...order, deletedAt: null };
    setOrders(orders.map(o => o.id === id ? updated : o));
    syncService.pushOrderToCloud(updated).catch(e => console.error('Restore Sync failed:', e));
    addNotification('Data Dipulihkan', `Order #${order.kodeBarang} dikembalikan`, 'info');
  };

  const handlePermanentDelete = (id: string) => {
    syncService.deleteOrderPermanently(id).catch(e => console.error('Permanent Delete Sync failed:', e));
    setOrders(prev => prev.filter(o => o.id !== id && o.cloudId !== id));
    addNotification('Data Terhapus', 'Dihapus permanen', 'danger');
  };

  const handleBulkPermanentDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    ids.forEach(id => syncService.deleteOrderPermanently(id).catch(e => console.error('Bulk Permanent Delete failed:', e)));
    setOrders(prev => prev.filter(o => !idSet.has(o.id) && !(o.cloudId && idSet.has(o.cloudId))));
    addNotification('Data Terhapus', `${ids.length} data dihapus permanen`, 'danger');
  };

  const handleUpdateStatus = (id: string, newStatus: JobStatus) => {
    setOrders(orders.map(o => {
      if (o.id === id || (o.cloudId && o.cloudId === id)) {
        const updated = { 
          ...o, 
          status: newStatus, 
          completedAt: newStatus === JobStatus.BERES ? new Date().toISOString() : null,
          // PERBAIKAN: Hapus deletedAt saat item di-restore (status berubah ke PROSES)
          deletedAt: newStatus === JobStatus.PROSES ? null : o.deletedAt
        };
        syncService.pushOrderToCloud(updated).catch(e => console.error('Status Sync failed:', e));
        return updated;
      }
      return o;
    }));
  };

  const handleBulkUpdateStatus = (ids: string[], newStatus: JobStatus, newPaymentStatus?: PaymentStatus) => {
    const idsSet = new Set(ids);
    setOrders(orders.map(o => {
      if (idsSet.has(o.id) || (o.cloudId && idsSet.has(o.cloudId))) {
        const updated = { 
          ...o, 
          status: newStatus, 
          completedAt: newStatus === JobStatus.BERES ? new Date().toISOString() : null,
          deletedAt: newStatus === JobStatus.PROSES ? null : o.deletedAt,
          paymentStatus: newPaymentStatus !== undefined ? newPaymentStatus : o.paymentStatus
        };
        syncService.pushOrderToCloud(updated).catch(e => console.error('Bulk Status Sync failed:', e));
        return updated;
      }
      return o;
    }));
  };

  const handleBulkDelete = (ids: string[], permanent: boolean = false) => {
    if (permanent) {
      const idsSet = new Set(ids);
      setOrders(orders.filter(o => !idsSet.has(o.id) && !(o.cloudId && idsSet.has(o.cloudId))));
      ids.forEach(id => syncService.deleteOrderPermanently(id).catch(e => console.error('Bulk Delete Sync failed:', e)));
      addNotification('Data Terhapus', `${ids.length} data dihapus permanen`, 'danger');
    } else {
      const idsSet = new Set(ids);
      const now = new Date().toISOString();
      setOrders(orders.map(o => {
        if (idsSet.has(o.id) || (o.cloudId && idsSet.has(o.cloudId))) {
          const updated = { ...o, deletedAt: now };
          syncService.pushOrderToCloud(updated).catch(e => console.error('Bulk Soft Delete Sync failed:', e));
          return updated;
        }
        return o;
      }));
      addNotification('Data Dipindahkan', `${ids.length} data dipindahkan ke tempat sampah. Buka menu Akun untuk mengembalikan atau menghapus permanen.`, 'warning');
    }
  };

  const handleUpdatePayment = (id: string, newStatus: PaymentStatus) => {
    setOrders(orders.map(o => {
      if (o.id === id || (o.cloudId && o.cloudId === id)) {
        const updated = { ...o, paymentStatus: newStatus };
        syncService.pushOrderToCloud(updated).catch(e => console.error('Payment Sync failed:', e));
        return updated;
      }
      return o;
    }));
  };

  const handleUpdateOrder = (updatedOrder: OrderItem) => {
    setOrders(orders.map(o => (o.id === updatedOrder.id || (o.cloudId && o.cloudId === updatedOrder.cloudId)) ? updatedOrder : o));
    syncService.pushOrderToCloud(updatedOrder).catch(e => console.error('Update Sync failed:', e));
  };

  const profileName = localStorage.getItem('profileName') || '';
  const myOrders = profileName
    ? orders.filter(o => !o.namaPenjahit || o.namaPenjahit.toLowerCase().trim() === profileName.toLowerCase().trim())
    : orders;
  const activeOrders = myOrders.filter(o => !o.deletedAt);
  const deletedOrders = myOrders.filter(o => !!o.deletedAt);

  return (
    <Layout
      activeView={activeView} onViewChange={setActiveView} onScanClick={handleFloatingScanClick} isDarkMode={isDarkMode}
      notifications={notifications} setNotifications={setNotifications} showNotifPanel={showNotifPanel} setShowNotifPanel={setShowNotifPanel}
    >
      {globalNotification && (
        <div className="fixed top-24 left-4 right-4 z-[600] animate-in slide-in-from-top-4 duration-500">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-slate-700/50 overflow-hidden">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse shadow-lg shadow-emerald-500/20">
              <Sparkles size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${globalNotification.type === 'DELETE' ? 'text-red-400' : 'text-emerald-400'}`}>
                {globalNotification.type === 'DELETE' ? 'Data Dihapus!' : 'Kerjaan Baru!'}
              </p>
              <p className="text-xs font-bold leading-tight line-clamp-2">
                <span className="text-white italic">{globalNotification.sender}</span> {globalNotification.type === 'DELETE' ? 'menghapus' : 'mengerjakan'} kode <span className={globalNotification.type === 'DELETE' ? 'text-red-400' : 'text-emerald-400'}>#{globalNotification.kode}</span>
              </p>
            </div>
            <button onClick={() => setGlobalNotification(null)} className="p-2 text-slate-500"><X size={18} /></button>
            <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-5000 ease-linear w-full" />
          </div>
        </div>
      )}

      {scanResult && scanResult.kodeBarang && activeView !== 'SCAN' && !isScanning && (
        <div onClick={() => setActiveView('SCAN')} className="fixed top-20 left-4 right-4 z-[400] animate-in slide-in-from-top-4 duration-500 cursor-pointer">
          <div className="bg-orange-500 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border-2 border-orange-400">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl"><AlertTriangle size={20} className="animate-pulse" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Ada kerjaan belum disimpan!</p>
                <p className="text-[9px] font-bold text-orange-100 uppercase mt-1">Tap untuk lanjut & simpan</p>
              </div>
            </div>
            <ChevronRight size={20} className="opacity-60" />
          </div>
        </div>
      )}

      {isScanning && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative mb-8">
            <Loader2 className="animate-spin text-[#10b981]" size={72} strokeWidth={3} />
            <div className="absolute inset-0 bg-[#10b981] blur-3xl opacity-20 animate-pulse" />
          </div>
          <div className="text-center space-y-3 max-w-xs">
            <h2 className="text-white text-xl font-black uppercase tracking-tight">AI Processing</h2>
            <p className="text-[#10b981] font-black text-sm leading-tight animate-pulse h-12 flex items-center justify-center">{loadingText}</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest pt-4 opacity-50">Mohon tunggu sebentar...</p>
            <button onClick={handleCancelScan} className="mt-10 px-8 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Batal Scan</button>
          </div>
        </div>
      )}

      {showScanMethodPopup && !isScanning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`relative w-full max-w-xs rounded-[3rem] p-8 shadow-2xl flex flex-col gap-6 text-center ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <button onClick={() => setShowScanMethodPopup(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500"><X size={24} /></button>
            <div className="flex flex-col items-center gap-2 mt-4">
              <div className="w-16 h-16 bg-emerald-50 text-[#10b981] rounded-full flex items-center justify-center mb-2 shadow-inner"><FileText size={32} /></div>
              <h4 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Pilih Input</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Gunakan OCR AI atau ketik manual</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => globalCameraInputRef.current?.click()} className="py-4 bg-[#10b981] text-white rounded-2xl font-black flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all uppercase text-[9px] tracking-widest"><Camera size={20} /> Kamera</button>
                <button onClick={() => globalFileInputRef.current?.click()} className={`py-4 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-all active:scale-95 uppercase text-[9px] tracking-widest border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}><Upload size={20} /> Berkas</button>
              </div>
              <button onClick={handleManualEntryFromPopup} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 uppercase text-[10px] tracking-widest border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-emerald-500' : 'bg-white border-emerald-100 text-[#10b981] shadow-sm'}`}><Keyboard size={18} /> Ketik Manual</button>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={globalCameraInputRef} accept="image/*" capture="environment" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { const base64 = (reader.result as string).split(',')[1]; handleGlobalScan(base64); }; reader.readAsDataURL(file); } e.target.value = ''; }} />
      <input type="file" ref={globalFileInputRef} accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { const base64 = (reader.result as string).split(',')[1]; handleGlobalScan(base64); }; reader.readAsDataURL(file); } e.target.value = ''; }} />

      <div className="flex-1 flex flex-col relative overflow-hidden transition-all duration-500">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
          <div key={activeView} className="animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both flex-1 flex flex-col">
            {activeView === 'DASHBOARD' && <Dashboard orders={myOrders} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isDarkMode={isDarkMode} unreadCount={notifications.filter(n => !n.read).length} onShowNotifications={() => setShowNotifPanel(true)} toggleDarkMode={() => { const next = !isDarkMode; setIsDarkMode(next); localStorage.setItem('theme', next ? 'dark' : 'light'); }} onScanClick={() => setShowScanMethodPopup(true)} onViewHistory={handleNavigateToHistoryItem} onUpdateStatus={handleUpdateStatus} onUpdateOrder={handleUpdateOrder} onDelete={handleDeleteOrder} triggerConfirm={triggerConfirm} />}
            {activeView === 'SCAN' && <ScanScreen onSave={handleAddOrder} onCancel={() => setActiveView('DASHBOARD')} isDarkMode={isDarkMode} existingOrders={activeOrders} isScanningGlobal={isScanning} scanResultGlobal={scanResult} onStartScan={handleGlobalScan} setScanResultGlobal={setScanResult} triggerConfirm={triggerConfirm} />}
            {activeView === 'HISTORY' && <HistoryScreen orders={activeOrders} onDelete={(id) => handleDeleteOrder(id, undefined, false)} onBulkDelete={handleBulkDelete} onUpdateStatus={handleUpdateStatus} onBulkUpdateStatus={handleBulkUpdateStatus} onUpdatePayment={handleUpdatePayment} onEdit={handleEditFromHistory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isDarkMode={isDarkMode} targetId={targetOrderId} clearTargetId={() => setTargetOrderId(null)} triggerConfirm={triggerConfirm} />}
            {activeView === 'ANALYTICS' && <AnalyticsScreen orders={myOrders} isDarkMode={isDarkMode} currentPenjahit={profileName || undefined} />}
            {activeView === 'ACCOUNT' && <AccountScreen orders={activeOrders} deletedOrders={deletedOrders} onRestore={handleRestoreOrder} onPermanentDelete={handlePermanentDelete} onBulkPermanentDelete={handleBulkPermanentDelete} onUpdateOrder={handleUpdateOrder} isDarkMode={isDarkMode} onViewChange={setActiveView} triggerConfirm={triggerConfirm} />}
            {activeView === 'FORUM_CHAT' && <ChatScreen isDarkMode={isDarkMode} />}
          </div>
        </Suspense>
      </div>


      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`relative w-full max-w-xs rounded-[3rem] p-8 shadow-2xl flex flex-col text-center space-y-6 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border-4 shadow-inner ${confirmDialog.type === 'danger' ? (isDarkMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-500 border-red-100') : confirmDialog.type === 'warning' ? (isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-500 border-amber-100') : (isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-500 border-blue-100')}`}>
              {confirmDialog.type === 'danger' ? <AlertTriangle size={32} /> : confirmDialog.type === 'warning' ? <AlertCircle size={32} /> : <Info size={32} />}
            </div>
            <div className="space-y-2">
              <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{confirmDialog.title}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { confirmDialog.onConfirm?.(); setConfirmDialog(prev => ({ ...prev, isOpen: false })); }} className={`py-4 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all ${confirmDialog.type === 'danger' ? 'bg-red-500 shadow-red-500/20' : confirmDialog.type === 'warning' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-blue-500 shadow-blue-500/20'}`}>{confirmDialog.onConfirm ? 'Iya, Lanjutkan' : 'Mengerti'}</button>
              {confirmDialog.onConfirm && <button onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} className={`py-4 rounded-2xl font-black text-[10px] uppercase transition-all active:scale-95 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>Batal</button>}
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className={`relative w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col text-center space-y-6 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto border-4 border-slate-200 shadow-inner"><LogOut size={32} /></div>
            <div className="space-y-2">
              <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Keluar Aplikasi?</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Apakah Anda yakin ingin keluar?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { (window as any).Capacitor?.Plugins?.App ? (window as any).Capacitor.Plugins.App.exitApp() : window.close(); setShowExitConfirm(false); }} className="py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all">Iya, Keluar</button>
              <button onClick={() => setShowExitConfirm(false)} className={`py-4 rounded-2xl font-black text-[10px] uppercase transition-all active:scale-95 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {isOffline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 duration-500">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Mode Offline Aktif
        </div>
      )}
    </Layout>
  );
};

export default App;
