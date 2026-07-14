import React, { useState } from 'react';
import { API_BASE } from "@/config";
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, X, Send, Minimize2, Maximize2 } from 'lucide-react';

const AIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: 'Hello! How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');

  const { token } = useAuth(); // Need token for API calls
  
  // FALLBACK ENGINE (Copied from main AIAssistant to keep the widget smart!)
  const generateFallbackResponse = (userMessage: string, liveContext: any) => {
    const query = userMessage.toLowerCase();
    if (!liveContext) return "No data found.";

    if (query.includes("task") || query.includes("todo")) {
      const tasks = liveContext.tasks || [];
      if (tasks.length === 0) return "No tasks found.";
      let response = "";
      tasks.slice(0, 5).forEach((t: any) => { response += `- ${t.title} [Priority: ${t.priority}]\n`; });
      return response.trim();
    }
    if (query.includes("meet") || query.includes("calendar") || query.includes("schedule")) {
      const meetings = liveContext.meetings || [];
      if (meetings.length === 0) return "No meetings found.";
      let response = "";
      meetings.slice(0, 3).forEach((m: any) => { response += `- ${m.title} (${m.duration})\n  Date: ${new Date(m.time).toLocaleString()}\n`; });
      return response.trim();
    }
    if (query.includes("leave") || query.includes("balance") || query.includes("vacation")) {
      const balance = liveContext.hr?.leaveBalance || 0;
      return `Leave balance: ${balance} days.`;
    }
    if (query.includes("hr") || query.includes("approval") || query.includes("pending") || query.includes("request")) {
      const requests = liveContext.hr?.pendingApprovals || [];
      if (requests.length === 0) return "No HR requests found.";
      
      let response = "";
      requests.forEach((r: any) => { response += `- ${r.title} (${r.type})\n`; });
      return response.trim();
    }
    if (query.includes("lead") || query.includes("sales") || query.includes("deal") || query.includes("pipeline")) {
      const leads = liveContext.leads || [];
      if (leads.length === 0) return "No leads found.";
      let response = "";
      leads.slice(0, 3).forEach((l: any) => { response += `- ${l.title} (${l.status})\n`; });
      return response.trim();
    }
    if (query.includes("docs") || query.includes("knowledge") || query.includes("api") || query.includes("standard") || query.includes("policy") || query.includes("deploy")) {
      const articles = liveContext.knowledge || [];
      if (articles.length === 0) return "No articles found.";
      let response = "";
      articles.slice(0, 3).forEach((a: any) => { response += `- ${a.title}\n  ${a.excerpt}\n`; });
      return response.trim();
    }

    return "Please ask about tasks, meetings, leave balance, leads, or knowledge base.";
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    
    // Attempt to fetch context and use Fallback Engine
    try {
      let liveContext = null;
      if (token) {
        const res = await fetch(`${API_BASE}/myday/ai-context/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) liveContext = await res.json();
      }
      
      const fallbackMsg = generateFallbackResponse(userMsg, liveContext);
      setMessages(prev => [...prev, { role: 'ai', text: fallbackMsg }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Network error fetching context." }]);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl transition-transform hover:scale-110 z-50 p-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700"
      >
        <Bot size={28} className="text-white" />
      </Button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 transition-all duration-300 ${isMinimized ? 'h-16 w-72' : 'h-[500px] w-80 sm:w-96'} border border-gray-200 dark:border-gray-700`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-indigo-600 p-4 text-white cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center space-x-2">
          <Bot size={20} />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <div className="flex space-x-2">
          <button className="hover:text-gray-200 transition-colors" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button className="hover:text-gray-200 transition-colors" onClick={(e) => { 
            e.stopPropagation(); 
            setIsOpen(false); 
            setMessages([{ role: 'ai', text: 'Hello! How can I assist you today?' }]);
          }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Chat Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          
          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSend} className="flex items-center space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border-gray-300 dark:border-gray-600 focus-visible:ring-indigo-500 rounded-full"
              />
              <Button type="submit" size="icon" className="rounded-full bg-indigo-600 hover:bg-indigo-700 h-10 w-10 shrink-0">
                <Send size={18} />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistantWidget;
