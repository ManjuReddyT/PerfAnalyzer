

import { ProcessedData } from '../types';
import { GoogleGenAI } from "@google/genai";

export type AnalysisTone = 'standard' | 'critical' | 'executive';
export type AIProvider = 'ollama' | 'gemini' | 'heuristic';

export interface AIConfig {
    provider: AIProvider;
    ollamaUrl?: string;
    ollamaModel?: string;
    geminiKey?: string;
}

// --- Helper: Prompt Construction ---
const constructPrompt = (data: ProcessedData, tone: AnalysisTone): string => {
    // Prepare compact context to avoid token limits
    const context = {
        summary: data.summary,
        apdexScore: data.summary.apdex.toFixed(2),
        topErrors: data.errors.slice(0, 5),
        slowestTransactions: [...data.labels].sort((a,b) => b.avgElapsed - a.avgElapsed).slice(0, 5).map(l => ({
            label: l.label, avg: l.avgElapsed, p95: l.p95, errorRate: l.errorRate
        })),
        scalabilityHint: data.capacitySeries.length > 0 ? "Check capacitySeries for knee of curve" : "No thread data"
    };

    const systemPrompt = `You are a Senior Performance Engineer. Analyze the provided JMeter test results JSON. 
    Output a professional report section in Markdown format.
    Focus on: User Satisfaction (APDEX), Root cause of errors, performance bottlenecks, and scalability recommendations.
    Do not output conversational text, just the report body.`;

    let userPrompt = `Analyze this data.`;
    if (tone === 'executive') {
        userPrompt = `Write a high-level Executive Summary for a CTO. Focus on business risk, APDEX Score (User Satisfaction), overall system health (Stable/Degraded), and key recommendations. Be concise. Data: ${JSON.stringify(context)}`;
    } else if (tone === 'critical') {
        userPrompt = `Write a Critical Analysis focused on failures and bottlenecks. Be direct and highlight specific transactions or errors that need fixing. Analyze APDEX score. Data: ${JSON.stringify(context)}`;
    } else {
        userPrompt = `Write a Standard Performance Report summarizing throughput, latency, reliability and User Satisfaction (APDEX). Data: ${JSON.stringify(context)}`;
    }

    return `${systemPrompt}\n\n${userPrompt}`;
};

// --- Local Heuristic Engine (Offline AI) ---
// Generates a mathematical, rule-based summary when GenAI is unavailable.
const generateHeuristicSummary = (data: ProcessedData, tone: AnalysisTone): string => {
  const { summary, errors, labels } = data;
  const errorRate = summary.errorRate;
  const p90 = summary.p90;
  const apdex = summary.apdex;
  
  // 1. Overall Health Assessment
  let health = "Stable";
  let healthDesc = "The system performed within acceptable parameters.";
  if (errorRate > 5 || apdex < 0.70) {
      health = "Critical";
      healthDesc = `The system experienced significant instability with a ${errorRate.toFixed(2)}% error rate and poor user satisfaction (APDEX ${apdex.toFixed(2)}).`;
  } else if (errorRate > 1 || p90 > 2000 || apdex < 0.85) {
      health = "Degraded";
      healthDesc = "The system showed signs of performance degradation.";
  }

  // 2. Performance Bottlenecks
  const slowestTx = [...labels].sort((a, b) => b.avgElapsed - a.avgElapsed).slice(0, 3);
  const bottlenecks = slowestTx.map(l => `- **${l.label}**: Avg ${Math.round(l.avgElapsed)}ms (Max ${l.maxElapsed}ms)`).join('\n');

  // 3. Error Analysis
  const topErrors = errors.slice(0, 3);
  let errorSummary = "No significant errors were recorded.";
  if (topErrors.length > 0) {
      errorSummary = `Primary sources of failure:\n${topErrors.map(e => `- ${e.message} (${e.count} occurrences)`).join('\n')}`;
  }

  // 4. Tone Adjustment
  let text = "";

  if (tone === 'executive') {
      text = `## Executive Summary
**Test Status:** ${health.toUpperCase()}
**APDEX Score:** ${apdex.toFixed(2)} / 1.00
**Duration:** ${(summary.duration / 60).toFixed(1)} minutes
**Total Throughput:** ${Math.round(summary.totalRequests).toLocaleString()} requests processed.

${healthDesc}

### Key Findings
1. **User Experience:** APDEX score of ${apdex.toFixed(2)} indicates ${apdex > 0.94 ? 'Excellent' : apdex > 0.85 ? 'Good' : 'Poor'} user satisfaction.
2. **Reliability:** Success rate of ${(100 - errorRate).toFixed(2)}%.
3. **Performance:** 90% of requests completed within ${Math.round(p90)}ms.
4. **Bottlenecks:** The transaction '${slowestTx[0]?.label || 'N/A'}' requires optimization.

### Recommendation
${errorRate > 1 ? "Immediate investigation into error causes is recommended." : "System is ready for production load based on these metrics."}`;

  } else if (tone === 'critical') {
      text = `## CRITICAL INCIDENT REPORT
**Status:** ${health}
**APDEX:** ${apdex.toFixed(2)} (Target: >0.94)
**Error Rate:** ${errorRate.toFixed(2)}% (${summary.failCount} failed requests)

### Failure Analysis
${errorSummary}

### Performance Violations
The following transactions exhibited the highest latency:
${bottlenecks}

### Action Items
- Investigate logs for '${topErrors[0]?.message?.substring(0, 50) || 'N/A'}'
- Optimize database queries for ${slowestTx[0]?.label || 'slow transactions'}
- Review infrastructure scaling policies.`;

  } else {
      // Standard Tone
      text = `## Performance Test Analysis
**Overview:**
The test run conducted on ${summary.fileName} lasted for ${(summary.duration / 60).toFixed(1)} minutes with a total load of ${summary.totalRequests} requests.

**Performance Metrics:**
- **APDEX Score:** ${apdex.toFixed(2)}
- **Throughput:** ${summary.throughput.toFixed(1)} req/sec
- **Avg Response Time:** ${Math.round(summary.avgResponseTime)}ms
- **P90:** ${Math.round(p90)}ms

**Top Slowest Transactions:**
${bottlenecks}

**Reliability:**
${errorSummary}

**Conclusion:**
${healthDesc} ${errorRate < 1 ? "Performance is acceptable." : "Optimization is needed to reduce error rates."}`;
  }

  return text;
};

// --- Ollama Engine (Local LLM) ---
const generateOllamaSummary = async (data: ProcessedData, tone: AnalysisTone, config: AIConfig): Promise<string> => {
    const url = config.ollamaUrl || 'http://localhost:11434';
    const model = config.ollamaModel || 'llama3';
    const prompt = constructPrompt(data, tone);

    try {
        const response = await fetch(`${url}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}. Ensure Ollama is running with OLLAMA_ORIGINS="*"`);
        }

        const json = await response.json();
        return json.response;

    } catch (error: any) {
        console.error("Ollama API Error:", error);
        return `**AI Generation Failed**: ${error.message}\n\nFalling back to heuristic analysis:\n\n` + generateHeuristicSummary(data, tone);
    }
};

// --- Gemini GenAI Engine (Cloud) ---
const generateGeminiSummary = async (data: ProcessedData, tone: AnalysisTone, config: AIConfig): Promise<string> => {
    const apiKey = config.geminiKey || process.env.API_KEY;

    if (!apiKey) {
        return generateHeuristicSummary(data, tone);
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Prepare compact context to avoid token limits
        const context = {
            summary: data.summary,
            apdex: data.summary.apdex,
            topErrors: data.errors.slice(0, 5),
            slowestTransactions: [...data.labels].sort((a,b) => b.avgElapsed - a.avgElapsed).slice(0, 5).map(l => ({
                label: l.label, avg: l.avgElapsed, p95: l.p95, errorRate: l.errorRate
            }))
        };

        const systemPrompt = `You are a Senior Performance Engineer. Analyze the provided JMeter test results JSON. 
        Output a professional report section in Markdown format.
        Focus on: APDEX Score (User Satisfaction), Root cause of errors, performance bottlenecks, and scalability recommendations.
        Do not output conversational text, just the report body.`;

        let userPrompt = `Analyze this data.`;
        if (tone === 'executive') {
            userPrompt = `Write a high-level Executive Summary for a CTO. Focus on business risk, APDEX score, overall system health (Stable/Degraded), and key recommendations. Be concise. Data: ${JSON.stringify(context)}`;
        } else if (tone === 'critical') {
            userPrompt = `Write a Critical Analysis focused on failures and bottlenecks. Be direct and highlight specific transactions or errors that need fixing. Data: ${JSON.stringify(context)}`;
        } else {
            userPrompt = `Write a Standard Performance Report summarizing throughput, latency, and reliability. Data: ${JSON.stringify(context)}`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
            ]
        });

        return response.text || "AI generation returned empty response.";

    } catch (error) {
        console.error("Gemini API Error:", error);
        return generateHeuristicSummary(data, tone) + "\n\n*(Note: AI generation failed, fell back to local analysis)*";
    }
};

// Main Export
export const generateInsights = async (data: ProcessedData, tone: AnalysisTone, config?: AIConfig): Promise<string> => {
    const provider = config?.provider || 'ollama';

    if (provider === 'ollama') {
        return await generateOllamaSummary(data, tone, config || { provider: 'ollama' });
    } else if (provider === 'gemini') {
        return await generateGeminiSummary(data, tone, config || { provider: 'gemini' });
    } else {
        // Local Heuristic fallback
        return new Promise(resolve => {
            setTimeout(() => resolve(generateHeuristicSummary(data, tone)), 600);
        });
    }
};
