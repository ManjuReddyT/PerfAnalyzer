
import React, { useState, useEffect } from 'react';
import { ProcessedData, MetricDiff } from '../types';
import { ResponseTimeChart, ThroughputChart } from '../components/Charts';
import { Printer, FileText, User, MessageSquare, Download, Sparkles, Wand2, RefreshCw, Settings, X, HardDrive, Cloud } from 'lucide-react';
import { formatDuration, calculateComparison } from '../utils/analytics';
import { generateInsights, AnalysisTone, AIProvider, AIConfig } from '../utils/aiAnalytics';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

interface ReportViewProps {
  data: ProcessedData;
  baselineData?: ProcessedData | null;
  thresholds: { responseTime: number; errorRate: number };
}

export const ReportView: React.FC<ReportViewProps> = ({ data, baselineData, thresholds }) => {
  const [reportTitle, setReportTitle] = useState('Performance Test Report');
  const [author, setAuthor] = useState('Performance Engineer');
  const [observations, setObservations] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // AI State
  const [aiTone, setAiTone] = useState<AnalysisTone>('standard');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);

  // AI Configuration State with explicit defaults
  const [aiConfig, setAiConfig] = useState<AIConfig>({
      provider: 'ollama', 
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3',
      geminiKey: ''
  });

  // Load settings from local storage on mount, merging with defaults
  useEffect(() => {
      const savedConfig = localStorage.getItem('perfAnalyzer_aiConfig');
      if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            // Merge defaults with parsed config to ensure no fields are undefined
            setAiConfig(prev => ({
                ...prev,
                ...parsed
            }));
          } catch(e) { /* ignore */ }
      }
  }, []);

  const updateAiConfig = (updates: Partial<AIConfig>) => {
      setAiConfig(prev => {
          const newConfig = { ...prev, ...updates };
          localStorage.setItem('perfAnalyzer_aiConfig', JSON.stringify(newConfig));
          return newConfig;
      });
  };

  const { summary } = data;
  
  const comparison = baselineData ? calculateComparison(summary, baselineData.summary) : null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    setIsGeneratingPdf(true);
    
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3], // top, left, bottom, right
      filename: `Performance_Report_${summary.fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsGeneratingPdf(false);
    });
  };

  const handleGenerateAi = async () => {
      setIsAiLoading(true);
      try {
          const insight = await generateInsights(data, aiTone, aiConfig);
          setObservations(insight);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAiLoading(false);
      }
  };

  // Get Top 5 Slowest Transactions
  const topSlowest = [...data.labels]
    .sort((a, b) => b.avgElapsed - a.avgElapsed)
    .slice(0, 5);

  // Get Top 5 Errors
  const topErrors = [...data.errors]
    .slice(0, 5);
  
  const ComparisonRow = ({ label, current, baseline, diff, unit = '' }: { label: string, current: number | string, baseline: number | string, diff: MetricDiff, unit?: string }) => (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 text-slate-800 font-medium">{label}</td>
      <td className="px-4 py-3 text-right text-slate-700 font-medium bg-slate-50/50">{typeof current === 'number' ? current.toLocaleString(undefined, { maximumFractionDigits: 2 }) : current} {unit}</td>
      <td className="px-4 py-3 text-right text-slate-500">{typeof baseline === 'number' ? baseline.toLocaleString(undefined, { maximumFractionDigits: 2 }) : baseline} {unit}</td>
      <td className={`px-4 py-3 text-right font-bold ${diff.isImprovement ? 'text-green-600' : 'text-red-600'}`}>
        <span className={`inline-flex items-center px-2 py-0.5 rounded ${diff.isImprovement ? 'bg-green-50' : 'bg-red-50'}`}>
             {diff.absolute > 0 ? '+' : ''}{diff.percentage.toFixed(1)}%
        </span>
      </td>
    </tr>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* AI Assistant Panel - No Print */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6 rounded-xl shadow-sm border border-violet-100 dark:border-slate-700 no-print relative overflow-hidden transition-all duration-300 ease-in-out">
         <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
         
         {/* Settings Panel (Swaps with Main Content when active) */}
         {showAiSettings ? (
             <div className="relative z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm -m-6 p-6 rounded-xl flex flex-col animate-in fade-in slide-in-from-top-2 shadow-inner">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-500" />
                        AI Provider Settings
                     </h3>
                     <button onClick={() => setShowAiSettings(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                         <X className="w-5 h-5 text-slate-500" />
                     </button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                     <button 
                        onClick={() => updateAiConfig({ provider: 'ollama' })}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${aiConfig.provider === 'ollama' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                     >
                         <HardDrive className="w-6 h-6 mb-2 text-indigo-600 dark:text-indigo-400" />
                         <span className="font-bold text-sm text-slate-800 dark:text-white">Ollama (Local)</span>
                         <span className="text-xs text-slate-500">Privacy Focused</span>
                     </button>
                     <button 
                        onClick={() => updateAiConfig({ provider: 'gemini' })}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${aiConfig.provider === 'gemini' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                     >
                         <Cloud className="w-6 h-6 mb-2 text-blue-600 dark:text-blue-400" />
                         <span className="font-bold text-sm text-slate-800 dark:text-white">Google Gemini</span>
                         <span className="text-xs text-slate-500">High Performance</span>
                     </button>
                     <button 
                        onClick={() => updateAiConfig({ provider: 'heuristic' })}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${aiConfig.provider === 'heuristic' ? 'border-slate-500 bg-slate-100 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                     >
                         <Sparkles className="w-6 h-6 mb-2 text-slate-600 dark:text-slate-400" />
                         <span className="font-bold text-sm text-slate-800 dark:text-white">Basic Heuristic</span>
                         <span className="text-xs text-slate-500">Offline / No AI</span>
                     </button>
                 </div>

                 <div className="space-y-4 max-w-lg mx-auto w-full mb-2">
                     {aiConfig.provider === 'ollama' && (
                         <div className="space-y-3 animate-in fade-in">
                             <div>
                                 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ollama URL</label>
                                 <input 
                                    type="text" 
                                    value={aiConfig.ollamaUrl || ''}
                                    onChange={(e) => updateAiConfig({ ollamaUrl: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md text-sm dark:bg-slate-800 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                                    placeholder="http://localhost:11434"
                                 />
                                 <p className="text-[10px] text-slate-500 mt-1">Make sure to set <code>OLLAMA_ORIGINS="*"</code> in your environment.</p>
                             </div>
                             <div>
                                 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Model Name</label>
                                 <input 
                                    type="text" 
                                    value={aiConfig.ollamaModel || ''}
                                    onChange={(e) => updateAiConfig({ ollamaModel: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md text-sm dark:bg-slate-800 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                                    placeholder="llama3"
                                 />
                             </div>
                         </div>
                     )}
                     
                     {aiConfig.provider === 'gemini' && (
                         <div className="space-y-3 animate-in fade-in">
                             <div>
                                 <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                                 <input 
                                    type="password" 
                                    value={aiConfig.geminiKey || ''}
                                    onChange={(e) => updateAiConfig({ geminiKey: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md text-sm dark:bg-slate-800 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                                    placeholder="Enter your Gemini API Key"
                                 />
                             </div>
                         </div>
                     )}
                 </div>

                 <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                     <button 
                        onClick={() => setShowAiSettings(false)}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                     >
                         Save & Close
                     </button>
                 </div>
             </div>
         ) : (
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-in fade-in">
                <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    AI Report Assistant
                    <span className="text-xs font-normal text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 ml-2 uppercase">
                        {aiConfig.provider === 'ollama' ? `Local: ${aiConfig.ollamaModel || 'Default'}` : aiConfig.provider === 'gemini' ? 'Google Gemini' : 'Offline Mode'}
                    </span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-lg">
                    Use the Hybrid AI engine to analyze your test data and automatically generate an executive summary.
                </p>
                </div>
                
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button 
                        onClick={() => setShowAiSettings(true)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Configure AI Provider"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

                    <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-slate-400 px-1">Report Tone</label>
                    <select 
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value as AnalysisTone)}
                        className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                        <option value="standard">Standard Report</option>
                        <option value="executive">Executive Summary</option>
                        <option value="critical">Critical Analysis</option>
                    </select>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button 
                    onClick={handleGenerateAi}
                    disabled={isAiLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-70"
                    >
                    {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {isAiLoading ? 'Analyzing...' : 'Generate'}
                    </button>
                </div>
            </div>
         )}
      </div>

      {/* Configuration Panel - Hidden on Print */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Report Configuration
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Customize report details before exporting.</p>
          </div>
          <div className="flex gap-3">
             <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Report Title</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Author Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full pl-9 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observations & Recommendations</label>
          <div className="relative">
             <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Type your findings manually or use the AI Assistant above to generate a draft..."
              rows={8}
              className="w-full pl-9 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Actual Report Content */}
      <div id="report-content" className="bg-white p-6 md:p-12 shadow-lg print-shadow-none mx-auto print:p-0 dark:bg-white dark:text-slate-900">
        {/* Report Header */}
        <div className="border-b-2 border-slate-800 pb-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
             <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{reportTitle}</h1>
                <p className="text-slate-500 mt-2 flex items-center gap-2 text-sm md:text-base">
                Generated by <span className="font-semibold text-slate-700">{author}</span> on {new Date().toLocaleDateString()}
                </p>
            </div>
            <div className="text-left sm:text-right">
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">File Name</div>
                <div className="text-lg font-medium text-slate-800 truncate max-w-[200px] md:max-w-xs">{summary.fileName}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
              <div>
                  <span className="text-slate-500 font-medium">Test Start:</span>
                  <span className="ml-2 text-slate-800">{new Date(summary.startTime).toLocaleString()}</span>
              </div>
              <div className="sm:text-right">
                  <span className="text-slate-500 font-medium">Test End:</span>
                  <span className="ml-2 text-slate-800">{new Date(summary.endTime).toLocaleString()}</span>
              </div>
          </div>
        </div>

        {/* Observations */}
        {observations && (
          <div className="mb-8 bg-slate-50 p-6 rounded-lg border border-slate-200 break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Executive Summary</h3>
            <div className="text-slate-800 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                {/* Simple Markdown Rendering for AI Output */}
                {observations.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-4 mb-2">{line.replace('## ', '')}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-3 mb-1">{line.replace('### ', '')}</h3>;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>;
                    return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
                })}
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="mb-8 break-inside-avoid">
          <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Test Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-slate-500">Duration</div>
              <div className="text-xl md:text-2xl font-bold text-slate-900">{formatDuration(summary.duration)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Total Requests</div>
              <div className="text-xl md:text-2xl font-bold text-slate-900">{summary.totalRequests.toLocaleString()}</div>
            </div>
             <div>
              <div className="text-sm text-slate-500">Avg Response Time</div>
              <div className="text-xl md:text-2xl font-bold text-slate-900">{summary.avgResponseTime.toFixed(0)} ms</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Error Rate</div>
              <div className={`text-xl md:text-2xl font-bold ${summary.errorRate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.errorRate.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-4 border-t border-slate-100">
             <div>
              <div className="text-sm text-slate-500">Throughput</div>
              <div className="text-lg md:text-xl font-semibold text-slate-800">{summary.throughput.toFixed(1)} req/s</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">90th Percentile</div>
              <div className="text-lg md:text-xl font-semibold text-slate-800">{summary.p90.toFixed(0)} ms</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">95th Percentile</div>
              <div className="text-lg md:text-xl font-semibold text-slate-800">{summary.p95.toFixed(0)} ms</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">99th Percentile</div>
              <div className="text-lg md:text-xl font-semibold text-slate-800">{summary.p99.toFixed(0)} ms</div>
            </div>
          </div>
        </div>
        
        {/* Baseline Comparison Section (Conditional) */}
        {comparison && baselineData && (
          <div className="mb-8 break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                Baseline Comparison
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Vs. {baselineData.summary.fileName}</span>
            </h3>
            <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase">Metric</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-500 uppercase">Current</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-500 uppercase">Baseline</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-500 uppercase">Diff</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                     <ComparisonRow label="Avg Response Time" current={summary.avgResponseTime} baseline={baselineData.summary.avgResponseTime} diff={comparison.avgResponseTime} unit="ms" />
                     <ComparisonRow label="90th Percentile" current={summary.p90} baseline={baselineData.summary.p90} diff={comparison.p90} unit="ms" />
                     <ComparisonRow label="95th Percentile" current={summary.p95} baseline={baselineData.summary.p95} diff={comparison.p95} unit="ms" />
                     <ComparisonRow label="99th Percentile" current={summary.p99} baseline={baselineData.summary.p99} diff={comparison.p99} unit="ms" />
                     <ComparisonRow label="Throughput" current={summary.throughput} baseline={baselineData.summary.throughput} diff={comparison.throughput} unit="req/s" />
                     <ComparisonRow label="Error Rate" current={summary.errorRate} baseline={baselineData.summary.errorRate} diff={comparison.errorRate} unit="%" />
                     <ComparisonRow label="Total Requests" current={summary.totalRequests} baseline={baselineData.summary.totalRequests} diff={comparison.totalRequests} />
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-8 mb-8 print-grid-1">
           <div className="break-inside-avoid">
             <h3 className="text-lg font-bold text-slate-800 mb-4">Response Time Over Time</h3>
             <div className="border border-slate-200 rounded-lg p-4 bg-white">
                <ResponseTimeChart data={data.timeSeries} threshold={thresholds.responseTime} />
             </div>
           </div>
           
           <div className="break-inside-avoid">
             <h3 className="text-lg font-bold text-slate-800 mb-4">Throughput Over Time</h3>
             <div className="border border-slate-200 rounded-lg p-4 bg-white">
                <ThroughputChart data={data.timeSeries} />
             </div>
           </div>
        </div>

        {/* Top Errors Table */}
        <div className="mb-8 break-inside-avoid">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Errors</h3>
          {topErrors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 border border-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase">Error Message</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500 uppercase">Count</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {topErrors.map((err, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-slate-800 truncate max-w-xs md:max-w-lg" title={err.message}>{err.message}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{err.count}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{err.percentage.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100">
              No errors recorded in this test run.
            </div>
          )}
        </div>

        {/* Slowest Transactions Table */}
        <div className="break-inside-avoid mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Slowest Transactions (Avg)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 border border-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase">Label</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500 uppercase">Avg (ms)</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500 uppercase">Max (ms)</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500 uppercase">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {topSlowest.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-slate-800 font-medium">{row.label}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.avgElapsed.toFixed(0)}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.maxElapsed}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>

        {/* Full Transaction Summary */}
        <div className="break-inside-avoid mt-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Full Transaction Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 border border-slate-200 text-xs md:text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">Label</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">Samples</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">Avg</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">Median</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">P90</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">P99</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">Err %</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">Thru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.labels.sort((a,b) => a.label.localeCompare(b.label)).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-800 font-medium break-all">{row.label}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.count.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.avgElapsed.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.p50.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.p90.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.p99.toFixed(0)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${row.errorRate > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        {row.errorRate.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.throughput.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>

      </div>
    </div>
  );
};
