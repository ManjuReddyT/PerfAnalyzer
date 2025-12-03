
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Brush, ReferenceLine
} from 'recharts';

// --- Theme Colors ---
const COLORS = {
  p50: '#a855f7', // Purple-500
  p90: '#6366f1', // Indigo-500
  p95: '#10b981', // Emerald-500
  p99: '#f59e0b', // Amber-500
  avg: '#f97316', // Orange-500
  baseline: '#94a3b8', // Slate-400 (Grey for baseline)
  error: '#ef4444',
  success: '#10b981',
  bar: '#3b82f6',
  grid: '#e2e8f0',
  text: '#64748b',
  users: '#cbd5e1'
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg text-sm z-50 min-w-[200px]">
        <p className="font-bold text-slate-700 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1">
          {data.readableTime || label}
        </p>
        
        {/* Render plotted items first */}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
               {/* Dashed line indicator for baseline */}
               {entry.dataKey === 'baselineAvg' ? (
                   <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400"></div>
               ) : (
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
               )}
               <span className="text-slate-500 dark:text-slate-400 capitalize">{entry.name}:</span>
            </div>
            <span className="font-mono font-medium text-slate-900 dark:text-white">
              {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : entry.value}
              {entry.unit || ''}
            </span>
          </div>
        ))}
        
        {/* Extended Details - Show context even if not plotted */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-1">
             <div className="font-semibold text-slate-400 dark:text-slate-500 mb-1">Context</div>
            {data.activeThreads !== undefined && (
                <div className="flex justify-between gap-4"><span>Active Users:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{data.activeThreads}</span></div>
            )}
            {data.p50 !== undefined && !payload.find((p:any) => p.dataKey === 'p50') && (
                <div className="flex justify-between gap-4"><span>Median (P50):</span> <span className="font-mono text-slate-700 dark:text-slate-300">{Math.round(data.p50)} ms</span></div>
            )}
            {data.p90 !== undefined && !payload.find((p:any) => p.dataKey === 'p90') && (
                <div className="flex justify-between gap-4"><span>P90:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{Math.round(data.p90)} ms</span></div>
            )}
             {data.errorCount !== undefined && data.errorCount > 0 && (
                <div className="flex justify-between gap-4"><span>Errors:</span> <span className="font-mono text-red-600">{data.errorCount}</span></div>
            )}
        </div>
      </div>
    );
  }
  return null;
};

// Dual Axis Chart: Response Time (Lines) vs Active Users (Area)
// Added baseline support
export const ResponseTimeTrendChart = ({ data, enableBrush = false, threshold, baselineData }: { data: any[], enableBrush?: boolean, threshold?: number, baselineData?: any[] }) => {
    // Merge baseline data if exists. 
    // Assumption: data and baselineData are array of TimeSeriesPoints with same relative time order/buckets
    // or we just map by index if length matches roughly.
    const chartData = data.map((point, i) => {
        const basePoint = baselineData && baselineData[i];
        return {
            ...point,
            baselineAvg: basePoint ? basePoint.avgElapsed : undefined
        }
    });

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis dataKey="readableTime" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} minTickGap={30} />
          
          <YAxis yAxisId="left" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft', fill: COLORS.text }} />
          <YAxis yAxisId="right" orientation="right" stroke={COLORS.users} fontSize={12} tick={{fill: COLORS.text}} label={{ value: 'Active Users', angle: 90, position: 'insideRight', fill: COLORS.text }} />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36}/>
          
          <Area yAxisId="right" type="monotone" dataKey="activeThreads" name="Active Users" fill={COLORS.users} stroke={COLORS.users} fillOpacity={0.2} />
          
          <Line yAxisId="left" type="monotone" dataKey="avgElapsed" name="Average" stroke={COLORS.avg} strokeWidth={2} dot={false} />
          
          {/* Baseline Line */}
          {baselineData && (
              <Line yAxisId="left" type="monotone" dataKey="baselineAvg" name="Baseline Avg" stroke={COLORS.baseline} strokeWidth={2} strokeDasharray="5 5" dot={false} />
          )}

          <Line yAxisId="left" type="monotone" dataKey="p50" name="Median (P50)" stroke={COLORS.p50} strokeWidth={1.5} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="p90" name="90th Percentile" stroke={COLORS.p90} strokeWidth={1.5} dot={false} />

          {threshold && (
            <ReferenceLine yAxisId="left" y={threshold} label={{ value: `Threshold: ${threshold}ms`, position: 'top', fill: 'red', fontSize: 10 }} stroke="red" strokeDasharray="3 3" />
          )}

          {enableBrush && (
            <Brush 
              dataKey="readableTime" 
              height={30} 
              stroke="#cbd5e1"
              tickFormatter={() => ''}
              alwaysShowText={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
};

export const ResponseTimeChart = ({ data, threshold }: { data: any[], threshold?: number }) => (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
      <XAxis dataKey="readableTime" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} minTickGap={30} />
      <YAxis stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: COLORS.text }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Line type="monotone" dataKey="avgElapsed" name="Average" stroke={COLORS.avg} strokeWidth={2} dot={false} />
      <Line type="monotone" dataKey="p50" name="Median (P50)" stroke={COLORS.p50} strokeWidth={2} dot={false} />
      <Line type="monotone" dataKey="p90" name="90th Percentile" stroke={COLORS.p90} strokeWidth={1.5} dot={false} />
      <Line type="monotone" dataKey="p95" name="95th Percentile" stroke={COLORS.p95} strokeWidth={1.5} dot={false} />
      <Line type="monotone" dataKey="p99" name="99th Percentile" stroke={COLORS.p99} strokeWidth={1.5} dot={false} />
      {threshold && (
        <ReferenceLine y={threshold} label={{ value: `Threshold: ${threshold}ms`, position: 'top', fill: 'red', fontSize: 10 }} stroke="red" strokeDasharray="3 3" />
      )}
    </LineChart>
  </ResponsiveContainer>
);

export const TransactionTimeChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
      <XAxis dataKey="readableTime" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} minTickGap={30} />
      <YAxis stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: COLORS.text }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Line type="monotone" dataKey="avgElapsed" name="Avg Response" stroke={COLORS.avg} strokeWidth={2} dot={false} />
      <Line type="monotone" dataKey="p50" name="Median (P50)" stroke={COLORS.p50} strokeWidth={2} dot={false} />
      <Line type="monotone" dataKey="p90" name="P90" stroke={COLORS.p90} strokeWidth={1.5} dot={false} />
      <Line type="monotone" dataKey="p99" name="P99" stroke={COLORS.p99} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

export const ThroughputChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
      <XAxis dataKey="readableTime" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} minTickGap={30} />
      <YAxis stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} label={{ value: 'req/sec', angle: -90, position: 'insideLeft', fill: COLORS.text }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Area type="monotone" dataKey="throughput" name="Requests/Sec" stroke={COLORS.bar} fill={COLORS.bar} fillOpacity={0.3} />
    </AreaChart>
  </ResponsiveContainer>
);

export const HistogramChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
      <XAxis dataKey="range" stroke={COLORS.text} fontSize={10} tick={{fill: COLORS.text}} interval={0} angle={-45} textAnchor="end" height={60} />
      <YAxis stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} />
      <Tooltip 
        cursor={{fill: 'transparent'}}
        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
      />
      <Bar dataKey="count" name="Frequency" fill={COLORS.bar} radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const ErrorRateChart = ({ data, threshold }: { data: any[], threshold?: number }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
      <XAxis dataKey="readableTime" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} minTickGap={30} />
      <YAxis stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} unit="%" />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Line type="monotone" dataKey="errorRate" name="Error Rate %" stroke={COLORS.error} strokeWidth={2} dot={false} />
      {threshold && (
        <ReferenceLine y={threshold} label={{ value: `Max: ${threshold}%`, position: 'top', fill: COLORS.error, fontSize: 10 }} stroke={COLORS.error} strokeDasharray="3 3" />
      )}
    </LineChart>
  </ResponsiveContainer>
);

export const ErrorTrendChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
      <XAxis dataKey="readableTime" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} minTickGap={30} />
      <YAxis stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Bar dataKey="errorCount" name="Error Count" fill={COLORS.error} stackId="a" />
    </BarChart>
  </ResponsiveContainer>
);

export const LatencyCompositionChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
     <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis dataKey="readableTime" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} minTickGap={30} />
        <YAxis stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area type="monotone" dataKey="avgConnect" stackId="1" stroke="#8884d8" fill="#8884d8" name="Connect Time" />
        <Area type="monotone" dataKey="avgLatency" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Latency" />
        <Area type="monotone" dataKey="avgElapsed" stackId="1" stroke="#ffc658" fill="#ffc658" name="Total Time" fillOpacity={0.1} strokeDasharray="3 3" />
      </AreaChart>
  </ResponsiveContainer>
);

export const PieDistributionChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={80}
        fill="#8884d8"
        paddingAngle={5}
        dataKey="value"
        label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

// Global Timeline Control using Brush
export const TimelineBrushChart = ({ data, onChange }: { data: any[], onChange: (range: {startIndex?: number, endIndex?: number}) => void }) => (
  <div style={{ width: '100%', height: 100 }}>
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <XAxis 
          dataKey="readableTime" 
          stroke="#94a3b8" 
          fontSize={10} 
          tick={{fill: '#94a3b8'}} 
          minTickGap={50}
          height={20}
        />
        <Area type="monotone" dataKey="throughput" stroke="#cbd5e1" fill="#f1f5f9" />
        <Brush 
          dataKey="readableTime" 
          height={30} 
          stroke="#3b82f6"
          tickFormatter={(value) => value}
          onChange={onChange}
          alwaysShowText={true}
          startIndex={0}
          y={40}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// Comparison Bar Chart (Delta)
export const DeltaBarChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
      <XAxis type="number" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} />
      <YAxis type="category" dataKey="name" stroke={COLORS.text} fontSize={12} tick={{fill: COLORS.text}} width={100} />
      <Tooltip cursor={{fill: 'transparent'}} />
      <Legend />
      <Bar dataKey="delta" name="Diff (ms)">
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.delta > 0 ? COLORS.error : COLORS.success} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
