import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Code2, Play, Sparkles, Loader2, 
  Wrench, Bug, FileText, Copy, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { API_BASE } from "@/config";

export default function AICode() {
  const { token } = useAuth();
  
  const [code, setCode] = useState("# Paste your code here or ask the AI to generate some!");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const invokeAIGateway = async (action: string) => {
    if (action === 'generate_code' && !aiPrompt.trim()) {
      toast.warning("Please enter a prompt to generate code!");
      return;
    }
    
    if (action !== 'generate_code' && !code.trim()) {
      toast.warning("Please paste some code to analyze/refactor first!");
      return;
    }
    
    setIsAiProcessing(true);
    setAnalysisResult(null);
    toast.info(`AI is processing: ${action.replace('_', ' ')}...`);
    
    try {
      const res = await fetch(`${API_BASE}/ai_agents/agents/invoke/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          agent: "code",
          action: action,
          document_content: code,
          message: aiPrompt
        })
      });

      if (!res.ok) throw new Error("AI Gateway failed");
      const data = await res.json();
      
      let responseText = data.response;
      // Remove generic markdown code block wrapper if present
      if (responseText.startsWith("```")) {
        const lines = responseText.split('\n');
        if (lines[0].startsWith("```")) {
          lines.shift();
        }
        if (lines[lines.length - 1].startsWith("```")) {
          lines.pop();
        }
        responseText = lines.join('\n');
      }

      if (action === 'generate_code' || action === 'refactor_code') {
        setCode(responseText);
        toast.success("Code updated successfully!");
      } else {
        setAnalysisResult(data.response);
        toast.success("Analysis complete");
      }
      
      setAiPrompt("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to AI Gateway");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const clearCode = () => {
    setCode("");
    setAnalysisResult(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white overflow-hidden">
      
      {/* Editor Header */}
      <div className="p-3 border-b border-gray-700 bg-[#2d2d2d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-blue-400" />
          <h3 className="font-semibold text-sm">AI Pair Programmer</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-300 hover:text-white hover:bg-gray-700" onClick={copyToClipboard}>
            <Copy className="h-3 w-3 mr-1.5" /> Copy
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-300 hover:text-red-400 hover:bg-gray-700" onClick={clearCode}>
            <Trash2 className="h-3 w-3 mr-1.5" /> Clear
          </Button>
          <Button size="sm" variant="secondary" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white border-0" disabled>
            <Play className="h-3 w-3 mr-2" /> Run Code (Coming Soon)
          </Button>
        </div>
      </div>

      {/* AI Action Bar */}
      <div className="px-3 py-2 border-b border-gray-700 bg-[#252526] flex items-center gap-2 overflow-x-auto">
        <Badge variant="outline" className="bg-blue-900/30 text-blue-400 border-blue-800 mr-2 shrink-0">
          <Sparkles className="h-3 w-3 mr-1" /> AI Tools
        </Badge>
        
        <Input 
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g. Write a Python script to fetch from API..."
          className="h-8 text-xs w-80 bg-[#3c3c3c] border-gray-600 text-white placeholder-gray-400 focus-visible:ring-blue-500"
          disabled={isAiProcessing}
          onKeyDown={(e) => e.key === "Enter" && invokeAIGateway('generate_code')}
        />
        
        <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-[#3c3c3c] text-gray-300 shrink-0" onClick={() => invokeAIGateway('generate_code')} disabled={isAiProcessing}>
          <FileText className="h-3 w-3 mr-1.5" /> Generate
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-[#3c3c3c] text-gray-300 shrink-0" onClick={() => invokeAIGateway('explain_code')} disabled={isAiProcessing}>
          <Sparkles className="h-3 w-3 mr-1.5" /> Explain
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-[#3c3c3c] text-gray-300 shrink-0" onClick={() => invokeAIGateway('refactor_code')} disabled={isAiProcessing}>
          <Wrench className="h-3 w-3 mr-1.5" /> Refactor
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-[#3c3c3c] text-gray-300 shrink-0" onClick={() => invokeAIGateway('debug_code')} disabled={isAiProcessing}>
          <Bug className="h-3 w-3 mr-1.5" /> Debug
        </Button>
        
        {isAiProcessing && <Loader2 className="h-4 w-4 text-blue-400 animate-spin ml-auto shrink-0" />}
      </div>

      {/* Analysis Result Panel */}
      {analysisResult && (
        <div className="p-4 bg-blue-900/20 text-blue-100 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto border-b border-blue-900/50 font-mono relative">
          <div className="pr-8">{analysisResult}</div>
          <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-xs text-blue-300 hover:text-white hover:bg-blue-800/50" onClick={() => setAnalysisResult(null)}>Close</Button>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 p-0 relative">
        <textarea 
          className="absolute inset-0 w-full h-full p-4 resize-none outline-none font-mono text-sm leading-relaxed bg-transparent text-gray-300"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          disabled={isAiProcessing}
        />
      </div>
      
    </div>
  );
}
