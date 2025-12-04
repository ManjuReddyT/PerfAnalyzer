
import React, { useState, useMemo, useCallback } from 'react';
import { ProcessedData, MetricDiff, JmeterRow, LabelStats } from '../types';
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
  DeltaBarChart,
  CapacityScatterChart
} from '../components/Charts';
import { MultiSelectDropdown } from '../components/Inputs';
import { 
  Activity, Clock, AlertTriangle, TrendingUp, Download, Printer, 
  ArrowRight, Settings, ChevronDown, ChevronUp, Filter, BarChart, 
  AlertCircle, Layers, List, ArrowDown, ArrowUp, Save, Target, RotateCcw,
  Bug, Search, RefreshCw, GitCompare, Code, FileText, MousePointerClick, ToggleLeft, ToggleRight,
  Globe, Gauge, Users, Info, CalendarRange, X, Maximize2, Minimize2
} from 'lucide-react';
import { formatDuration, analyzeRows, calculateComparison, generateLabelTimeSeries } from '../utils/analytics';
import { TransactionsView } from './TransactionsView';

interface DashboardViewProps {
  data: ProcessedData;
  allReports: ProcessedData[]; // All loaded reports for comparison list
  onNavigate?: (view: string) => void;
  thresholds: { responseTime: number; errorRate: number };
  onUpdateThresholds: (t: { responseTime: number; errorRate: number }) => void;
  onSaveSession: () => void;
  isLive?: boolean;
  livePollInterval?: number;
  onSetPollInterval?: (ms: number) => void;
  onForceRefresh?: () => void;
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

const SummaryCard = ({ title, value, subtext, icon: Icon, color, diff, unit, tooltip }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
    <div className="flex justify-between items-start mb-2">
         <div className={`p-2.5 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
            <Icon className="w-5 h-5" />
         </div>
         {diff && <ComparisonBadge diff={diff} unit={unit} />}
    </div>
    
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {tooltip && (
            <div className="relative group/tooltip">
                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed border border-slate-700">
                    {tooltip}
                </div>
            </div>
        )}
      </div>
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

interface ChartCardProps {
  title: React.ReactNode;
  subtext?: React.ReactNode;
  children: (isMaximized: boolean) => React.ReactNode;
  action?: React.ReactNode;
  defaultHeight?: number;
}

// Wrapper Component for Charts with Maximize Capability
const ChartCard = ({ title, subtext, children, action, defaultHeight = 300 }: ChartCardProps) => {
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <div className={`
      bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300
      ${isMaximized ? 'fixed inset-0 z-[60] p-6' : 'p-6 relative'}
    `}>
        <div className="flex justify-between items-start mb-6 gap-4 flex-shrink-0">
             <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  {title}
                  {isMaximized && <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 ml-2">Fullscreen</span>}
                </h3>
                {subtext && <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtext}</div>}
             </div>
             <div className="flex items-center gap-2">
                {action}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className={`p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isMaximized ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-slate-500'}`}
                  title={isMaximized ? "Minimize" : "Maximize"}
                >
                  {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
             </div>
        </div>
        <div className={`flex-1 min-h-0 w-full`}>
            {children(isMaximized)}
        </div>
    </div>
  );
};

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
  allReports, 
  onNavigate, 
  thresholds, 
  onUpdateThresholds, 
  onSaveSession,
  isLive,
  livePollInterval,
  onSetPollInterval,
  onForceRefresh
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]); // Empty = All
  const [selectedResponseCodes, setSelectedResponseCodes] = useState<string[]>([]); // Empty = All
  const [showThresholds, setShowThresholds] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>(''); // Comparison Selection
  const [resourceFilter, setResourceFilter] = useState<'all' | 'requests' | 'transactions'>('all');
  
  // Chart Modes
  const [chartMode, setChartMode] = useState<'aggregate' | 'byLabel'>('aggregate');
  
  // Timeline Filter State
  const [timelineRange, setTimelineRange] = useState<{start: number, end: number} | null>(null);
  const [timelineKey, setTimelineKey] = useState(0); 

  // Derived Baseline Data
  const baselineData = useMemo(() => {
      if (!selectedBaselineId) return null;
      return allReports.find(r => r.id === selectedBaselineId) || null;
  }, [selectedBaselineId, allReports]);

  // Extract unique options
  const uniqueLabels = useMemo(() => {
    const labels = new Set(data.rawRows.map(r => r.label));
    return Array.from(labels).sort();
  }, [data.rawRows]);

  const uniqueResponseCodes = useMemo(() => {
    const codes = new Set(data.rawRows.map(r => String(r.responseCode)));
    return Array.from(codes).sort();
  }, [data.rawRows]);

  // Check if we have URL data to distinguish requests from transactions
  const hasUrlData = useMemo(() => {
     if (data.rawRows.length === 0) return false;
     return data.rawRows.slice(0, 50).some(r => !!r.URL);
  }, [data.rawRows]);

  // Handle Timeline Brush Changes
  const handleTimelineChange = useCallback((range: {startIndex?: number, endIndex?: number}) => {
     if (range.startIndex !== undefined && range.endIndex !== undefined && data.timeSeries.length > 0) {
        const startPoint = data.timeSeries[range.startIndex];
        const endPoint = data.timeSeries[range.endIndex];
        if (startPoint && endPoint) {
            const absStartTime = data.summary.startTime + (startPoint.time * 1000);
            const absEndTime = data.summary.startTime + (endPoint.time * 1000);
            setTimelineRange({ start: absStartTime - 100, end: absEndTime + 1000 });
        }
     }
  }, [data.timeSeries, data.summary.startTime]);

  const handleResetTimeline = () => {
    setTimelineRange(null);
    setTimelineKey(prev => prev + 1); 
  };

  // Memoize the filtered data
  const filteredRawRows = useMemo(() => {
    const isAllTransactions = selectedTransactions.length === 0 || selectedTransactions.length === uniqueLabels.length;
    const isAllCodes = selectedResponseCodes.length === 0 || selectedResponseCodes.length === uniqueResponseCodes.length;
    const isAllTime = timelineRange === null;
    const isAllResources = resourceFilter === 'all';

    if (isAllTransactions && isAllCodes && isAllTime && isAllResources) return data.rawRows;

    return data.rawRows.filter(r => {
      const labelMatch = isAllTransactions || selectedTransactions.includes(r.label);
      const codeMatch = isAllCodes || selectedResponseCodes.includes(String(r.responseCode));
      const timeMatch = isAllTime || (r.timeStamp >= timelineRange.start && r.timeStamp <= timelineRange.end);
      
      let resourceMatch = true;
      if (resourceFilter === 'requests') {
          resourceMatch = !!r.URL && r.URL.length > 0;
      } else if (resourceFilter === 'transactions') {
          resourceMatch = !r.URL || r.URL.length === 0;
      }

      return labelMatch && codeMatch && timeMatch && resourceMatch;
    });
  }, [data.rawRows, selectedTransactions, selectedResponseCodes, timelineRange, uniqueLabels, uniqueResponseCodes, resourceFilter]);

  const displayData = useMemo(() => {
    if (filteredRawRows.length === 0) {
      return { ...data, summary: { ...data.summary, totalRequests: 0, apdex: 0 }, timeSeries: [], capacitySeries: [], labels: [], errors: [], rawRows: [] };
    }
    return analyzeRows(filteredRawRows, data.summary.fileName, false, thresholds.responseTime);
  }, [filteredRawRows, data.summary.fileName, data, thresholds.responseTime]);

  // Memoize data for "Group by Label" chart mode
  const labelChartData = useMemo(() => {
      if (chartMode !== 'byLabel' || filteredRawRows.length === 0) return { data: [], series: [] };
      
      const timeSeries = generateLabelTimeSeries(
          filteredRawRows, 
          displayData.summary.startTime, 
          displayData.summary.endTime
      );
      
      // Determine which labels to show (either from filter or top 5 by count if all selected)
      let activeLabels = selectedTransactions.length > 0 
          ? selectedTransactions 
          : uniqueLabels.slice(0, 5); // Fallback to first 5 if none selected, or user can select specific
      
      // If user hasn't filtered labels, pick top 5 by volume to avoid messy chart
      if (selectedTransactions.length === 0) {
          const counts = new Map<string, number>();
          filteredRawRows.forEach(r => counts.set(r.label, (counts.get(r.label) || 0) + 1));
          activeLabels = Array.from(counts.entries())
              .sort((a,b) => b[1] - a[1])
              .slice(0, 5)
              .map(e => e[0]);
      }

      const series = activeLabels.map(label => ({
          key: label,
          name: label
      }));

      return { data: timeSeries, series };
  }, [chartMode, filteredRawRows, displayData.summary.startTime, displayData.summary.endTime, selectedTransactions, uniqueLabels]);


  // Calculate comparison if baseline exists
  const comparison = useMemo(() => {
    if (!baselineData) return null;
    return calculateComparison(displayData.summary, baselineData.summary);
  }, [displayData.summary, baselineData]);

  // Comparison Analysis
  const regressionAnalysis = useMemo(() => {
    if (!baselineData || !comparison) return null;
    
    const baselineMap = new Map<string, LabelStats>(baselineData.labels.map(l => [l.label, l]));
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

    const regressions = [...deltas]
        .filter(d => d!.delta > 10) 
        .sort((a,b) => b!.delta - a!.delta)
        .slice(0, 5);

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

  const getApdexColor = (score: number) => {
      if (score >= 0.94) return 'blue';
      if (score >= 0.85) return 'green';
      if (score >= 0.70) return 'yellow';
      return 'red';
  };
  const apdexColor = getApdexColor(summary.apdex);

  const startDateStr = new Date(summary.startTime).toLocaleString();
  const endDateStr = new Date(summary.endTime).toLocaleString();

  const timeRangeLabel = useMemo(() => {
    if (timelineRange) {
        const start = new Date(timelineRange.start).toLocaleTimeString();
        const end = new Date(timelineRange.end).toLocaleTimeString();
        return `${start} - ${end}`;
    }
    return `Full Duration (${formatDuration(summary.duration)})`;
  }, [timelineRange, summary.duration]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Dashboard
                {isLive && (
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 px-2 py-1 rounded-full">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            LIVE
                        </span>
                        {/* Live Controls */}
                        {onSetPollInterval && (
                            <div className="flex items-center gap-1 border-l border-red-200 dark:border-red-800 pl-2">
                                <select 
                                    className="bg-transparent text-[10px] font-medium text-red-700 dark:text-red-300 focus:outline-none cursor-pointer"
                                    value={livePollInterval}
                                    onChange={(e) => onSetPollInterval(Number(e.target.value))}
                                >
                                    <option value="2000">2s</option>
                                    <option value="5000">5s</option>
                                    <option value="10000">10s</option>
                                    <option value="0">Off</option>
                                </select>
                            </div>
                        )}
                         {onForceRefresh && (
                            <button 
                                onClick={onForceRefresh}
                                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-full transition-colors"
                                title="Force Refresh Now"
                            >
                                <RefreshCw className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </h2>
         </div>

         <div className="flex flex-wrap gap-2 items-center">
            {/* Compare With Dropdown */}
            {allReports.length > 1 && (
                <div className="relative">
                    <select 
                        value={selectedBaselineId}
                        onChange={(e) => setSelectedBaselineId(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                        <option value="">Compare with...</option>
                        {allReports.filter(r => r.id !== data.id).map(r => (
                            <option key={r.id} value={r.id}>Vs: {r.summary.fileName}</option>
                        ))}
                    </select>
                    <GitCompare className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            )}

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

      {/* Unified Control Bar (Sticky) */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all">
         
         {/* Main Toolbar Strip */}
         <div className="p-3 flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Time Toggle */}
            <button 
               onClick={() => setShowTimeline(!showTimeline)}
               className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showTimeline || timelineRange ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
               title="Toggle Timeline View"
            >
               <CalendarRange className="w-4 h-4" />
               <span>Time Range</span>
               <span className="hidden sm:inline font-normal opacity-70 border-l border-current pl-2 ml-1 truncate max-w-[140px]">{timeRangeLabel}</span>
               {showTimeline ? <ChevronUp className="w-3.5 h-3.5 opacity-50" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
            </button>
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            {/* Filters */}
            <div className="flex-1 flex flex-wrap items-center gap-2">
                <MultiSelectDropdown 
                    label="Transaction" 
                    icon={Filter}
                    options={uniqueLabels}
                    selected={selectedTransactions}
                    onChange={setSelectedTransactions}
                />
                
                <MultiSelectDropdown 
                    label="Code" 
                    icon={AlertCircle}
                    options={uniqueResponseCodes}
                    selected={selectedResponseCodes}
                    onChange={setSelectedResponseCodes}
                />

                {hasUrlData && (
                    <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 ml-2">
                        <button 
                            onClick={() => setResourceFilter('all')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${resourceFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setResourceFilter('requests')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${resourceFilter === 'requests' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                            Requests
                        </button>
                        <button 
                            onClick={() => setResourceFilter('transactions')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${resourceFilter === 'transactions' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                            Trans.
                        </button>
                    </div>
                )}
            </div>

            {/* Right Side Settings */}
            <div className="flex items-center gap-2">
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                <button 
                    onClick={() => setShowThresholds(!showThresholds)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showThresholds ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                    title="Configure Thresholds"
                >
                    <Target className="w-4 h-4" />
                    <span>Thresholds</span>
                    {showThresholds ? <ChevronUp className="w-3.5 h-3.5 opacity-50" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
                </button>
            </div>
         </div>

         {/* Collapsible Timeline Panel */}
         {showTimeline && data.timeSeries.length > 0 && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                 <div className="flex items-center justify-between mb-2">
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <CalendarRange className="w-3 h-3" />
                        Select Range
                     </span>
                     {timelineRange && (
                        <button 
                          onClick={handleResetTimeline}
                          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-blue-400 rounded transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </button>
                     )}
                 </div>
                 <div className="h-[110px] w-full">
                    <TimelineBrushChart key={timelineKey} data={data.timeSeries} onChange={handleTimelineChange} />
                 </div>
                 
                 <div className="flex justify-between items-center mt-1 px-1">
                    <span className="text-[10px] font-mono text-slate-400">{startDateStr}</span>
                    <span className="text-[10px] font-mono text-slate-400">{endDateStr}</span>
                 </div>
              </div>
         )}
         
         {/* Collapsible Threshold Panel */}
         {showThresholds && (
            <div className="px-4 pb-4 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Response Time Threshold (ms) <span className="text-xs text-slate-400">(Apdex T)</span></label>
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
      </div>

      {/* Tabs Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto no-scrollbar">
        <TabButton id="overview" label="Overview" icon={Activity} active={activeTab === 'overview'} onClick={setActiveTab} />
        <TabButton id="charts" label="Detailed Charts" icon={BarChart} active={activeTab === 'charts'} onClick={setActiveTab} />
        <TabButton id="capacity" label="Capacity Analysis" icon={Users} active={activeTab === 'capacity'} onClick={setActiveTab} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <SummaryCard
                title="APDEX Score"
                value={summary.apdex.toFixed(2)}
                subtext={`Target: ${thresholds.responseTime}ms`}
                icon={Gauge}
                color={apdexColor}
                diff={comparison?.apdex}
                unit=""
                tooltip={
                  <span>
                    <strong>Application Performance Index</strong><br/>
                    Measures user satisfaction based on response time.<br/>
                    • <strong>Satisfied:</strong> &lt; T ({thresholds.responseTime}ms)<br/>
                    • <strong>Tolerating:</strong> T to 4T<br/>
                    • <strong>Frustrated:</strong> &gt; 4T or Error<br/>
                    Formula: (Satisfied + (Tolerating/2)) / Total
                  </span>
                }
              />
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
                title="Avg Response"
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
                    <ChartCard title={<span className="text-red-600 dark:text-red-400 flex items-center gap-2"><ArrowUp className="w-5 h-5" /> Top 5 Regressions</span>} subtext="Transactions that slowed down the most vs baseline.">
                       {(isMaximized) => <DeltaBarChart data={regressionAnalysis.regressions} height={isMaximized ? "100%" : 300} />}
                    </ChartCard>
                    <ChartCard title={<span className="text-green-600 dark:text-green-400 flex items-center gap-2"><ArrowDown className="w-5 h-5" /> Top 5 Improvements</span>} subtext="Transactions that became faster vs baseline.">
                       {(isMaximized) => <DeltaBarChart data={regressionAnalysis.improvements} height={isMaximized ? "100%" : 300} />}
                    </ChartCard>
                </div>
            )}

            {/* Main Trend Chart - removed brush since we have global brush now */}
            <ChartCard title="Response Time vs Active Users" defaultHeight={400}>
              {(isMaximized) => (
                <ResponseTimeTrendChart 
                    data={displayData.timeSeries} 
                    enableBrush={false} 
                    threshold={thresholds.responseTime} 
                    baselineData={baselineData?.timeSeries}
                    height={isMaximized ? "100%" : 400} 
                />
              )}
            </ChartCard>
            
             {/* Distribution */}
             <ChartCard title="Response Time Distribution" defaultHeight={300}>
               {(isMaximized) => <HistogramChart data={displayData.distribution} height={isMaximized ? "100%" : 300} />}
             </ChartCard>
          </div>
        )}

        {/* === CHARTS TAB === */}
        {activeTab === 'charts' && (
           <div className="space-y-6 pt-4">
              <ChartCard 
                  title="Response Time Analysis" 
                  subtext={chartMode === 'aggregate' ? 'Showing percentiles for aggregate traffic.' : 'Comparing Average Response Time per transaction.'}
                  defaultHeight={400}
                  action={
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 mr-2">
                        <button 
                        onClick={() => setChartMode('aggregate')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${chartMode === 'aggregate' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                        <BarChart className="w-3.5 h-3.5" />
                        Aggregate
                        </button>
                        <button 
                        onClick={() => setChartMode('byLabel')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${chartMode === 'byLabel' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                        <List className="w-3.5 h-3.5" />
                        Labels
                        </button>
                    </div>
                  }
              >
                 {(isMaximized) => (
                    <>
                    {chartMode === 'aggregate' ? (
                        <ResponseTimeChart data={displayData.timeSeries} threshold={thresholds.responseTime} height={isMaximized ? "100%" : 400} />
                    ) : (
                        <div className="relative h-full">
                            {labelChartData.series.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400">
                                    No data available for selected filters.
                                </div>
                            ) : (
                                <ResponseTimeChart 
                                   data={labelChartData.data} 
                                   series={labelChartData.series} 
                                   threshold={thresholds.responseTime}
                                   height={isMaximized ? "100%" : 400} 
                                />
                            )}
                        </div>
                    )}
                    </>
                 )}
              </ChartCard>

              <ChartCard title="Throughput (Hits per Second)" defaultHeight={300}>
                 {(isMaximized) => <ThroughputChart data={displayData.timeSeries} height={isMaximized ? "100%" : 300} />}
              </ChartCard>
           </div>
        )}

        {/* === CAPACITY ANALYSIS TAB === */}
        {activeTab === 'capacity' && (
           <div className="space-y-6 pt-4">
              <ChartCard 
                title={
                    <span className="flex items-center gap-2">
                         <Users className="w-5 h-5 text-indigo-500" />
                         Scalability Analysis (Active Users vs Response Time)
                    </span>
                }
                subtext="Identify the 'Knee of the Curve' where response time degrades non-linearly."
                defaultHeight={400}
              >
                 {(isMaximized) => displayData.capacitySeries.length > 0 ? (
                    <CapacityScatterChart 
                        data={displayData.capacitySeries} 
                        yKey="avgResponseTime" 
                        yLabel="Avg Response Time (ms)" 
                        color="#6366f1"
                        height={isMaximized ? "100%" : 400} 
                    />
                 ) : (
                    <div className="h-full min-h-[300px] flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        Insufficient data to generate capacity analysis. Ensure your log file includes thread counts.
                    </div>
                 )}
              </ChartCard>

              <ChartCard 
                title={
                    <span className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Throughput Efficiency (Active Users vs Hits/s)
                    </span>
                }
                subtext="Visualizes where throughput plateaus while users increase (Scalability limit)."
                defaultHeight={400}
              >
                 {(isMaximized) => displayData.capacitySeries.length > 0 ? (
                    <CapacityScatterChart 
                        data={displayData.capacitySeries} 
                        yKey="throughput" 
                        yLabel="Throughput (req/s)" 
                        color="#10b981"
                        height={isMaximized ? "100%" : 400} 
                    />
                 ) : (
                    <div className="h-full min-h-[300px] flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        Insufficient data.
                    </div>
                 )}
              </ChartCard>
           </div>
        )}

        {/* === TRANSACTION TIME TAB === */}
        {activeTab === 'time' && (
           <div className="space-y-6 pt-4">
              <ChartCard title="Transaction Performance Over Time" subtext="Average, P50, P90, and P99 response times." defaultHeight={400}>
                 {(isMaximized) => <TransactionTimeChart data={displayData.timeSeries} height={isMaximized ? "100%" : 400} />}
              </ChartCard>
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
                <ChartCard title="Error Rate (%) Over Time" defaultHeight={300}>
                     {(isMaximized) => <ErrorRateChart data={displayData.timeSeries} threshold={thresholds.errorRate} height={isMaximized ? "100%" : 300} />}
                </ChartCard>
                <ChartCard title="Error Count Over Time" defaultHeight={300}>
                     {(isMaximized) => <ErrorTrendChart data={displayData.timeSeries} height={isMaximized ? "100%" : 300} />}
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <ChartCard title="Error Distribution" defaultHeight={300}>
                 {(isMaximized) => displayData.errors.length > 0 ? (
                   <PieDistributionChart data={displayData.errors.map(e => ({ name: e.message.substring(0, 50), value: e.count }))} height={isMaximized ? "100%" : 300} />
                 ) : (
                   <div className="text-center text-slate-400 py-10">No Errors Found</div>
                 )}
               </ChartCard>
               <ChartCard title="HTTP Response Codes" defaultHeight={300}>
                 {(isMaximized) => <PieDistributionChart data={displayData.responseCodes.map(c => ({ name: `HTTP ${c.code}`, value: c.count }))} height={isMaximized ? "100%" : 300} />}
               </ChartCard>
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
              <ChartCard title="Latency Composition" subtext="Breakdown of network connection time vs server latency over time." defaultHeight={300}>
                 {(isMaximized) => <LatencyCompositionChart data={displayData.timeSeries} height={isMaximized ? "100%" : 300} />}
              </ChartCard>
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
