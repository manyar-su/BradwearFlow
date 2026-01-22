import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './screens/Dashboard';
import ScanScreen from './screens/ScanScreen';
import HistoryScreen from './screens/HistoryScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import AccountScreen from './screens/AccountScreen';
import { OrderItem, ViewState, JobStatus, Priority, SakuType, SakuColor } from './types';
// Fix: Removed parseISO from date-fns import due to export errors in this environment
import { differenceInDays, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { AlertTriangle, X } from 'lucide-react';
import { extractOrderData } from './services/geminiService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>('DASHBOARD');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showPopup, setShowPopup] = useState(false);
  const [urgentOrders, setUrgentOrders] = useState<OrderItem[]>([]);

  // Scanning State (Global)
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Partial<OrderItem> | null>(null);

  // Persist data and theme
  useEffect(() => {
    const saved = localStorage.getItem('tailor_orders');
    if (saved) setOrders(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('tailor_orders', JSON.stringify(orders));
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    const urgent = orders.filter(o => {
      if (o.status === JobStatus.BERES) return false;
      try {
        const parts = o.tanggalTargetSelesai.split('-');
        const d = parts.length === 3 ? new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])) : new Date(o.tanggalTargetSelesai);
        const days = differenceInDays(d, new Date());
        return days >= 0 && days <= 2;
      } catch { return false; }
    });
    
    if (urgent.length > 0) {
      setUrgentOrders(urgent);
    }
  }, [orders, isDarkMode]);

  const handleGlobalScan = async (base64: string) => {
    setIsScanning(true);
    setActiveView('SCAN'); // Auto-switch to scan view to show progress
    try {
      const extracted = await extractOrderData(base64);
      if (extracted) {
        // Format dates into long Indonesian format before setting state
        const formatDateLong = (dateStr: string) => {
          if (!dateStr) return '';
          try {
            // Fix: Use new Date() instead of parseISO as it might not be exported
            const d = new Date(dateStr);
            return format(d, 'd MMMM yyyy', { locale: idLocale });
          } catch { return dateStr; }
        };

        setScanResult({
          ...extracted,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          status: JobStatus.PROSES,
          isManual: false,
          tanggalOrder: formatDateLong(extracted.tanggalOrder) || format(new Date(), 'd MMMM yyyy', { locale: idLocale }),
          tanggalTargetSelesai: formatDateLong(extracted.tanggalTargetSelesai),
          sakuType: extracted.sakuType || SakuType.POLOS,
          sakuColor: extracted.sakuColor || SakuColor.ABU
        });
      }
    } catch (err) {
      alert("Gagal membaca foto. Teks harus terlihat jelas.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddOrder = (newOrder: OrderItem) => {
    const isDuplicate = orders.some(o => o.kodeBarang === newOrder.kodeBarang && o.namaPenjahit === newOrder.namaPenjahit);
    if (isDuplicate) {
      alert("Pesanan dengan Kode Barang ini sudah ada untuk penjahit tersebut.");
      return;
    }
    setOrders([newOrder, ...orders]);
    setScanResult(null);
    setActiveView('HISTORY');
  };

  const handleDeleteOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  const handleUpdateStatus = (id: string, newStatus: any) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  return (
    <Layout 
      activeView={activeView} 
      onViewChange={setActiveView} 
      isDarkMode={isDarkMode} 
    >
      {activeView === 'DASHBOARD' && (
        <Dashboard 
          orders={orders} 
          onScanClick={() => setActiveView('SCAN')} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
      )}
      {activeView === 'SCAN' && (
        <ScanScreen 
          existingOrders={orders} 
          onSave={handleAddOrder} 
          onCancel={() => { setScanResult(null); setActiveView('DASHBOARD'); }} 
          isDarkMode={isDarkMode} 
          isScanningGlobal={isScanning}
          scanResultGlobal={scanResult}
          onStartScan={handleGlobalScan}
          setScanResultGlobal={setScanResult}
        />
      )}
      {activeView === 'HISTORY' && (
        <HistoryScreen 
          orders={orders} 
          onDelete={handleDeleteOrder} 
          onUpdateStatus={handleUpdateStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isDarkMode={isDarkMode}
        />
      )}
      {activeView === 'ANALYTICS' && (
        <AnalyticsScreen orders={orders} isDarkMode={isDarkMode} />
      )}
      {activeView === 'ACCOUNT' && (
        <AccountScreen orders={orders} isDarkMode={isDarkMode} />
      )}
    </Layout>
  );
};

export default App;