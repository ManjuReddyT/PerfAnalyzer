
import React, { useState } from 'react';
import { Activity, BarChart2, Printer, Sun, Moon, X, Info, Menu, FileText, UploadCloud, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
  fileName?: string;
  baselineName?: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
}

const NavItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  onNavigate, 
  fileName, 
  baselineName, 
  darkMode, 
  toggleDarkMode,
  onReset,
  onOpenSettings
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-200">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col shadow-xl 
          transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">PerfAnalyzer</h1>
              <p className="text-xs text-slate-400">Local Report Viewer</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          <NavItem
            id="dashboard"
            label="Dashboard"
            icon={BarChart2}
            active={activeView === 'dashboard'}
            onClick={handleNavClick}
          />
          <NavItem
            id="report"
            label="Report Builder"
            icon={Printer}
            active={activeView === 'report'}
            onClick={handleNavClick}
          />
           <NavItem
            id="about"
            label="About"
            icon={Info}
            active={activeView === 'about'}
            onClick={handleNavClick}
          />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
           {/* Global Settings */}
           <button 
             onClick={onOpenSettings}
             className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
           >
             <Settings className="w-5 h-5 text-indigo-400" />
             Settings
           </button>

           {/* Dark Mode Toggle */}
           <button 
             onClick={toggleDarkMode}
             className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
           >
             <span className="text-sm font-medium">Dark Mode</span>
             {darkMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
           </button>

          {fileName ? (
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2 relative group animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-1">
                 <div className="flex items-center gap-2 text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Current File</span>
                 </div>
                 <button 
                    onClick={onReset}
                    className="text-slate-500 hover:text-white hover:bg-red-500/20 p-1 rounded transition-colors"
                    title="Close File & New Upload"
                 >
                    <X className="w-3.5 h-3.5" />
                 </button>
              </div>
              <p className="text-sm font-medium text-white truncate" title={fileName}>
                {fileName}
              </p>
              
              {baselineName && (
                  <>
                    <div className="w-full h-px bg-slate-700 my-2"></div>
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Baseline File</span>
                    </div>
                    <p className="text-sm font-medium text-white truncate" title={baselineName}>
                        {baselineName}
                    </p>
                  </>
              )}
            </div>
          ) : (
             <button 
                onClick={onReset}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium justify-center"
             >
                <UploadCloud className="w-4 h-4" />
                Upload New File
             </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        {/* Mobile Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 lg:hidden flex items-center justify-between sticky top-0 z-20">
           <span className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
             <Activity className="w-5 h-5 text-blue-500" />
             PerfAnalyzer
           </span>
           <div className="flex items-center gap-4">
              <button 
                onClick={onOpenSettings}
                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-6 h-6 text-slate-600 dark:text-slate-300" />
              </button>
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                 {darkMode ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
              </button>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
};
