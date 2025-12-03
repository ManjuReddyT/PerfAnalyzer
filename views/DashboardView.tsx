
import React, { useState, useMemo, useCallback } from 'react';
import { ProcessedData, MetricDiff, JmeterRow } from '../types';
import { 
  ResponseTimeTrendChart, 
  ThroughputChart, 
  HistogramChart, 
  ResponseTimeChart, 
  LatencyCompositionChart, 
  ErrorRateChart, 
  ErrorTrendChart, 
  PieDistributionChart,
  TransactionTimeChart,
  TimelineBrushChart,
  DeltaBarChart
} from '../components/Charts';
import { MultiSelectDropdown } from '../components/Inputs';
import { 
  Activity, Clock, AlertTriangle, TrendingUp, Download, Printer, 
  ArrowRight, Settings, ChevronDown, ChevronUp, Filter, BarChart, 
  AlertCircle, Layers, List, ArrowDown, ArrowUp, Save, Sliders, RotateCcw,
  Bug, Search, X, Code, FileText, MousePointerClick
} from 'lucide-react';
import { formatDuration, analyzeRows, calculateComparison } from '../utils/analytics';
import { TransactionsView } from './TransactionsView';

interface DashboardViewProps {
  data: ProcessedData;
  baselineData?: ProcessedData | null;
  onNavigate?: (view: string) => void;
  thresholds: { responseTime: number; errorRate: number };
  onUpdateThresholds: (t: { responseTime: number; errorRate: number }) => void;
  onSaveSession: () => void;
  isLive?: boolean;
}

const ComparisonBadge = ({ diff, unit = '' }: { diff: MetricDiff, unit?: string }) => {
    if (!diff) return null;
    const isZero = Math.abs(diff.absolute) < 0.01;
    if (isZero) return <span className="text-xs text-slate-400 font-medium ml-2">- No Change</span>;

    const colorClass = diff.isImprovement ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    const Icon = diff.absolute > 0 ? ArrowUp : ArrowDown;

    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold ml-2 ${colorClass}`}>
            <Icon className="w-3 h-3" />
            <span>{Math.abs(diff.percentage).toFixed(1)}%</span>
            <span className="hidden xl:inline opacity-70">({diff.absolute > 0 ? '+' : ''}{diff.absolute.toFixed(1)}{unit})</span>
        </div>
    );
};

const SummaryCard = ({ title, value, subtext, icon: Icon, color, diff, unit }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="flex justify-between items-start mb-2">
         <div className={`p-2.5 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
            <Icon className="w-5 h-5" />
         </div>
         {diff && <ComparisonBadge diff={diff} unit={unit} />}
    </div>
    
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>}
    </div>
  </div>
);

const PercentileCard = ({ label, value, gradient, diff }: { label: string, value: number, gradient: string, diff?: MetricDiff }) => (
  <div className={`relative overflow-hidden rounded-xl shadow-sm p-5 flex flex-col justify-center items-center transition-transform hover:-translate-y-1 ${gradient}`}>
    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>
    <div className="relative z-10 w-full flex justify-between items-start">
        <p className="text-xs font-bold text-white/90 uppercase tracking-wider mb-2">{label}</p>
        {diff && (
             <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${diff.isImprovement ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'}`}>
                {diff.absolute > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                {Math.abs(diff.percentage).toFixed(0)}%
             </div>
        )}
    </div>
    <div className="flex items-baseline relative z-10 mt-1">
      <p className="text-3xl font-extrabold text-white tracking-tight">
        {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
      <span className="text-sm text-white/70 font-medium ml-1">ms</span>
    </div>
  </div>
);

const TabButton = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`
      flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
      ${active 
        ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
      }
    `}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const ErrorInspector = ({ failures }: { failures: JmeterRow[] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedError, setSelectedError] = useState<JmeterRow | null>(null);

    const filteredFailures = useMemo(() => {
        if (!searchTerm) return failures;
        const lowerSearch = searchTerm.toLowerCase();
        return failures.filter(f => 
            (f.label && f.label.toLowerCase().includes(lowerSearch)) ||
            (f.responseMessage && f.responseMessage.toLowerCase().includes(lowerSearch)) ||
            (f.responseCode && String(f.responseCode).includes(lowerSearch))
        );
    }, [failures, searchTerm]);

    const displayFailures = filteredFailures.slice(0, 100);

    return (
        <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
             {/* Header */}
             <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <Bug className="w-5 h-5 text-red-500" />
                     Deep Dive Error Inspector
                 </h3>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search errors..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-64"
                    />
                 </div>
             </div>
             
             <div className="flex flex-1 overflow-hidden">
                 {/* List Panel */}
                 <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-900">
                     {displayFailures.map((fail, idx) => (
                         <div 
                            key={idx}
                            onClick={() => setSelectedError(fail)}
                            className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 group ${selectedError === fail ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 pl-3' : 'border-l-4 border-l-transparent pl-3'}`}
                         >
                             <div className="flex justify-between mb-1">
                                 <span className={`font-bold text-xs ${selectedError === fail ? 'text-blue-700 dark:text-blue-300' : 'text-red-600 dark:text-red-400'}`}>{fail.responseCode}</span>
                                 <span className="text-xs text-slate-400 font-mono">{(fail.timeStamp % 100000).toString()}</span>
                             </div>
                             <div className={`text-sm font-medium truncate mb-1 ${selectedError === fail ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{fail.label}</div>
                             <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{fail.responseMessage || fail.failureMessage}</div>
                         </div>
                     ))}
                     {filteredFailures.length === 0 && (
                         <div className="p-8 text-center text-slate-500 text-sm">No matching errors found.</div>
                     )}
                 </div>

                 {/* Detail View Panel */}
                 <div className="w-2/3 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 flex flex-col">
                     {selectedError ? (
                         <div className="space-y-6 animate-in fade-in duration-300">
                             <div>
                                 <div className="flex items-start justify-between">
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 break-all">{selectedError.label}</h4>
                                    <span className="text-xs font-mono text-slate-400">Timestamp: {selectedError.timeStamp}</span>
                                 </div>
                                 <div className="flex gap-2">
                                     <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-bold border border-red-200 dark:border-red-900/50">{selectedError.responseCode}</span>
                                     <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-mono border border-slate-300 dark:border-slate-700">{selectedError.responseMessage}</span>
                                 </div>
                             </div>

                             {/* Headers */}
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
                                     <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase">
                                         <Code className="w-3 h-3" /> Request Headers
                                     </div>
                                     <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                         {selectedError.requestHeaders || "Not Available"}
                                     </pre>
                                 </div>
                                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
                                     <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase">
                                         <Code className="w-3 h-3" /> Response Headers
                                     </div>
                                     <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                         {selectedError.responseHeaders || "Not Available"}
                                     </pre>
                                 </div>
                             </div>

                             {/* Bodies */}
                             <div className="space-y-4">
                                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
                                     <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase">
                                         <FileText className="w-3 h-3" /> Request Body
                                     </div>
                                     <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-100 dark:border-slate-800">
                                         {selectedError.requestBody || "Not Available"}
                                     </pre>
                                 </div>
                                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
                                     <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase">
                                         <FileText className="w-3 h-3" /> Response Body
                                     </div>
                                     <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-100 dark:border-slate-800 min-h-[100px]">
                                         {selectedError.responseBody || "Not Available"}
                                     </pre>
                                 </div>
                             </div>

                         </div>
                     ) : (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400">
                             <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <MousePointerClick className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                             </div>
                             <h4 className="text-lg font-semibold text-slate-600 dark:text-slate-300">No Error Selected</h4>
                             <p className="text-sm text-slate-400 max-w-xs text-center mt-2">
                                Click on an error item from the list on the left to inspect detailed headers and body content.
                             </p>
                         </div>
                     )}
                 </div>
             </div>
        </div>
    );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  data, 
  baselineData, 
  onNavigate, 
  thresholds, 
  onUpdateThresholds, 
  onSaveSession,
  isLive 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]); // Empty = All
  const [selectedResponseCodes, setSelectedResponseCodes] = useState<string[]>([]); // Empty = All
  const [showThresholds, setShowThresholds] = useState(false);
  
  // Timeline Filter State
  const [timelineRange, setTimelineRange] = useState<{start: number, end: number} | null>(null);
  const [timelineKey, setTimelineKey] = useState(0); // Key to force re-render/reset of brush

  // Extract unique options
  const uniqueLabels = useMemo(() => {
    const labels = new Set(data.rawRows.map(r => r.label));
    return Array.from(labels).sort();
  }, [data.rawRows]);

  const uniqueResponseCodes = useMemo(() => {
    const codes = new Set(data.rawRows.map(r => String(r.responseCode)));
    return Array.from(codes).sort();
  }, [data.rawRows]);

  // Handle Timeline Brush Changes
  const handleTimelineChange = useCallback((range: {startIndex?: number, endIndex?: number}) => {
     if (range.startIndex !== undefined && range.endIndex !== undefined && data.timeSeries.length > 0) {
        // Map chart indices to actual timestamps
        const startPoint = data.timeSeries[range.startIndex];
        const endPoint = data.timeSeries[range.endIndex];
        if (startPoint && endPoint) {
            // Convert chart seconds back to original timestamps approx
            // Or better, use the row data if available or rely on the time value
            // Since timeSeries.time is relative seconds, and we have summary.startTime
            const absStartTime = data.summary.startTime + (startPoint.time * 1000);
            const absEndTime = data.summary.startTime + (endPoint.time * 1000);
            
            // Add a small buffer to ensure we catch the bucket
            setTimelineRange({ start: absStartTime - 100, end: absEndTime + 1000 });
        }
     }
  }, [data.timeSeries, data.summary.startTime]);

  const handleResetTimeline = () => {
    setTimelineRange(null);
    setTimelineKey(prev => prev + 1); // Increment key to force Chart component to re-mount and reset Brush
  };

  // Memoize the filtered data
  const displayData = useMemo(() => {
    const isAllTransactions = selectedTransactions.length === 0 || selectedTransactions.length === uniqueLabels.length;
    const isAllCodes = selectedResponseCodes.length === 0 || selectedResponseCodes.length === uniqueResponseCodes.length;
    const isAllTime = timelineRange === null;

    if (isAllTransactions && isAllCodes && isAllTime) return data;
    
    // Filter raw rows
    const filteredRows = data.rawRows.filter(r => {
      const labelMatch = isAllTransactions || selectedTransactions.includes(r.label);
      const codeMatch = isAllCodes || selectedResponseCodes.includes(String(r.responseCode));
      // Timeline filter
      const timeMatch = isAllTime || (r.timeStamp >= timelineRange.start && r.timeStamp <= timelineRange.end);
      
      return labelMatch && codeMatch && timeMatch;
    });

    if (filteredRows.length === 0) {
      // Return empty structure if everything filtered out
      return { ...data, summary: { ...data.summary, totalRequests: 0 }, timeSeries: [], labels: [], errors: [], rawRows: [] };
    }

    // Re-run analysis on filtered subset
    return analyzeRows(filteredRows, data.summary.fileName);
  }, [data, selectedTransactions, selectedResponseCodes, timelineRange, uniqueLabels, uniqueResponseCodes]);

  // Calculate comparison if baseline exists
  const comparison = useMemo(() => {
    if (!baselineData) return null;
    return calculateComparison(displayData.summary, baselineData.summary);
  }, [displayData.summary, baselineData]);

  // Comparison Analysis - Top Regressions / Improvements
  const regressionAnalysis = useMemo(() => {
    if (!baselineData || !comparison) return null;
    
    const baselineMap = new Map(baselineData.labels.map(l => [l.label, l]));
    const deltas = displayData.labels.map(curr => {
        const base = baselineMap.get(curr.label);
        if(!base) return null;
        return {
            name: curr.label,
            delta: curr.avgElapsed - base.avgElapsed,
            current: curr.avgElapsed,
            baseline: base.avgElapsed
        };
    }).filter(d => d !== null);

    // Top 5 Degradations (Positive Delta)
    const regressions = [...deltas]
        .filter(d => d!.delta > 10) // Filter out noise
        .sort((a,b) => b!.delta - a!.delta)
        .slice(0, 5);

     // Top 5 Improvements (Negative Delta)
    const improvements = [...deltas]
        .filter(d => d!.delta < -10)
        .sort((a,b) => a!.delta - b!.delta)
        .slice(0, 5);

    return { regressions, improvements };

  }, [displayData.labels, baselineData]);

  const { summary } = displayData;

  const handleExportJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(displayData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `perf-report-${summary.fileName}-filtered.json`;
    link.click();
  };

  // Format Timestamps
  const startDateStr = new Date(summary.startTime).toLocaleString();
  const endDateStr = new Date(summary.endTime).toLocaleString();

  return (
    <div className="space-y-4 pb-12">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
         <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Dashboard
                {isLive && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    LIVE
                </span>
                )}
                 {baselineData && (
                    <span className="flex items-center gap-2 text-sm font-normal text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md border border-blue-200 dark:border-blue-900">
                        <ArrowRight className="w-4 h-4" />
                        VS Baseline
                    </span>
                )}
            </h2>
         </div>

         <div className="flex flex-wrap gap-2">
            <button 
              onClick={onSaveSession}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
               <Save className="w-4 h-4" />
               Save Project
            </button>
            <button 
              onClick={handleExportJson}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
               <Download className="w-4 h-4" />
               JSON
            </button>
            <button 
              onClick={() => onNavigate && onNavigate('report')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
               <Printer className="w-4 h-4" />
               Report
            </button>
         </div>
      </div>

      {/* Global Timeline Filter - Prominent Top Location */}
      {data.timeSeries.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-4 pb-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
             <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Timeline Selection
                 </h3>
                 {timelineRange && (
                    <button 
                      onClick={handleResetTimeline}
                      className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-blue-400 rounded transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset Range
                    </button>
                 )}
             </div>
             
             <TimelineBrushChart key={timelineKey} data={data.timeSeries} onChange={handleTimelineChange} />
             
             {/* Time Info Badges - Moved inside Timeline Container */}
             <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400 uppercase">Start:</span>
                    <span className="text-slate-700 dark:text-slate-300">{startDateStr}</span>
                </div>
                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <Clock className="w-3 h-3 text-blue-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatDuration(summary.duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400 uppercase">End:</span>
                    <span className="text-slate-700 dark:text-slate-300">{endDateStr}</span>
                </div>
             </div>
          </div>
      )}

      {/* Control Bar: Compact Filter Toolbar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 sm:gap-4 transition-all">
         <div className="px-2 text-sm font-semibold text-slate-500 flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
         </div>
         <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
         
         <div className="flex-1 flex flex-wrap items-center gap-2">
            {/* Transaction Filter */}
            <MultiSelectDropdown 
                label="Transaction" 
                icon={Filter}
                options={uniqueLabels}
                selected={selectedTransactions}
                onChange={setSelectedTransactions}
            />
            
            {/* Response Code Filter */}
            <MultiSelectDropdown 
                label="Code" 
                icon={AlertCircle}
                options={uniqueResponseCodes}
                selected={selectedResponseCodes}
                onChange={setSelectedResponseCodes}
            />
         </div>

         <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

         <button 
            onClick={() => setShowThresholds(!showThresholds)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${showThresholds ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
         >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Thresholds</span>
            {showThresholds ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
         </button>
      </div>
      
      {/* Threshold Config Panel (Collapsible) */}
      {showThresholds && (
           <div className="px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Response Time Threshold (ms)</label>
                <input 
                  type="number" 
                  value={thresholds.responseTime}
                  onChange={(e) => onUpdateThresholds({...thresholds, responseTime: Number(e.target.value)})}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Error Rate Threshold (%)</label>
                <input 
                  type="number" 
                  value={thresholds.errorRate}
                  onChange={(e) => onUpdateThresholds({...thresholds, errorRate: Number(e.target.value)})}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
           </div>
      )}

      {/* Tabs Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto no-scrollbar">
        <TabButton id="overview" label="Overview" icon={Activity} active={activeTab === 'overview'} onClick={setActiveTab} />
        <TabButton id="charts" label="Detailed Charts" icon={BarChart} active={activeTab === 'charts'} onClick={setActiveTab} />
        <TabButton id="time" label="Transaction Time" icon={Clock} active={activeTab === 'time'} onClick={setActiveTab} />
        <TabButton id="errors" label="Errors & Status" icon={AlertCircle} active={activeTab === 'errors'} onClick={setActiveTab} />
        <TabButton id="latency" label="Latency Breakdown" icon={Layers} active={activeTab === 'latency'} onClick={setActiveTab} />
        <TabButton id="transactions" label="Transactions Table" icon={List} active={activeTab === 'transactions'} onClick={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* === OVERVIEW TAB === */}
        {activeTab === 'overview' && (
          <div className="space-y-6 pt-4">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Total Requests"
                value={summary.totalRequests.toLocaleString()}
                subtext={`${summary.throughput.toFixed(1)} req/sec avg`}
                icon={Activity}
                color="blue"
                diff={comparison?.totalRequests}
                unit=""
              />
              <SummaryCard
                title="Avg Response Time"
                value={`${summary.avgResponseTime.toFixed(0)} ms`}
                subtext={`Min: ${summary.minResponseTime}ms | Max: ${summary.maxResponseTime}ms`}
                icon={Clock}
                color="indigo"
                diff={comparison?.avgResponseTime}
                unit="ms"
              />
              <SummaryCard
                title="Error Rate"
                value={`${summary.errorRate.toFixed(2)}%`}
                subtext={`${summary.failCount.toLocaleString()} failed requests`}
                icon={AlertTriangle}
                color={summary.errorRate > thresholds.errorRate ? "red" : "green"}
                diff={comparison?.errorRate}
                unit="%"
              />
              <SummaryCard
                title="Throughput"
                value={`${(summary.throughput).toFixed(1)} req/s`}
                subtext={`Sent: ${summary.sentKBytesPerSec.toFixed(1)} KB/s`}
                icon={TrendingUp}
                color="emerald"
                diff={comparison?.throughput}
                unit=" req/s"
              />
            </div>

            {/* Percentiles Row - Colors matched to Chart Lines */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PercentileCard label="Median (P50)" value={summary.p50} gradient="bg-gradient-to-br from-purple-500 to-purple-600" diff={null} />
              <PercentileCard label="90th Percentile" value={summary.p90} gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" diff={comparison?.p90} />
              <PercentileCard label="95th Percentile" value={summary.p95} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" diff={comparison?.p95} />
              <PercentileCard label="99th Percentile" value={summary.p99} gradient="bg-gradient-to-br from-amber-500 to-orange-600" diff={comparison?.p99} />
            </div>

             {/* Regression Analysis (Only if Baseline Loaded) */}
            {regressionAnalysis && regressionAnalysis.regressions.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                           <ArrowUp className="w-5 h-5" /> Top 5 Performance Regressions
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Transactions that slowed down the most compared to baseline.</p>
                        <DeltaBarChart data={regressionAnalysis.regressions} />
                    </div>
                     <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center gap-2">
                           <ArrowDown className="w-5 h-5" /> Top 5 Performance Improvements
                        </h3>
                         <p className="text-sm text-slate-500 mb-4">Transactions that became faster compared to baseline.</p>
                        <DeltaBarChart data={regressionAnalysis.improvements} />
                    </div>
                </div>
            )}

            {/* Main Trend Chart - removed brush since we have global brush now */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Response Time vs Active Users</h3>
              </div>
              <ResponseTimeTrendChart 
                data={displayData.timeSeries} 
                enableBrush={false} 
                threshold={thresholds.responseTime} 
                baselineData={baselineData?.timeSeries} 
              />
            </div>
            
             {/* Distribution */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Response Time Distribution</h3>
              <HistogramChart data={displayData.distribution} />
            </div>
          </div>
        )}

        {/* === CHARTS TAB === */}
        {activeTab === 'charts' && (
           <div className="space-y-6 pt-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Response Time Percentiles</h3>
                 <ResponseTimeChart data={displayData.timeSeries} threshold={thresholds.responseTime} />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Throughput (Hits per Second)</h3>
                 <ThroughputChart data={displayData.timeSeries} />
              </div>
           </div>
        )}

        {/* === TRANSACTION TIME TAB === */}
        {activeTab === 'time' && (
           <div className="space-y-6 pt-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Transaction Performance Over Time</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Showing Average, P50, P90, and P99 response times for the currently filtered selection.
                    </p>
                 </div>
                 <TransactionTimeChart data={displayData.timeSeries} />
              </div>
           </div>
        )}

        {/* === ERRORS TAB === */}
        {activeTab === 'errors' && (
           <div className="space-y-6 pt-4">
              
              {/* Deep Dive Error Inspector (If extra file loaded) */}
              {data.detailedFailures && data.detailedFailures.length > 0 && (
                  <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
                      <ErrorInspector failures={data.detailedFailures} />
                  </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                     <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Error Rate (%) Over Time</h3>
                     <ErrorRateChart data={displayData.timeSeries} threshold={thresholds.errorRate} />
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                     <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Error Count Over Time</h3>
                     <ErrorTrendChart data={displayData.timeSeries} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Error Distribution</h3>
                 {displayData.errors.length > 0 ? (
                   <PieDistributionChart data={displayData.errors.map(e => ({ name: e.message.substring(0, 50), value: e.count }))} />
                 ) : (
                   <div className="text-center text-slate-400 py-10">No Errors Found</div>
                 )}
               </div>
               <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">HTTP Response Codes</h3>
                 <PieDistributionChart data={displayData.responseCodes.map(c => ({ name: `HTTP ${c.code}`, value: c.count }))} />
               </div>
            </div>

            {/* Error Tables */}
             {displayData.errors.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                    <h3 className="font-semibold text-slate-800 dark:text-white">Error Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Error Message</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {displayData.errors.map((err, idx) => (
                        <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-300">{err.message}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{err.count}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{err.percentage.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Standard Recent Failure Log (always shown) */}
            {displayData.failedRequests.length > 0 && (
               <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-6">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 dark:text-white">Recent Failure Log (Sample)</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Showing first {displayData.failedRequests.length} failures</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Time Offset</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Label</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Code</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Error Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {displayData.failedRequests.map((req, idx) => {
                          const offset = (req.timeStamp - displayData.summary.startTime) / 1000;
                          return (
                          <tr key={idx} className="hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <td className="px-6 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">+{offset.toFixed(3)}s</td>
                            <td className="px-6 py-3 text-sm text-slate-900 dark:text-slate-300">{req.label}</td>
                            <td className="px-6 py-3 text-sm text-red-600 dark:text-red-400 font-medium">{req.responseCode}</td>
                            <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400 truncate max-w-md" title={req.responseMessage || req.failureMessage}>
                                {req.responseMessage || req.failureMessage || "Unknown"}
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
               </div>
            )}
           </div>
        )}

        {/* === LATENCY TAB === */}
        {activeTab === 'latency' && (
           <div className="space-y-6 pt-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                 <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">Breakdown of network connection time vs server latency over time.</div>
                 <LatencyCompositionChart data={displayData.timeSeries} />
              </div>
           </div>
        )}

        {/* === TRANSACTIONS TAB === */}
        {activeTab === 'transactions' && (
           <div className="pt-4">
             <TransactionsView data={displayData} baselineData={baselineData} />
           </div>
        )}

      </div>
    </div>
  );
};
