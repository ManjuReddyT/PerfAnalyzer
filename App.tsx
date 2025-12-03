
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { FileUpload } from './components/FileUpload';
import { DashboardView } from './views/DashboardView';
import { ReportView } from './views/ReportView';
import { AboutView } from './views/AboutView';
import { ChatWidget } from './components/ChatWidget';
import { GlobalSettings } from './components/GlobalSettings';
import { processData } from './utils/analytics';
import { generateSampleData } from './utils/sampleData';
import { openFileHandle, getFileFromHandle, saveProjectFile } from './utils/liveFile';
import { ProcessedData, ProjectState } from './types';
import { Moon, Sun, Settings, X } from 'lucide-react';
import { AIConfig } from './utils/aiAnalytics';

function App() {
  const [reports, setReports] = useState<ProcessedData[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [thresholds, setThresholds] = useState({ responseTime: 500, errorRate: 1.0 });
  const [isAddingReport, setIsAddingReport] = useState(false);

  // Global Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(true);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
      provider: 'ollama', 
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3',
      geminiKey: ''
  });

  // Live File Monitoring State
  const [liveFileHandle, setLiveFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [lastModified, setLastModified] = useState<number>(0);
  const [livePollInterval, setLivePollInterval] = useState<number>(5000); 
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load Global Settings from LocalStorage
  useEffect(() => {
    const savedAiConfig = localStorage.getItem('perfAnalyzer_aiConfig');
    if (savedAiConfig) {
        try {
            setAiConfig(prev => ({ ...prev, ...JSON.parse(savedAiConfig) }));
        } catch(e) {}
    }

    const savedChatEnabled = localStorage.getItem('perfAnalyzer_chatEnabled');
    if (savedChatEnabled !== null) {
        setIsChatEnabled(savedChatEnabled === 'true');
    }
  }, []);

  const updateAiConfig = (newConfig: AIConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('perfAnalyzer_aiConfig', JSON.stringify(newConfig));
  };

  const toggleChat = (enabled: boolean) => {
    setIsChatEnabled(enabled);
    localStorage.setItem('perfAnalyzer_chatEnabled', String(enabled));
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // --- Live File Polling Logic ---
  const checkLiveFile = async (force: boolean = false) => {
      if (!liveFileHandle || !activeReportId) return;
      try {
          const file = await getFileFromHandle(liveFileHandle);
          if (force || file.lastModified > lastModified) {
             setLastModified(file.lastModified);
             // Re-process active report
             const newData = await processData(file, () => {});
             setReports(prev => prev.map(r => r.id === activeReportId ? { ...newData, id: r.id } : r));
          }
      } catch (err) {
          console.error("Error polling file:", err);
          stopWatching();
      }
  };

  useEffect(() => {
    if (liveFileHandle && livePollInterval > 0) {
      pollIntervalRef.current = window.setInterval(() => checkLiveFile(false), livePollInterval);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [liveFileHandle, lastModified, livePollInterval, activeReportId]);

  const handleManualLiveRefresh = () => {
      checkLiveFile(true);
  };

  const stopWatching = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setLiveFileHandle(null);
  };

  const handleRemoveReport = (id: string) => {
      const newReports = reports.filter(r => r.id !== id);
      setReports(newReports);
      if (activeReportId === id) {
          setActiveReportId(newReports.length > 0 ? newReports[0].id : null);
      }
      if (newReports.length === 0) {
          setLiveFileHandle(null);
          stopWatching();
          setActiveView('dashboard');
      }
  };

  const handleReset = () => {
    setReports([]);
    setActiveReportId(null);
    setLiveFileHandle(null);
    stopWatching();
    setActiveView('dashboard');
    setError(null);
  };

  // --- File Handlers ---

  const handleFileUpload = async (files: File[]) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    if(isAddingReport) setIsAddingReport(false);

    try {
      const progressInterval = setInterval(() => {
          setProgress(prev => (prev >= 90 ? prev : prev + 5));
      }, 100);

      const processedFiles = await Promise.all(files.map(f => processData(f, () => {})));
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
          setReports(prev => {
              const updated = [...prev, ...processedFiles];
              return updated.slice(0, 10);
          });
          
          if (!activeReportId && processedFiles.length > 0) {
              setActiveReportId(processedFiles[0].id);
          } else if (files.length === 1 && reports.length > 0) {
              setActiveReportId(processedFiles[0].id);
          }

          setLoading(false);
      }, 500);
      
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
      setLoading(false);
    }
  };

  const handleUrlUpload = async (url: string) => {
    setLoading(true);
    setProgress(10);
    setError(null);
    if(isAddingReport) setIsAddingReport(false);
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed: ${response.status} ${response.statusText}`);
        setProgress(30);
        
        const blob = await response.blob();
        const fileName = url.substring(url.lastIndexOf('/') + 1) || 'remote_data.csv';
        const file = new File([blob], fileName, { type: blob.type });
        
        setProgress(50);
        await handleFileUpload([file]);
    } catch (err: any) {
        setError(`Failed to load URL: ${err.message}`);
        setLoading(false);
    }
  };

  const handleWatchLive = async () => {
    try {
      const handle = await openFileHandle();
      const file = await getFileFromHandle(handle);
      setLiveFileHandle(handle);
      setLastModified(file.lastModified);
      
      // Initial Load as a new report
      await handleFileUpload([file]);
    } catch (err) {
      console.log("Watch cancelled or failed", err);
    }
  };

  const handleSaveSession = async () => {
    const session: ProjectState = {
      version: '1.1',
      timestamp: Date.now(),
      reports: reports,
      thresholds: thresholds,
      notes: ''
    };

    const fileName = `perf-session-${new Date().toISOString().slice(0,10)}.perf`;
    const json = JSON.stringify(session);
    await saveProjectFile(json, fileName);
  };

  const handleLoadSession = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const session: ProjectState = JSON.parse(text);
      
      if ((session as any).mainData) {
          const legacy = session as any;
          setReports([legacy.mainData, ...(legacy.baselineData ? [legacy.baselineData] : [])]);
          setActiveReportId(legacy.mainData.id);
      } else if (session.reports) {
          setReports(session.reports);
          if (session.reports.length > 0) setActiveReportId(session.reports[0].id);
      } else {
          throw new Error("Invalid session format");
      }

      setThresholds(session.thresholds || { responseTime: 500, errorRate: 1.0 });
      setLoading(false);
      stopWatching();

    } catch (err: any) {
      setError("Failed to load session: " + err.message);
      setLoading(false);
    }
  };

  const handleUseSample = () => {
    const mainSample = generateSampleData('current');
    const baselineSample = generateSampleData('baseline');
    handleFileUpload([mainSample, baselineSample]);
  };

  const activeReport = reports.find(r => r.id === activeReportId) || null;

  const renderContent = () => {
    if (!activeReport) return null;

    switch (activeView) {
      case 'dashboard':
        return (
            <DashboardView 
                data={activeReport} 
                allReports={reports}
                onNavigate={setActiveView} 
                thresholds={thresholds} 
                onUpdateThresholds={setThresholds} 
                onSaveSession={handleSaveSession}
                isLive={!!liveFileHandle}
                livePollInterval={livePollInterval}
                onSetPollInterval={setLivePollInterval}
                onForceRefresh={handleManualLiveRefresh}
            />
        );
      case 'report':
        return <ReportView data={activeReport} baselineData={reports.find(r => r.id !== activeReportId)} thresholds={thresholds} aiConfig={aiConfig} />;
      case 'about':
        return <AboutView />;
      default:
        return null;
    }
  };

  // If no reports loaded, show initial upload screen
  if (reports.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
        <div className="absolute top-0 right-0 p-4 flex gap-2">
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
             <Settings className="w-5 h-5 text-indigo-500" />
           </button>
           <button onClick={toggleDarkMode} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
             {darkMode ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
           </button>
        </div>
        <FileUpload 
          onFileUpload={handleFileUpload}
          onUrlUpload={handleUrlUpload}
          onSampleData={handleUseSample}
          onWatchLive={handleWatchLive}
          onLoadSession={handleLoadSession}
          isLoading={loading} 
          progress={progress}
          error={error} 
        />
        {isChatEnabled && <ChatWidget contextData={null} config={aiConfig} />}
        <GlobalSettings 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            config={aiConfig}
            onUpdateConfig={updateAiConfig}
            chatEnabled={isChatEnabled}
            onToggleChat={toggleChat}
        />
      </div>
    );
  }

  return (
    <>
      <Layout 
        activeView={activeView} 
        onNavigate={setActiveView} 
        reports={reports}
        activeReportId={activeReportId}
        onSelectReport={setActiveReportId}
        onRemoveReport={handleRemoveReport}
        onAddReport={() => setIsAddingReport(true)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
      >
        {renderContent()}
        {isChatEnabled && <ChatWidget contextData={activeReport} config={aiConfig} />}
      </Layout>
      
      <GlobalSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        config={aiConfig}
        onUpdateConfig={updateAiConfig}
        chatEnabled={isChatEnabled}
        onToggleChat={toggleChat}
      />

      {/* Add Report Modal */}
      {isAddingReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-800">
                  <button onClick={() => setIsAddingReport(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                      <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">Add Report</h3>
                  <FileUpload 
                    onFileUpload={handleFileUpload}
                    onUrlUpload={handleUrlUpload}
                    onSampleData={handleUseSample}
                    onWatchLive={handleWatchLive}
                    onLoadSession={handleLoadSession}
                    isLoading={loading} 
                    progress={progress}
                    error={error} 
                    isCompact={true}
                  />
              </div>
          </div>
      )}
    </>
  );
}

export default App;
