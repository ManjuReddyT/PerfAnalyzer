
import Papa from 'papaparse';
import { JmeterRow, ProcessedData, TestSummary, TimeSeriesPoint, LabelStats, ErrorStats, ComparisonAnalysis, MetricDiff } from '../types';

// Helper to calculate percentiles from sorted array-like structures (Array or TypedArray)
const getPercentile = (sortedArr: ArrayLike<number>, p: number): number => {
  if (sortedArr.length === 0) return 0;
  const index = Math.floor(sortedArr.length * (p / 100));
  return sortedArr[index];
};

// Helper to format duration
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
};

// Calculate comparison metrics between current and baseline
export const calculateComparison = (current: TestSummary, baseline: TestSummary): ComparisonAnalysis => {
    const calcDiff = (curr: number, base: number, inverse: boolean = false): MetricDiff => {
        const diff = curr - base;
        const percent = base !== 0 ? (diff / base) * 100 : 0;
        // If inverse is true, lower is better (e.g. response time).
        // If inverse is false, higher is better (e.g. throughput).
        const isImprovement = inverse ? diff <= 0 : diff >= 0;
        return { absolute: diff, percentage: percent, isImprovement };
    };

    return {
        totalRequests: calcDiff(current.totalRequests, baseline.totalRequests, false),
        avgResponseTime: calcDiff(current.avgResponseTime, baseline.avgResponseTime, true),
        errorRate: calcDiff(current.errorRate, baseline.errorRate, true),
        throughput: calcDiff(current.throughput, baseline.throughput, false),
        p90: calcDiff(current.p90, baseline.p90, true),
        p95: calcDiff(current.p95, baseline.p95, true),
        p99: calcDiff(current.p99, baseline.p99, true),
    };
};

// Generate time series data grouped by label for comparison charts
export const generateLabelTimeSeries = (rows: JmeterRow[], startTime: number, endTime: number): any[] => {
    if (!rows || rows.length === 0) return [];

    const duration = Math.max((endTime - startTime) / 1000, 1);
    let bucketSize = 1000;
    if (duration > 300) bucketSize = 5000;
    if (duration > 3600) bucketSize = 60000;

    // Map: bucketTime -> { [label]: { sum: number, count: number } }
    const buckets = new Map<number, Record<string, { sum: number, count: number }>>();
    const allLabels = new Set<string>();

    for (const row of rows) {
        const bucket = Math.floor((row.timeStamp - startTime) / bucketSize) * bucketSize;
        if (!buckets.has(bucket)) {
            buckets.set(bucket, {});
        }
        
        const bData = buckets.get(bucket)!;
        const label = row.label || 'Unknown';
        allLabels.add(label);

        if (!bData[label]) {
            bData[label] = { sum: 0, count: 0 };
        }
        bData[label].sum += row.elapsed;
        bData[label].count++;
    }

    const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);
    
    return sortedBucketTimes.map(bucketTime => {
        const bData = buckets.get(bucketTime)!;
        const point: any = {
            time: bucketTime / 1000,
            readableTime: new Date(startTime + bucketTime).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        // For each label found in the dataset, calculate avg for this bucket (or null if no data)
        allLabels.forEach(label => {
            if (bData[label]) {
                point[label] = bData[label].sum / bData[label].count;
            } else {
                point[label] = null; // or undefined, helps chart connect dots or break
            }
        });

        return point;
    });
};

// Core analysis logic decoupled from parsing
export const analyzeRows = (rows: JmeterRow[], fileName: string, skipDetailedAnalysis: boolean = false): ProcessedData => {
    if (!rows || rows.length === 0) {
      throw new Error("No data found in file");
    }

    // Generate unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

    // 1. Normalization & Sorting
    const normalizedRows = rows.map(r => {
       let isSuccess = r.success;
       if (typeof isSuccess === 'string') {
         isSuccess = (isSuccess as string).toLowerCase() === 'true';
       }
       
       return {
         ...r,
         timeStamp: Number(r.timeStamp),
         elapsed: Number(r.elapsed),
         success: isSuccess,
         Latency: Number(r.Latency || 0),
         Connect: Number(r.Connect || 0),
         bytes: Number(r.bytes || 0),
         sentBytes: Number(r.sentBytes || 0),
         grpThreads: Number(r.grpThreads || r.allThreads || 0),
         label: r.label || 'Unknown'
       };
    }).sort((a, b) => a.timeStamp - b.timeStamp);

    if (normalizedRows.length === 0) {
      throw new Error("No valid rows parsed");
    }

    if (skipDetailedAnalysis) {
        return {
            id,
            summary: {
                fileName,
                totalRequests: normalizedRows.length,
                successCount: 0,
                failCount: 0,
                errorRate: 0,
                duration: 0,
                startTime: normalizedRows[0].timeStamp,
                endTime: normalizedRows[normalizedRows.length - 1].timeStamp,
                throughput: 0,
                receivedKBytesPerSec: 0,
                sentKBytesPerSec: 0,
                avgResponseTime: 0,
                p50: 0,
                p90: 0,
                p95: 0,
                p99: 0,
                minResponseTime: 0,
                maxResponseTime: 0,
            },
            timeSeries: [],
            labels: [],
            errors: [],
            failedRequests: [],
            responseCodes: [],
            distribution: [],
            rawRows: normalizedRows
        };
    }

    // 2. Single-Pass Aggregation
    const startTime = normalizedRows[0].timeStamp;
    const endTime = normalizedRows[normalizedRows.length - 1].timeStamp;
    const duration = Math.max((endTime - startTime) / 1000, 1);

    let bucketSize = 1000;
    if (duration > 300) bucketSize = 5000;
    if (duration > 3600) bucketSize = 60000;

    const timeMap = new Map<number, JmeterRow[]>();
    const labelMap = new Map<string, JmeterRow[]>();
    const codeMap = new Map<string, number>();
    const errorMap = new Map<string, number>();
    const failedRequests: JmeterRow[] = [];
    
    const elapsedValues = new Float64Array(normalizedRows.length);
    let totalBytes = 0;
    let totalSentBytes = 0;

    const rowCount = normalizedRows.length;
    for (let i = 0; i < rowCount; i++) {
        const row = normalizedRows[i];

        elapsedValues[i] = row.elapsed;
        totalBytes += row.bytes;
        totalSentBytes += row.sentBytes;

        const bucket = Math.floor((row.timeStamp - startTime) / bucketSize) * bucketSize;
        let bucketRows = timeMap.get(bucket);
        if (!bucketRows) {
            bucketRows = [];
            timeMap.set(bucket, bucketRows);
        }
        bucketRows.push(row);

        const label = row.label;
        let labelRows = labelMap.get(label);
        if (!labelRows) {
            labelRows = [];
            labelMap.set(label, labelRows);
        }
        labelRows.push(row);

        const code = String(row.responseCode || 'Unknown');
        codeMap.set(code, (codeMap.get(code) || 0) + 1);

        if (!row.success) {
            failedRequests.push(row);
            const msg = row.responseMessage || row.failureMessage || row.responseCode || 'Unknown Error';
            errorMap.set(msg, (errorMap.get(msg) || 0) + 1);
        }
    }

    elapsedValues.sort();
    const totalRequests = rowCount;
    const successCount = totalRequests - failedRequests.length;
    const sumElapsed = elapsedValues.reduce((a, b) => a + b, 0);

    const summary: TestSummary = {
      fileName: fileName,
      totalRequests,
      successCount,
      failCount: failedRequests.length,
      errorRate: (failedRequests.length / totalRequests) * 100,
      duration,
      startTime,
      endTime,
      throughput: totalRequests / duration,
      receivedKBytesPerSec: (totalBytes / 1024) / duration,
      sentKBytesPerSec: (totalSentBytes / 1024) / duration,
      avgResponseTime: sumElapsed / totalRequests,
      p50: getPercentile(elapsedValues, 50),
      p90: getPercentile(elapsedValues, 90),
      p95: getPercentile(elapsedValues, 95),
      p99: getPercentile(elapsedValues, 99),
      minResponseTime: elapsedValues[0],
      maxResponseTime: elapsedValues[elapsedValues.length - 1],
    };

    const timeSeries: TimeSeriesPoint[] = [];
    const sortedBuckets = Array.from(timeMap.keys()).sort((a, b) => a - b);
    
    for (const bucket of sortedBuckets) {
        const bucketRows = timeMap.get(bucket)!;
        const bCount = bucketRows.length;
        
        const bElapsed = new Float64Array(bCount);
        let bSumElapsed = 0;
        let bSumLatency = 0;
        let bSumConnect = 0;
        let bErrors = 0;
        let bThreadsSum = 0;

        for (let k = 0; k < bCount; k++) {
            const r = bucketRows[k];
            bElapsed[k] = r.elapsed;
            bSumElapsed += r.elapsed;
            bSumLatency += r.Latency;
            bSumConnect += r.Connect;
            bThreadsSum += r.grpThreads;
            if (!r.success) bErrors++;
        }
        bElapsed.sort();

        timeSeries.push({
            time: bucket / 1000,
            readableTime: new Date(startTime + bucket).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            avgElapsed: bSumElapsed / bCount,
            p50: getPercentile(bElapsed, 50),
            p90: getPercentile(bElapsed, 90),
            p95: getPercentile(bElapsed, 95),
            p99: getPercentile(bElapsed, 99),
            throughput: bCount / (bucketSize / 1000),
            errorCount: bErrors,
            totalCount: bCount,
            activeThreads: Math.round(bThreadsSum / bCount),
            avgLatency: bSumLatency / bCount,
            avgConnect: bSumConnect / bCount,
        });
    }

    const labels: LabelStats[] = [];
    for (const [label, lRows] of labelMap) {
        const lCount = lRows.length;
        const lElapsed = new Float64Array(lCount);
        let lSum = 0;
        let lFail = 0;

        for (let k = 0; k < lCount; k++) {
            const r = lRows[k];
            lElapsed[k] = r.elapsed;
            lSum += r.elapsed;
            if (!r.success) lFail++;
        }
        lElapsed.sort();

        labels.push({
            label,
            count: lCount,
            failCount: lFail,
            errorRate: (lFail / lCount) * 100,
            avgElapsed: lSum / lCount,
            minElapsed: lElapsed[0],
            maxElapsed: lElapsed[lCount - 1],
            p50: getPercentile(lElapsed, 50),
            p90: getPercentile(lElapsed, 90),
            p95: getPercentile(lElapsed, 95),
            p99: getPercentile(lElapsed, 99),
            throughput: lCount / duration,
        });
    }

    const errors: ErrorStats[] = [];
    errorMap.forEach((count, message) => {
      errors.push({
        message,
        count,
        percentage: (count / failedRequests.length) * 100
      });
    });
    errors.sort((a, b) => b.count - a.count);

    const responseCodes = Array.from(codeMap.entries()).map(([code, count]) => ({
      code,
      count,
      percentage: (count / totalRequests) * 100
    })).sort((a, b) => b.count - a.count);

    const bucketCount = 20;
    const min = elapsedValues[0];
    const max = elapsedValues[elapsedValues.length - 1];
    const step = (max - min) / bucketCount;
    const distribution = Array(bucketCount).fill(0).map((_, i) => ({
       range: `${Math.round(min + i * step)} - ${Math.round(min + (i + 1) * step)}ms`,
       count: 0
    }));
    
    if (step > 0) {
        for(let i=0; i<elapsedValues.length; i++) {
            const v = elapsedValues[i];
            let bucketIdx = Math.floor((v - min) / step);
            if (bucketIdx >= bucketCount) bucketIdx = bucketCount - 1;
            distribution[bucketIdx].count++;
        }
    }

    return {
      id,
      summary,
      timeSeries,
      labels,
      errors,
      failedRequests: failedRequests.slice(0, 100),
      responseCodes,
      distribution,
      rawRows: normalizedRows
    };
};

export const processData = (file: File, onProgress: (progress: number) => void, skipDetailedAnalysis: boolean = false): Promise<ProcessedData> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        const rows = Array.isArray(json) ? json : (json.testResults || []); 
        const result = analyzeRows(rows, file.name, skipDetailedAnalysis);
        resolve(result);
        return;
      }

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        worker: true, 
        complete: (results) => {
          try {
            const result = analyzeRows(results.data as JmeterRow[], file.name, skipDetailedAnalysis);
            resolve(result);
          } catch (err: any) {
            reject(err);
          }
        },
        error: (err) => {
          reject(new Error(err.message));
        }
      });
    } catch (err: any) {
       reject(new Error("Failed to process file: " + err.message));
    }
  });
};
