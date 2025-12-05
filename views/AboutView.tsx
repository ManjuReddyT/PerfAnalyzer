import React from 'react';
import { Activity, CheckCircle, BarChart2, Shield, Github, FileText, Zap, Sparkles, Scale, Eye, Save, Settings } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 mb-2">
          <Activity className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">PerfAnalyzer</h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          The professional, privacy-focused performance testing workbench running entirely in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {/* Core Capabilities */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Core Capabilities
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span><strong>Instant Analysis:</strong> Drag & drop multi-gigabyte JTL, CSV, or JSON files to get immediate insights via Web Workers.</span>
            </li>
             <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span><strong>Interactive Dashboards:</strong> Global time-range filtering, configurable APDEX thresholds, and dual-axis load correlation charts.</span>
            </li>
            <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span><strong>Deep Dive Error Inspector:</strong> Inspect full request/response bodies and headers with syntax highlighting.</span>
            </li>
          </ul>
        </div>

        {/* Advanced Features */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Enterprise Features
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
              <Scale className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <span><strong>Baseline Comparison:</strong> Upload a previous run to visualize regressions (red) vs improvements (green) and metric deltas.</span>
            </li>
            <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
              <Settings className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span><strong>Global Configuration:</strong> Toggle features like the AI Chatbot and switch between local (Ollama) or cloud (Gemini) AI providers via the new Settings menu.</span>
            </li>
            <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
              <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0" />
              <span><strong>Hybrid AI Reporting:</strong> Generate executive summaries automatically using Heuristic rules or your configured LLM.</span>
            </li>
             <li className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
              <Save className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <span><strong>Session Preservation:</strong> Save your entire analysis state to a <code>.perf</code> project file.</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Privacy & Security
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed text-sm">
            PerfAnalyzer is designed with a <strong>Local-First</strong> architecture. Your performance data (JTL/CSV files) is processed entirely within your web browser using JavaScript.
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            No data is ever sent to a backend server or third-party cloud unless you explicitly configure a Cloud AI provider (like Google Gemini). If using Ollama, everything remains strictly on your local machine.
          </p>
        </div>

      <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Open Source</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Built with React 19, Recharts, and Tailwind CSS.
        </p>
        <div className="flex justify-center gap-4">
          <a href="#" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors">
            <Github className="w-4 h-4" />
            View Source
          </a>
          <a href="#" className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <FileText className="w-4 h-4" />
            Documentation
          </a>
        </div>
        <p className="text-xs text-slate-400 mt-6">Version 1.3.0</p>
      </div>
    </div>
  );
};