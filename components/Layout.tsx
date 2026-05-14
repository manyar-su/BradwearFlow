import React from 'react';
import { Home, Scan, Clock, BarChart3, User, Bell, X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { ViewState, AppNotification } from '../types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewState;
  onViewChange: (view: ViewState) => void;
  onScanClick: () => void;
  isDarkMode: boolean;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  showNotifPanel: boolean;
  setShowNotifPanel: (show: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children, activeView, onViewChange, onScanClick, isDarkMode,
  notifications, setNotifications, showNotifPanel, setShowNotifPanel
}) => {

  const navItems: { view: ViewState; label: string; icon: any }[] = [
    { view: 'DASHBOARD', label: 'Beranda', icon: Home },
    { view: 'HISTORY', label: 'Riwayat', icon: Clock },
    { view: 'SCAN', label: 'Pindai', icon: Scan },
    { view: 'ANALYTICS', label: 'Statistik', icon: BarChart3 },
    { view: 'ACCOUNT', label: 'Akun', icon: User },
  ];

  const activeIndex = navItems.findIndex(item => 
    item.view === activeView || (item.view === 'ACCOUNT' && activeView === 'FORUM_CHAT')
  );

  const getNotifIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle size={14} className="text-emerald-500" />;
      case 'warning': return <AlertCircle size={14} className="text-amber-500" />;
      case 'danger': return <AlertTriangle size={14} className="text-red-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-[#f4f7f9]'}`}>

      {/* Responsive Wrapper for Tablet/Desktop */}
      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto relative overflow-hidden">

        {/* Global Notification Panel */}
        {showNotifPanel && (
          <div className="fixed inset-0 z-[1000] animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNotifPanel(false)} />
            <div className={`absolute right-4 top-4 bottom-4 w-full max-w-[320px] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border animate-in slide-in-from-right duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-100/10">
                <div className="flex flex-col">
                  <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Aktivitas</h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Riwayat Kegiatan</span>
                </div>
                <button onClick={() => setShowNotifPanel(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center gap-4">
                    <Bell size={48} strokeWidth={1} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada aktivitas</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className={`p-4 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'} ${notif.read ? 'opacity-60' : 'scale-[1.02] shadow-sm'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${notif.type === 'success' ? 'bg-emerald-50' :
                          notif.type === 'warning' ? 'bg-amber-50' :
                            notif.type === 'danger' ? 'bg-red-50' : 'bg-blue-50'
                          }`}>
                          {getNotifIcon(notif.type)}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <span className={`text-[10px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{notif.title}</span>
                          <p className="text-[9px] font-bold text-slate-500 leading-tight mt-1">{notif.message}</p>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-2 opacity-50">
                            {format(new Date(notif.timestamp), 'd MMM • HH:mm', { locale: idLocale })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 pt-4 border-t border-slate-100/10">
                <button
                  onClick={() => {
                    setNotifications([]);
                    localStorage.removeItem('bradflow_activity_log');
                  }}
                  className="w-full py-4 rounded-2xl bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                >
                  Bersihkan Riwayat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar smooth-scroll pb-24 px-4 md:px-8" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {children}
        </main>

        {/* Bottom Navigation */}
        <div className={`absolute bottom-0 left-0 right-0 h-24 px-4 pb-safe z-50 transition-colors duration-300 rounded-t-[2.5rem] border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]'}`}>
          <nav className="relative flex items-center h-20 w-full">

            {/* Animated Active Indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
              style={{
                width: `${100 / navItems.length}%`,
                left: `${(activeIndex * 100) / navItems.length}%`,
                padding: '0 6px',
                height: '64px'
              }}
            >
              <div className="w-full h-full bg-[#10b981] rounded-[1.8rem] shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/5" />
            </div>

            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = idx === activeIndex;

              return (
                <button
                  key={item.view}
                  onClick={() => item.view === 'SCAN' ? onScanClick() : onViewChange(item.view as ViewState)}
                  className={`relative z-10 flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${isActive ? 'text-white' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
                >
                  <Icon size={isActive ? 20 : 22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 transition-all ${isActive ? 'opacity-100 translate-y-0.5' : 'opacity-60'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Layout;
