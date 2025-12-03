
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
import { Moon, Sun } from 'lucide-react';
import { AIConfig } from './utils/aiAnalytics';

function App() {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [baselineData, setBaselineData] = useState<ProcessedData | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [thresholds, setThresholds] = useState({ responseTime: 500, errorRate: 1.0 });

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
  const [livePollInterval, setLivePollInterval] = useState<number>(5000); // Default 5s
  const pollIntervalRef = useRef<number | null>(null);

  // Initialize Dark Mode based on preference or system
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
      if (!liveFileHandle) return;
      try {
          const file = await getFileFromHandle(liveFileHandle);
          if (force || file.lastModified > lastModified) {
             setLastModified(file.lastModified);
             // Re-process quietly
             processData(file, () => {}).then(newData => {
                setData(newData);
             });
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
  }, [liveFileHandle, lastModified, livePollInterval]);

  const handleManualLiveRefresh = () => {
      checkLiveFile(true);
  };

  const stopWatching = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setLiveFileHandle(null);
  };

  const handleReset = () => {
    setData(null);
    setBaselineData(null);
    setLiveFileHandle(null);
    stopWatching();
    setActiveView('dashboard');
    setError(null);
  };

  // --- File Handlers ---

  const handleFileUpload = async (mainFile: File, baselineFile?: File, errorFile?: File) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    stopWatching(); // Stop any existing live watch

    try {
      // Simulate slight progress for non-parsing stages
      const progressInterval = setInterval(() => {
          setProgress(prev => {
              if(prev >= 90) return prev;
              return prev + 5;
          });
      }, 100);

      // Process Main File
      const mainResult = await processData(mainFile, () => {});
      
      // Process Baseline File if exists
      let baselineResult = null;
      if (baselineFile) {
        baselineResult = await processData(baselineFile, () => {});
      }
      
      // Process Error File if exists (Detailed logs)
      if (errorFile) {
          // Skip analysis for error file to speed up
          const errorResult = await processData(errorFile, () => {}, true);
          mainResult.detailedFailures = errorResult.rawRows;
      }

      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
          setData(mainResult);
          setBaselineData(baselineResult);
          setLoading(false);
      }, 500);
      
    } catch (err: any) {
      setError(err.message || "Failed to parse file. Please ensure it's a valid JMeter CSV/JTL.");
      setLoading(false);
    }
  };

  const handleUrlUpload = async (url: string) => {
    setLoading(true);
    setProgress(10);
    setError(null);
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        setProgress(30);
        
        const blob = await response.blob();
        // Extract filename from URL or default
        const fileName = url.substring(url.lastIndexOf('/') + 1) || 'remote_data.csv';
        const file = new File([blob], fileName, { type: blob.type });
        
        setProgress(50);
        await handleFileUpload(file);
    } catch (err: any) {
        setError(`Failed to load URL: ${err.message}. Ensure the server supports CORS.`);
        setLoading(false);
    }
  };

  const handleWatchLive = async () => {
    try {
      const handle = await openFileHandle();
      const file = await getFileFromHandle(handle);
      setLiveFileHandle(handle);
      setLastModified(file.lastModified);
      
      // Initial Load
      await handleFileUpload(file);
    } catch (err) {
      // User likely cancelled picker, ignore
      console.log("Watch cancelled or failed", err);
    }
  };

  const handleSaveSession = async () => {
    if (!data) return;

    const session: ProjectState = {
      version: '1.0',
      timestamp: Date.now(),
      mainData: data,
      baselineData: baselineData,
      thresholds: thresholds,
      notes: '' // Could add support for saving report notes here too
    };

    const fileName = `perf-session-${data.summary.fileName.replace(/\./g, '_')}.perf`;
    const json = JSON.stringify(session);
    
    await saveProjectFile(json, fileName);
  };

  const handleLoadSession = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const session: ProjectState = JSON.parse(text);
      
      if (!session.mainData || !session.version) {
        throw new Error("Invalid session file format.");
      }

      setData(session.mainData);
      setBaselineData(session.baselineData || null);
      setThresholds(session.thresholds || { responseTime: 500, errorRate: 1.0 });
      setLoading(false);
      stopWatching();

    } catch (err: any) {
      setError("Failed to load session: " + err.message);
      setLoading(false);
    }
  };

  const handleUseSample = () => {
    // Generate both Current and Baseline for a better demo experience
    const mainSample = generateSampleData('current');
    const baselineSample = generateSampleData('baseline');
    handleFileUpload(mainSample, baselineSample);
  };

  const renderContent = () => {
    if (!data) return null;

    switch (activeView) {
      case 'dashboard':
        return (
            <DashboardView 
                data={data} 
                baselineData={baselineData}
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
        return <ReportView data={data} baselineData={baselineData} thresholds={thresholds} aiConfig={aiConfig} />;
      case 'about':
        return <AboutView />;
      default:
        return (
            <DashboardView 
                data={data} 
                baselineData={baselineData}
                onNavigate={setActiveView} 
                thresholds={thresholds} 
                onUpdateThresholds={setThresholds} 
                onSaveSession={handleSaveSession}
                isLive={!!liveFileHandle}
            />
        );
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
        <div className="absolute top-0 right-0 p-4 flex gap-2">
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
             title="Global Settings"
           >
             <Settings className="w-5 h-5 text-indigo-500" />
           </button>
           <button 
             onClick={toggleDarkMode}
             className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
             title="Toggle Dark Mode"
           >
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
        {/* Render chat if enabled, passing empty context for generic help */}
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
        fileName={data.summary.fileName}
        baselineName={baselineData?.summary.fileName}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onReset={handleReset}
        onOpenSettings={() => setIsSettingsOpen(true)}
      >
        {renderContent()}
        {isChatEnabled && <ChatWidget contextData={data} config={aiConfig} />}
      </Layout>
      
      <GlobalSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        config={aiConfig}
        onUpdateConfig={updateAiConfig}
        chatEnabled={isChatEnabled}
        onToggleChat={toggleChat}
      />
    </>
  );
}

export default App;
import { Settings } from 'lucide-react';
