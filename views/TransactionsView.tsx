

import React, { useState, useMemo } from 'react';
import { ProcessedData, LabelStats } from '../types';
import { Search, ArrowUp, ArrowDown, X, Globe, AlertCircle, Filter, Download, Code, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { MultiSelectDropdown } from '../components/Inputs';

interface TransactionsViewProps {
  data: ProcessedData;
  baselineData?: ProcessedData | null;
}

type SortField = keyof LabelStats | 'avgDiff'; // Added avgDiff support
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: SortField;
  direction: SortOrder;
}

// Helper Component for Table Headers to be used in both Standard and Maximized views
const SortableHeader = ({ field, label, sortConfigs, onSort }: { field: any, label: string, sortConfigs: any[], onSort: any }) => {
  const config = sortConfigs.find((c: any) => c.key === field);
  const index = sortConfigs.findIndex((c: any) => c.key === field);
  
  return (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none group sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm"
      onClick={(e) => onSort(field, e)}
      title="Shift+Click to sort by multiple columns"
    >
      <div className="flex items-center gap-1">
        {label}
        {config && (
          <span className="flex items-center">
            {config.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />}
            {sortConfigs.length > 1 && (
              <span className="text-[10px] ml-0.5 text-blue-600 font-bold">{index + 1}</span>
            )}
          </span>
        )}
        {!config && (
          <ArrowUp className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </th>
  );
};

export const TransactionsView: React.FC<TransactionsViewProps> = ({ data, baselineData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([{ key: 'avgElapsed', direction: 'desc' }]);
  const [selectedLabelDetail, setSelectedLabelDetail] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Extract unique labels for filter
  const uniqueLabels = useMemo(() => {
    return data.labels.map(l => l.label).sort();
  }, [data.labels]);

  // Merge Baseline stats into a view model for the table
  const tableData = useMemo(() => {
      // Create a map of baseline labels for O(1) lookup
      const baselineMap = new Map<string, LabelStats>();
      if (baselineData) {
          baselineData.labels.forEach(l => baselineMap.set(l.label, l));
      }

      return data.labels.map(l => {
          const baseline = baselineMap.get(l.label);
          const avgDiff = baseline ? l.avgElapsed - baseline.avgElapsed : 0;
          return {
              ...l,
              baselineAvg: baseline ? baseline.avgElapsed : null,
              avgDiff,
              hasBaseline: !!baseline
          };
      });
  }, [data.labels, baselineData]);

  // Get sample requests for the selected label
  const sampleRequests = useMemo(() => {
    if (!selectedLabelDetail) return [];
    // Filter raw rows for this label, take first 20 as sample
    return data.rawRows
      .filter(r => r.label === selectedLabelDetail)
      .slice(0, 20); 
  }, [selectedLabelDetail, data.rawRows]);

  const handleSort = (field: SortField, event: React.MouseEvent) => {
    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(s => s.key === field);
      
      if (event.shiftKey) {
        // Multi-sort: Append or Toggle existing
        if (existingIndex >= 0) {
          // Toggle direction
          const newConfigs = [...prev];
          newConfigs[existingIndex] = {
            ...newConfigs[existingIndex],
            direction: newConfigs[existingIndex].direction === 'asc' ? 'desc' : 'asc'
          };
          return newConfigs;
        } else {
          // Add new sort field
          return [...prev, { key: field, direction: 'desc' }];
        }
      } else {
        // Single sort: Replace all
        if (existingIndex >= 0 && prev.length === 1) {
          return [{ key: field, direction: prev[0].direction === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ key: field, direction: 'desc' }];
      }
    });
  };

  const filteredData = useMemo(() => {
    let result = tableData.filter(l => {
      const matchesSearch = l.label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDropdown = selectedLabels.length === 0 || selectedLabels.includes(l.label);
      return matchesSearch && matchesDropdown;
    });

    result.sort((a, b) => {
      for (const config of sortConfigs) {
        const valA = (a as any)[config.key];
        const valB = (b as any)[config.key];
        
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
           comparison = valA - valB;
        } else {
            // Handle nulls (e.g. missing baseline)
            if (valA === valB) comparison = 0;
            else if (valA === null || valA === undefined) comparison = -1;
            else if (valB === null || valB === undefined) comparison = 1;
        }

        if (comparison !== 0) {
          return config.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });

    return result;
  }, [tableData, searchTerm, selectedLabels, sortConfigs]);

  const downloadCsv = () => {
    const headers = ['Label', 'Samples', 'Avg (ms)', 'Median (ms)', 'P90 (ms)', 'P95 (ms)', 'P99 (ms)', 'Min (ms)', 'Max (ms)', 'Error %', 'Throughput (req/s)'];
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        `"${row.label.replace(/"/g, '""')}"`, // Escape quotes
        row.count,
        row.avgElapsed.toFixed(2),
        row.p50,
        row.p90,
        row.p95,
        row.p99,
        row.minElapsed,
        row.maxElapsed,
        row.errorRate.toFixed(2),
        row.throughput.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transactions_summary_${new Date().toISOString().slice(0,19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderControls = (isModal: boolean) => (
    <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 ${isModal ? 'border-b border-slate-200 dark:border-slate-800' : 'rounded-xl shadow-sm border border-slate-200 dark:border-slate-800'}`}>
        <div>
           <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
             Transaction Table
             {isModal && <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">Fullscreen</span>}
           </h2>
           {!isModal && (
             <p className="text-xs text-slate-500 mt-1">
               Hold <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Shift</span> to sort by multiple columns. 
             </p>
           )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
          {/* Label Multi-Select */}
          <MultiSelectDropdown 
            label="Label"
            icon={Filter}
            options={uniqueLabels}
            selected={selectedLabels}
            onChange={setSelectedLabels}
          />

          {/* Text Search */}
          <div className="relative flex-1 sm:w-64 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search label text..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
                onClick={downloadCsv}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
                title="Download table as CSV"
            >
                <Download className="w-4 h-4" />
                <span className={isModal ? "" : "hidden xl:inline"}>Export CSV</span>
            </button>

            <button
                onClick={() => setIsMaximized(!isMaximized)}
                className={`p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isModal ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-slate-500'}`}
                title={isMaximized ? "Exit Fullscreen" : "Maximize View"}
            >
                {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
    </div>
  );

  const renderTable = () => (
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
          <tr>
            <SortableHeader field="label" label="Label" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="count" label="Samples" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="avgElapsed" label="Avg (ms)" sortConfigs={sortConfigs} onSort={handleSort} />
            {baselineData && (
                <SortableHeader field="avgDiff" label="Diff" sortConfigs={sortConfigs} onSort={handleSort} />
            )}
            <SortableHeader field="p50" label="Median (ms)" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="p90" label="90% (ms)" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="p95" label="95% (ms)" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="p99" label="99% (ms)" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="minElapsed" label="Min" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="maxElapsed" label="Max" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="errorRate" label="Error %" sortConfigs={sortConfigs} onSort={handleSort} />
            <SortableHeader field="throughput" label="Thru (req/s)" sortConfigs={sortConfigs} onSort={handleSort} />
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          {filteredData.length > 0 ? (
            filteredData.map((row, idx) => (
              <tr 
                key={idx} 
                onClick={() => setSelectedLabelDetail(row.label)}
                className={`
                  cursor-pointer transition-colors
                  ${selectedLabelDetail === row.label 
                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}
              >
                <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-300 break-all">{row.label}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.count.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.avgElapsed.toFixed(0)}</td>
                
                {/* Diff Column */}
                {baselineData && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {row.hasBaseline ? (
                            <span className={`flex items-center gap-1 font-semibold ${row.avgDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {row.avgDiff > 0 ? '+' : ''}{row.avgDiff.toFixed(0)}
                                {row.avgDiff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            </span>
                        ) : (
                            <span className="text-slate-300">-</span>
                        )}
                      </td>
                )}

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.p50.toFixed(0)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-semibold">{row.p90.toFixed(0)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.p95.toFixed(0)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.p99.toFixed(0)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.minElapsed}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.maxElapsed}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    row.errorRate > 0 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                      : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  }`}>
                    {row.errorRate.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.throughput.toFixed(2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={baselineData ? 12 : 11} className="px-6 py-10 text-center text-sm text-slate-500">
                No transactions match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
  );

  return (
    <div className="relative space-y-6 pb-20">
      
      {/* Standard View */}
      {renderControls(false)}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
             {renderTable()}
        </div>
      </div>

      {/* Maximized Overlay */}
      {isMaximized && (
        <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">
           {renderControls(true)}
           <div className="flex-1 overflow-hidden p-4">
             <div className="h-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    {renderTable()}
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Transaction Detail Slide-over - High Z-Index to appear over maximized view */}
      {selectedLabelDetail && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[600px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 z-[70] border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white break-all">{selectedLabelDetail}</h3>
              <p className="text-xs text-slate-500 mt-1">Showing sample of recent requests</p>
            </div>
            <button 
              onClick={() => setSelectedLabelDetail(null)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {sampleRequests.map((req, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                             req.success ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {req.responseCode}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                             Offset: +{(req.timeStamp - data.summary.startTime) / 1000}s
                          </span>
                       </div>
                       <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                          {req.elapsed} ms
                       </span>
                    </div>

                    <div className="space-y-2 text-sm">
                       {req.responseMessage && (
                          <div className="flex gap-2">
                             <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                             <span className="text-slate-600 dark:text-slate-400 truncate">{req.responseMessage}</span>
                          </div>
                       )}
                       {req.URL && (
                          <div className="flex gap-2">
                             <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                             <span className="text-slate-600 dark:text-slate-400 break-all">{req.URL}</span>
                          </div>
                       )}
                       
                       <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div>
                             <span className="text-xs text-slate-400 block">Latency</span>
                             <span className="text-slate-700 dark:text-slate-300">{req.Latency || 0} ms</span>
                          </div>
                          <div>
                             <span className="text-xs text-slate-400 block">Connect</span>
                             <span className="text-slate-700 dark:text-slate-300">{req.Connect || 0} ms</span>
                          </div>
                          <div>
                             <span className="text-xs text-slate-400 block">Bytes</span>
                             <span className="text-slate-700 dark:text-slate-300">{req.bytes || 0} B</span>
                          </div>
                          <div>
                             <span className="text-xs text-slate-400 block">Thread</span>
                             <span className="text-slate-700 dark:text-slate-300 truncate" title={req.threadName}>{req.threadName || '-'}</span>
                          </div>
                       </div>

                       {/* Extended Details (Headers/Body) */}
                       {(req.requestHeaders || req.responseHeaders || req.responseBody || req.requestBody) && (
                           <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-4">
                               {req.requestHeaders && (
                                   <div>
                                       <div className="flex items-center gap-1.5 mb-1">
                                          <Code className="w-3 h-3 text-slate-500" />
                                          <span className="text-xs font-semibold text-slate-500 uppercase">Request Headers</span>
                                       </div>
                                       <pre className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded overflow-x-auto text-slate-600 dark:text-slate-400 font-mono">
                                           {req.requestHeaders}
                                       </pre>
                                   </div>
                               )}
                               {req.requestBody && (
                                   <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <FileText className="w-3 h-3 text-slate-500" />
                                          <span className="text-xs font-semibold text-slate-500 uppercase">Request Body</span>
                                       </div>
                                       <pre className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded overflow-x-auto text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono">
                                           {req.requestBody.length > 500 ? req.requestBody.substring(0, 500) + '...' : req.requestBody}
                                       </pre>
                                   </div>
                               )}
                               {req.responseHeaders && (
                                   <div>
                                       <div className="flex items-center gap-1.5 mb-1">
                                          <Code className="w-3 h-3 text-slate-500" />
                                          <span className="text-xs font-semibold text-slate-500 uppercase">Response Headers</span>
                                       </div>
                                       <pre className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded overflow-x-auto text-slate-600 dark:text-slate-400 font-mono">
                                           {req.responseHeaders}
                                       </pre>
                                   </div>
                               )}
                               {req.responseBody && (
                                   <div>
                                       <div className="flex items-center gap-1.5 mb-1">
                                          <FileText className="w-3 h-3 text-slate-500" />
                                          <span className="text-xs font-semibold text-slate-500 uppercase">Response Body (Snippet)</span>
                                       </div>
                                       <pre className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded overflow-x-auto text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono">
                                           {typeof req.responseBody === 'string' && req.responseBody.length > 500 ? req.responseBody.substring(0, 500) + '...' : req.responseBody}
                                       </pre>
                                   </div>
                               )}
                           </div>
                       )}
                    </div>
                </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};
