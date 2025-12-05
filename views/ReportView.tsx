
import React, { useState } from 'react';
import { ProcessedData, MetricDiff } from '../types';
import { ResponseTimeChart, ThroughputChart } from '../components/Charts';
import { Printer, FileText, User, MessageSquare, Download, Sparkles, Wand2, RefreshCw, HardDrive, Cloud } from 'lucide-react';
import { formatDuration, calculateComparison } from '../utils/analytics';
import { generateInsights, AnalysisTone, AIConfig } from '../utils/aiAnalytics';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

interface ReportViewProps {
  data: ProcessedData;
  baselineData?: ProcessedData | null;
  thresholds: { responseTime: number; errorRate: number };
  aiConfig: AIConfig;
}

export const ReportView: React.FC<ReportViewProps> = ({ data, baselineData, thresholds, aiConfig }) => {
  const [reportTitle, setReportTitle] = useState('Performance Test Report');
  const [author, setAuthor] = useState('Performance Engineer');
  const [observations, setObservations] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // AI State
  const [aiTone, setAiTone] = useState<AnalysisTone>('standard');
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  // Improved Markdown Renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const flushTable = (keyIdx: number) => {
        if (tableBuffer.length === 0) return;
        
        try {
            // Parse table rows: Split by pipe, trim whitespace
            // Filter handles lines that start/end with pipe e.g. | col | col |
            const rows = tableBuffer.map(row => 
                row.split('|')
                .map(cell => cell.trim())
                .filter((cell, i, arr) => {
                    // Filter out empty strings that result from splitting leading/trailing pipes
                    // Standard markdown table lines usually start and end with |
                    if (i === 0 && cell === '') return false;
                    if (i === arr.length - 1 && cell === '') return false;
                    return true;
                })
            );

            // Filter out separator lines (e.g., ---, :---)
            const validRows = rows.filter(row => !row.every(cell => /^[\s\-:]+$/.test(cell)));

            if (validRows.length > 0) {
                const headers = validRows[0];
                const body = validRows.slice(1);

                elements.push(
                    <div key={`tbl-${keyIdx}`} className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    {headers.map((h, i) => (
                                        <th key={i} className="px-4 py-2 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider border-r border-slate-200 last:border-0 bg-slate-50">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {body.map((row, rI) => (
                                    <tr key={rI} className="hover:bg-slate-50/50">
                                        {row.map((cell, cI) => (
                                            <td key={cI} className="px-4 py-2 text-slate-700 border-r border-slate-200 last:border-0">
                                                <span dangerouslySetInnerHTML={{ __html: processInline(cell) }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
        } catch (e) {
            // Fallback if table parse fails
            elements.push(<pre key={`pre-${keyIdx}`} className="text-xs bg-slate-50 p-2 rounded overflow-x-auto">{tableBuffer.join('\n')}</pre>);
        }
        
        tableBuffer = [];
        inTable = false;
    };

    const processInline = (str: string) => {
        return str
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
            .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-pink-600 font-mono text-xs">$1</code>');
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Table Detection (Simple pipe check)
        if (line.startsWith('|') && line.endsWith('|')) {
            inTable = true;
            tableBuffer.push(line);
            continue;
        } else if (inTable) {
            flushTable(i);
        }

        if (!line) {
             elements.push(<div key={`br-${i}`} className="h-2" />);
             continue;
        }

        // Headers
        if (line.startsWith('## ')) {
             elements.push(<h2 key={`h2-${i}`} className="text-xl font-bold mt-6 mb-3 text-slate-900 border-b border-slate-100 pb-2">{line.replace('## ', '')}</h2>);
             continue;
        }
        if (line.startsWith('### ')) {
             elements.push(<h3 key={`h3-${i}`} className="text-lg font-bold mt-4 mb-2 text-slate-800">{line.replace('### ', '')}</h3>);
             continue;
        }

        // Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
            const content = line.substring(2);
            elements.push(
                <li key={`li-${i}`} className="ml-5 list-disc mb-1 text-slate-700 pl-1" dangerouslySetInnerHTML={{ __html: processInline(content) }} />
            );
            continue;
        }

        // Paragraphs
        elements.push(<p key={`p-${i}`} className="mb-2 text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: processInline(line) }} />);
    }
    
    // Flush remaining table buffer if exists
    if (inTable) flushTable(lines.length);

    return elements;
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
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-in fade-in">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  AI Report Assistant
                  <span className="text-xs font-normal text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 ml-2 uppercase flex items-center gap-1">
                      {aiConfig.provider === 'ollama' && <HardDrive className="w-3 h-3" />}
                      {aiConfig.provider === 'gemini' && <Cloud className="w-3 h-3" />}
                      {aiConfig.provider === 'ollama' ? `Local: ${aiConfig.ollamaModel || 'Default'}` : aiConfig.provider === 'gemini' ? 'Google Gemini' : 'Offline Mode'}
                  </span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-lg">
                  Use the Hybrid AI engine to analyze your test data and automatically generate an executive summary.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
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
                {/* Improved Markdown Rendering */}
                {renderMarkdown(observations)}
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
