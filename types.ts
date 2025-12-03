
export interface JmeterRow {
  timeStamp: number;
  elapsed: number;
  label: string;
  responseCode: string;
  responseMessage: string;
  threadName: string;
  dataType: string;
  success: boolean | string;
  failureMessage?: string;
  bytes?: number;
  sentBytes?: number;
  grpThreads?: number;
  allThreads?: number;
  URL?: string;
  Latency?: number;
  IdleTime?: number;
  Connect?: number;
  requestHeaders?: string;
  responseHeaders?: string;
  responseBody?: string;
  requestBody?: string;
  [key: string]: any;
}

export interface TestSummary {
  fileName: string;
  totalRequests: number;
  successCount: number;
  failCount: number;
  errorRate: number;
  duration: number; // in seconds
  startTime: number;
  endTime: number;
  throughput: number; // req/sec
  receivedKBytesPerSec: number;
  sentKBytesPerSec: number;
  avgResponseTime: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  minResponseTime: number;
  maxResponseTime: number;
}

export interface TimeSeriesPoint {
  time: number; // Relative time in seconds or timestamp
  readableTime: string;
  avgElapsed: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number; // req/sec
  errorCount: number;
  totalCount: number;
  activeThreads: number;
  avgLatency?: number;
  avgConnect?: number;
}

export interface LabelStats {
  label: string;
  count: number;
  failCount: number;
  errorRate: number;
  avgElapsed: number;
  minElapsed: number;
  maxElapsed: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
}

export interface ErrorStats {
  message: string;
  count: number;
  percentage: number;
}

export interface MetricDiff {
  absolute: number;
  percentage: number;
  isImprovement: boolean;
}

export interface ComparisonAnalysis {
  totalRequests: MetricDiff;
  avgResponseTime: MetricDiff;
  errorRate: MetricDiff;
  throughput: MetricDiff;
  p90: MetricDiff;
  p95: MetricDiff;
  p99: MetricDiff;
}

export interface ProcessedData {
  summary: TestSummary;
  timeSeries: TimeSeriesPoint[];
  labels: LabelStats[];
  errors: ErrorStats[];
  failedRequests: JmeterRow[];
  detailedFailures?: JmeterRow[]; // From optional error file
  responseCodes: { code: string; count: number; percentage: number }[];
  distribution: { range: string; count: number }[]; // For histogram
  rawRows: JmeterRow[];
}

export interface ProjectState {
  version: string;
  timestamp: number;
  mainData: ProcessedData;
  baselineData?: ProcessedData | null;
  thresholds: { responseTime: number; errorRate: number };
  notes?: string;
}
