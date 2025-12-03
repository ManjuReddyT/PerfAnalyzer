
import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle, PlayCircle, CheckCircle, Trash2, Eye, FolderOpen, Bug, Link as LinkIcon, DownloadCloud } from 'lucide-react';
import { hasFileSystemAccessSupport } from '../utils/liveFile';

interface FileUploadProps {
  onFileUpload: (mainFile: File, baselineFile?: File, errorFile?: File) => void;
  onUrlUpload: (url: string) => void;
  onSampleData: () => void;
  onWatchLive: () => void;
  onLoadSession: (file: File) => void;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  onUrlUpload,
  onSampleData, 
  onWatchLive, 
  onLoadSession, 
  isLoading, 
  progress, 
  error 
}) => {
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [baselineFile, setBaselineFile] = useState<File | null>(null);
  const [errorFile, setErrorFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [isDraggingBase, setIsDraggingBase] = useState(false);
  const [isDraggingError, setIsDraggingError] = useState(false);
  const [isDraggingSession, setIsDraggingSession] = useState(false);

  // --- Handlers for Main File ---
  const handleDragOverMain = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingMain(true); }, []);
  const handleDragLeaveMain = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingMain(false); }, []);
  const handleDropMain = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMain(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setMainFile(e.dataTransfer.files[0]);
  }, []);
  const handleChangeMain = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setMainFile(e.target.files[0]);
  }, []);

  // --- Handlers for Baseline File ---
  const handleDragOverBase = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingBase(true); }, []);
  const handleDragLeaveBase = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingBase(false); }, []);
  const handleDropBase = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBase(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setBaselineFile(e.dataTransfer.files[0]);
  }, []);
  const handleChangeBase = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setBaselineFile(e.target.files[0]);
  }, []);

    // --- Handlers for Error File ---
  const handleDragOverError = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingError(true); }, []);
  const handleDragLeaveError = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingError(false); }, []);
  const handleDropError = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingError(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setErrorFile(e.dataTransfer.files[0]);
  }, []);
  const handleChangeError = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setErrorFile(e.target.files[0]);
  }, []);

  // --- Handlers for Session File ---
  const handleDragOverSession = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingSession(true); }, []);
  const handleDragLeaveSession = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingSession(false); }, []);
  const handleDropSession = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSession(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) onLoadSession(e.dataTransfer.files[0]);
  }, [onLoadSession]);
  const handleChangeSession = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) onLoadSession(e.target.files[0]);
  }, [onLoadSession]);

  const handleProcess = () => {
    if (mainFile) {
      onFileUpload(mainFile, baselineFile || undefined, errorFile || undefined);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
        onUrlUpload(urlInput.trim());
    }
  };

  const UploadZone = ({ 
    file, 
    onRemove, 
    isDragging, 
    dragOver, 
    dragLeave, 
    drop, 
    change, 
    label, 
    subLabel,
    icon: Icon,
    colorClass = "blue"
  }: any) => (
    <div className="flex-1 min-w-[280px]">
        {file ? (
             <div className="h-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mb-3">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <p className="font-semibold text-slate-800 dark:text-white truncate max-w-full px-4 mb-1">{file.name}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={onRemove}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" /> Remove
                </button>
             </div>
        ) : (
            <div
                onDragOver={dragOver}
                onDragLeave={dragLeave}
                onDrop={drop}
                className={`
                h-full relative border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center min-h-[260px]
                ${isDragging 
                    ? `border-${colorClass}-500 bg-${colorClass}-50 dark:bg-${colorClass}-900/20 scale-[1.02]` 
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'}
                `}
            >
                <div className={`p-3 rounded-full bg-slate-100 dark:bg-slate-700 mb-4 ${isDragging ? `text-${colorClass}-600` : 'text-slate-500'}`}>
                    <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{subLabel}</p>
                
                <label className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-${colorClass}-600 hover:bg-${colorClass}-700 rounded-lg shadow-sm cursor-pointer transition-colors`}>
                    <span>Select File</span>
                    <input type="file" className="hidden" accept=".csv,.jtl,.json" onChange={change} />
                </label>
            </div>
        )}
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto mt-10 md:mt-16 p-4 md:p-8 pb-20">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
          Performance Results Analyzer
        </h1>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload your JMeter JTL/CSV files for instant local analysis. 
          <br className="hidden sm:block"/>
          Secure, Offline-Ready, and Comparison-Capable.
        </p>
      </div>

      {isLoading ? (
         <div className="max-w-md mx-auto text-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="animate-spin text-blue-600 dark:text-blue-400 mb-6 mx-auto w-fit">
              <Loader2 className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Processing Data...
            </h3>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 relative" 
                style={{ width: `${progress}%` }}
              >
                 <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{Math.round(progress)}% Complete</p>
         </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Main File Zone */}
                <UploadZone 
                    file={mainFile}
                    onRemove={() => setMainFile(null)}
                    isDragging={isDraggingMain}
                    dragOver={handleDragOverMain}
                    dragLeave={handleDragLeaveMain}
                    drop={handleDropMain}
                    change={handleChangeMain}
                    label="Current Test Run"
                    subLabel="Required (JTL, CSV, JSON)"
                    icon={Upload}
                    colorClass="blue"
                />

                {/* Baseline File Zone */}
                <UploadZone 
                    file={baselineFile}
                    onRemove={() => setBaselineFile(null)}
                    isDragging={isDraggingBase}
                    dragOver={handleDragOverBase}
                    dragLeave={handleDragLeaveBase}
                    drop={handleDropBase}
                    change={handleChangeBase}
                    label="Baseline Comparison"
                    subLabel="Optional (Previous Run)"
                    icon={FileText}
                    colorClass="indigo"
                />

                 {/* Error File Zone */}
                 <UploadZone 
                    file={errorFile}
                    onRemove={() => setErrorFile(null)}
                    isDragging={isDraggingError}
                    dragOver={handleDragOverError}
                    dragLeave={handleDragLeaveError}
                    drop={handleDropError}
                    change={handleChangeError}
                    label="Detailed Error Log"
                    subLabel="Optional (Response Body/Headers)"
                    icon={Bug}
                    colorClass="red"
                />
            </div>

            {/* Action Area */}
            <div className="flex flex-col items-center gap-6">
               <button
                  onClick={handleProcess}
                  disabled={!mainFile}
                  className={`
                    px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform
                    ${mainFile 
                        ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white shadow-blue-500/30' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}
                  `}
               >
                  Analyze Results
               </button>
               
               {/* Or Separator */}
               <div className="flex items-center gap-4 w-full max-w-md">
                   <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                   <span className="text-xs text-slate-400 uppercase font-semibold">Or</span>
                   <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
               </div>

               {/* URL Input */}
               <form onSubmit={handleUrlSubmit} className="flex w-full max-w-md gap-2">
                  <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="url" 
                        placeholder="Enter public URL to JTL/CSV..." 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                  </div>
                  <button 
                    type="submit"
                    disabled={!urlInput}
                    className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                     <DownloadCloud className="w-4 h-4 inline mr-2" />
                     Load URL
                  </button>
               </form>

               <div className="flex flex-wrap justify-center gap-4 text-sm mt-2">
                   <button 
                    onClick={onSampleData}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                   >
                    <PlayCircle className="w-4 h-4" />
                    Load Sample Data
                   </button>
                   
                   {hasFileSystemAccessSupport() && (
                       <button 
                        onClick={onWatchLive}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                       >
                        <Eye className="w-4 h-4" />
                        Watch Live File
                       </button>
                   )}

                   <div className="relative">
                        <input
                            type="file"
                            accept=".perf,.json"
                            onChange={handleChangeSession}
                            className="hidden"
                            id="session-upload"
                        />
                        <label 
                            htmlFor="session-upload"
                            onDragOver={handleDragOverSession}
                            onDragLeave={handleDragLeaveSession}
                            onDrop={handleDropSession}
                            className={`inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border rounded-lg cursor-pointer transition-colors shadow-sm
                            ${isDraggingSession 
                                ? 'border-blue-500 text-blue-500' 
                                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-300'
                            }`}
                        >
                            <FolderOpen className="w-4 h-4" />
                            Load Session (.perf)
                        </label>
                   </div>
               </div>
            </div>
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto mt-8 flex items-center p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50 animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};
