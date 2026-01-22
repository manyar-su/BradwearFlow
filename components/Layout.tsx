
import React from 'react';
import { Home, Scan, Clock, BarChart3, User } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewState;
  onViewChange: (view: ViewState) => void;
  isDarkMode: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange, isDarkMode }) => {
  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto relative overflow-hidden border-x shadow-2xl transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {children}
      </main>

      {/* Fintech Bottom Navigation */}
      <nav className={`absolute bottom-0 left-0 right-0 border-t flex justify-around items-center h-20 px-4 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] z-50 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/90 border-slate-800 backdrop-blur-xl' : 'bg-white/90 border-slate-100 backdrop-blur-xl'}`}>
        <NavItem 
          icon={<Home size={22} />} 
          label="Home" 
          active={activeView === 'DASHBOARD'} 
          onClick={() => onViewChange('DASHBOARD')} 
          isDarkMode={isDarkMode}
        />
        <NavItem 
          icon={<Clock size={22} />} 
          label="History" 
          active={activeView === 'HISTORY'} 
          onClick={() => onViewChange('HISTORY')} 
          isDarkMode={isDarkMode}
        />
        <div className="relative -top-10">
          <button 
            onClick={() => onViewChange('SCAN')}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all active:scale-90 bg-emerald-500 text-white border-4 ${isDarkMode ? 'border-slate-900' : 'border-white'}`}
          >
            <Scan size={28} />
          </button>
        </div>
        <NavItem 
          icon={<BarChart3 size={22} />} 
          label="Stats" 
          active={activeView === 'ANALYTICS'} 
          onClick={() => onViewChange('ANALYTICS')} 
          isDarkMode={isDarkMode}
        />
        <NavItem 
          icon={<User size={22} />} 
          label="Account" 
          active={activeView === 'ACCOUNT'} 
          onClick={() => onViewChange('ACCOUNT')} 
          isDarkMode={isDarkMode}
        />
      </nav>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, isDarkMode }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, isDarkMode: boolean }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center space-y-1 transition-all ${active ? 'text-emerald-500 scale-110' : isDarkMode ? 'text-slate-500' : 'text-slate-400 hover:text-emerald-400'}`}
  >
    {icon}
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default Layout;
