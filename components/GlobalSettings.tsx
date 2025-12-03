
import React from 'react';
import { Settings, X, HardDrive, Cloud, Sparkles, MessageSquare, ToggleLeft, ToggleRight } from 'lucide-react';
import { AIConfig } from '../utils/aiAnalytics';

interface GlobalSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: AIConfig;
  onUpdateConfig: (config: AIConfig) => void;
  chatEnabled: boolean;
  onToggleChat: (enabled: boolean) => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  onUpdateConfig,
  chatEnabled,
  onToggleChat
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Global Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Feature Toggles */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              Features
            </h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">AI Chat Assistant</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Enable the floating chatbot for Q&A</div>
                  </div>
               </div>
               <button 
                onClick={() => onToggleChat(!chatEnabled)}
                className={`transition-colors ${chatEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
               >
                 {chatEnabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
               </button>
            </div>
          </section>

          {/* AI Provider Config */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              AI Provider Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button 
                  onClick={() => onUpdateConfig({ ...config, provider: 'ollama' })}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${config.provider === 'ollama' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <HardDrive className="w-6 h-6 mb-2 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-sm text-slate-800 dark:text-white">Ollama (Local)</span>
                    <span className="text-[10px] text-slate-500">Privacy Focused</span>
                </button>
                <button 
                  onClick={() => onUpdateConfig({ ...config, provider: 'gemini' })}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${config.provider === 'gemini' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <Cloud className="w-6 h-6 mb-2 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-sm text-slate-800 dark:text-white">Google Gemini</span>
                    <span className="text-[10px] text-slate-500">Cloud Performance</span>
                </button>
                <button 
                  onClick={() => onUpdateConfig({ ...config, provider: 'heuristic' })}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${config.provider === 'heuristic' ? 'border-slate-500 bg-slate-100 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <Sparkles className="w-6 h-6 mb-2 text-slate-600 dark:text-slate-400" />
                    <span className="font-bold text-sm text-slate-800 dark:text-white">No AI</span>
                    <span className="text-[10px] text-slate-500">Heuristic Only</span>
                </button>
            </div>

            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                {config.provider === 'ollama' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Ollama URL</label>
                            <input 
                              type="text" 
                              value={config.ollamaUrl || ''}
                              onChange={(e) => onUpdateConfig({ ...config, ollamaUrl: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                              placeholder="http://localhost:11434"
                            />
                            <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                              ⚠️ Ensure server is running with <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">OLLAMA_ORIGINS="*"</code>
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Model Name</label>
                            <input 
                              type="text" 
                              value={config.ollamaModel || ''}
                              onChange={(e) => onUpdateConfig({ ...config, ollamaModel: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                              placeholder="llama3"
                            />
                        </div>
                    </div>
                )}
                
                {config.provider === 'gemini' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase">Gemini API Key</label>
                            <input 
                              type="password" 
                              value={config.geminiKey || ''}
                              onChange={(e) => onUpdateConfig({ ...config, geminiKey: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                              placeholder="AIza..."
                            />
                        </div>
                    </div>
                )}

                {config.provider === 'heuristic' && (
                  <p className="text-sm text-slate-500 italic">
                    AI features (Chat, Auto-Summary) will be disabled or fall back to simple rule-based templates.
                  </p>
                )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm"
           >
             Done
           </button>
        </div>
      </div>
    </div>
  );
};
