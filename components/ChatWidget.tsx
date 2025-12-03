
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, Minimize2, Loader2, HardDrive, Cloud } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ProcessedData } from '../types';
import { AIConfig } from '../utils/aiAnalytics';

interface ChatWidgetProps {
  contextData?: ProcessedData | null;
  config: AIConfig;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ contextData, config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Hello! I am your PerfAnalyzer assistant. How can I help you interpret your test results today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Helper for formatting duration
  const formatDuration = (seconds: number): string => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
  };

  const getSystemContext = () => {
      let systemInstruction = "You are a helpful assistant for PerfAnalyzer. Help the user understand their test results, identify bottlenecks, and answer questions about JMeter and performance metrics. Keep answers concise and professional.";
      
      if (contextData) {
          const summary = contextData.summary;
          const context = `
Context Data:
- File: ${summary.fileName}
- Duration: ${formatDuration(summary.duration)}
- Requests: ${summary.totalRequests}
- Avg Response: ${summary.avgResponseTime.toFixed(0)}ms
- P90: ${summary.p90.toFixed(0)}ms
- Error Rate: ${summary.errorRate.toFixed(2)}%
- Throughput: ${summary.throughput.toFixed(1)} req/s
          `;
          systemInstruction += `\n\n${context}`;
      }
      return systemInstruction;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        if (config.provider === 'gemini') {
            await handleGeminiChat(userMessage);
        } else if (config.provider === 'ollama') {
            await handleOllamaChat(userMessage);
        } else {
             setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "AI features are currently disabled or set to Heuristic. Please select Ollama or Gemini in Settings." }]);
        }
    } catch (error: any) {
        console.error("Chat Error:", error);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `Error: ${error.message || "Failed to connect to AI provider."}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGeminiChat = async (userMessage: Message) => {
      if (!config.geminiKey) throw new Error("Gemini API Key missing.");

      const ai = new GoogleGenAI({ apiKey: config.geminiKey });
      
      const history = messages.filter(m => m.id !== '1').map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const chatSession = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: getSystemContext() },
        history: history
      });

      const resultStream = await chatSession.sendMessageStream({ message: userMessage.text });
      
      let fullResponse = "";
      const modelMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

      for await (const chunk of resultStream) {
          if (chunk.text) {
            fullResponse += chunk.text;
            setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: fullResponse } : m));
          }
      }
  };

  const handleOllamaChat = async (userMessage: Message) => {
      const url = config.ollamaUrl || 'http://localhost:11434';
      const model = config.ollamaModel || 'llama3';

      const historyMessages = messages.filter(m => m.id !== '1').map(m => ({
            role: m.role === 'model' ? 'assistant' : 'user',
            content: m.text
      }));

      const payload = {
          model: model,
          messages: [
              { role: 'system', content: getSystemContext() },
              ...historyMessages,
              { role: 'user', content: userMessage.text }
          ],
          stream: false
      };

      const response = await fetch(`${url}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);

      const data = await response.json();
      const modelMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: data.message?.content || "No response." }]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-110 z-50 flex items-center gap-2"
        aria-label="Open AI Chat"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="font-semibold hidden sm:inline">Ask AI</span>
      </button>
    );
  }

  const isConfigValid = config.provider === 'ollama' ? !!config.ollamaUrl : (config.provider === 'gemini' ? !!config.geminiKey : false);

  return (
    <div className="fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div>
                <h3 className="font-bold text-sm">PerfAnalyzer Assistant</h3>
                <div className="flex items-center gap-1 text-[10px] opacity-80">
                    {config.provider === 'ollama' ? <HardDrive className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                    <span>{config.provider === 'ollama' ? `Local: ${config.ollamaModel}` : (config.provider === 'gemini' ? 'Gemini Cloud' : 'Disabled')}</span>
                </div>
            </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-indigo-500 rounded transition-colors">
            <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
        {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
            </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        {!isConfigValid && config.provider !== 'heuristic' ? (
            <div className="text-xs text-center text-amber-600 dark:text-amber-500 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                Configuration missing. Please check Settings.
            </div>
        ) : (
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={config.provider === 'ollama' ? "Ask local AI..." : "Ask..."}
                    className="flex-1 px-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
