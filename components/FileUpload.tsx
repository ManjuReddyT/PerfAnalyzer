
import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle, PlayCircle, FolderOpen, Link as LinkIcon, DownloadCloud, Plus } from 'lucide-react';
import { hasFileSystemAccessSupport } from '../utils/liveFile';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  onUrlUpload: (url: string) => void;
  onSampleData: () => void;
  onWatchLive: () => void;
  onLoadSession: (file: File) => void;
  isLoading: boolean;
  progress: number;
  error: string | null;
  isCompact?: boolean; // For "Add Report" modal or sidebar context
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  onUrlUpload,
  onSampleData, 
  onWatchLive, 
  onLoadSession, 
  isLoading, 
  progress, 
  error,
  isCompact = false
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(Array.from(e.dataTransfer.files));
    }
  }, [onFileUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(Array.from(e.target.files));
    }
  }, [onFileUpload]);

  const handleSessionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) onLoadSession(e.target.files[0]);
  }, [onLoadSession]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
        onUrlUpload(urlInput.trim());
    }
  };

  if (isLoading) {
      return (
         <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="animate-spin text-blue-600 dark:text-blue-400 mb-6">
              <Loader2 className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Processing Data...</h3>
            <div className="w-64 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2 overflow-hidden">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{Math.round(progress)}% Complete</p>
         </div>
      );
  }

  return (
    <div className={`w-full ${isCompact ? 'max-w-lg' : 'max-w-4xl'} mx-auto ${!isCompact && 'mt-10 md:mt-16'} p-4`}>
      {!isCompact && (
        <div className="text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            PerfAnalyzer
            </h1>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Multi-file performance analysis. Compare runs, inspect errors, and generate AI reports locally.
            </p>
        </div>
      )}

      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
            border-3 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ease-in-out cursor-pointer
            ${isDragging 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-slate-500'}
        `}
      >
        <div className={`mx-auto w-16 h-16 mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center ${isDragging ? 'text-blue-600' : 'text-blue-500'}`}>
            <Upload className="w-8 h-8" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Upload Report Files
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
            Drag & drop multiple <strong>.jtl, .csv, or .json</strong> files here.
        </p>

        <label className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 cursor-pointer transition-all hover:scale-105">
            <Plus className="w-5 h-5 mr-2" />
            <span>Select Files</span>
            <input type="file" className="hidden" accept=".csv,.jtl,.json" multiple onChange={handleChange} />
        </label>
      </div>

      {/* Secondary Options */}
      <div className="mt-8 flex flex-col items-center gap-6">
         {/* Or Separator */}
         <div className="flex items-center gap-4 w-full max-w-md">
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Or load from URL</span>
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
         </div>

         {/* URL Input */}
         <form onSubmit={handleUrlSubmit} className="flex w-full max-w-md gap-2">
            <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                type="url" 
                placeholder="https://example.com/results.csv" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <button 
            type="submit"
            disabled={!urlInput}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
                <DownloadCloud className="w-4 h-4" />
            </button>
         </form>

         {!isCompact && (
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
                        <AlertCircle className="w-4 h-4" />
                        Watch Live File
                    </button>
                )}

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm cursor-pointer">
                    <FolderOpen className="w-4 h-4" />
                    Load Project
                    <input type="file" accept=".perf,.json" className="hidden" onChange={handleSessionChange} />
                </label>
            </div>
         )}
      </div>

      {error && (
        <div className="max-w-md mx-auto mt-6 flex items-center p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50 animate-in fade-in">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};
