
export const generateSampleData = (type: 'current' | 'baseline' = 'current'): File => {
  const headers = [
    "timeStamp", "elapsed", "label", "responseCode", "responseMessage", 
    "threadName", "dataType", "success", "bytes", "sentBytes", "grpThreads", 
    "allThreads", "URL", "Latency", "Connect"
  ].join(",");

  const rows: string[] = [];
  const now = Date.now();
  // If baseline, pretend it was run 24 hours ago
  const startTime = type === 'current' ? now - (15 * 60 * 1000) : now - (24 * 60 * 60 * 1000) - (15 * 60 * 1000); 
  const totalRequests = 1500;
  
  // Baseline is slightly faster (so Current looks like a regression in some areas)
  // or Baseline is slower (Improvement). Let's mix it.
  // Multiplier: If type is baseline, we might make it 0.8x (faster) or 1.2x (slower)
  // Let's make Current run SLOWER (1.2x) than Baseline to show Red alerts (Regression)
  const performanceMultiplier = type === 'baseline' ? 0.85 : 1.0; 

  const scenarios = [
    { label: "01_Login", weight: 0.1, min: 200, max: 500, errorRate: 0.01 },
    { label: "02_SearchItems", weight: 0.4, min: 50, max: 300, errorRate: 0.005 },
    { label: "03_ViewItem", weight: 0.3, min: 100, max: 400, errorRate: 0.00 },
    { label: "04_AddToCart", weight: 0.15, min: 300, max: 800, errorRate: 0.02 },
    { label: "05_Checkout", weight: 0.05, min: 800, max: 2500, errorRate: 0.05 }
  ];

  for (let i = 0; i < totalRequests; i++) {
    const progress = i / totalRequests;
    const currentTimestamp = startTime + (progress * 15 * 60 * 1000); // spread over 15 mins
    
    // Pick scenario based on weight
    const rand = Math.random();
    let cumulativeWeight = 0;
    let scenario = scenarios[0];
    for (const s of scenarios) {
      cumulativeWeight += s.weight;
      if (rand <= cumulativeWeight) {
        scenario = s;
        break;
      }
    }

    // Simulate response time (elapsed)
    let baseElapsed = Math.floor(Math.random() * (scenario.max - scenario.min + 1)) + scenario.min;
    
    // Apply multiplier based on dataset type
    let elapsed = Math.floor(baseElapsed * performanceMultiplier);

    if (Math.random() > 0.98) elapsed *= 3; // 2% chance of spike

    // Simulate Success/Error
    // Baseline has fewer errors
    const errorChance = type === 'baseline' ? scenario.errorRate * 0.5 : scenario.errorRate;
    const isError = Math.random() < errorChance;
    const success = !isError;
    const responseCode = success ? "200" : (Math.random() > 0.5 ? "500" : "503");
    const responseMessage = success ? "OK" : (responseCode === "500" ? "Internal Server Error" : "Service Unavailable");

    // Network metrics
    const connect = Math.floor(Math.random() * 20);
    const latency = Math.floor(elapsed * 0.8) - connect;
    const bytes = 500 + Math.floor(Math.random() * 2000);
    
    const activeThreads = i < 200 ? Math.floor(i / 10) : 20;

    const row = [
      currentTimestamp,
      elapsed,
      scenario.label,
      responseCode,
      responseMessage,
      `Thread Group 1-${(i % activeThreads) + 1}`,
      "text",
      success,
      bytes,
      0, // sentBytes
      activeThreads,
      activeThreads,
      "http://example.com/api",
      latency,
      connect
    ].join(",");

    rows.push(row);
  }

  const csvContent = [headers, ...rows].join('\n');

  const fileName = type === 'current' ? "sample_current_run.csv" : "sample_baseline_run.csv";
  return new File([csvContent], fileName, { type: "text/csv" });
};
