import { useState } from "react";
import {
  Bot,
  Sparkles,
  Mic,
  Paperclip,
  Send,
  MessageSquare,
  FileText,
  Table,
  Presentation,
  Code2,
  Video,
  ChevronDown,
  TrendingUp,
  Clock,
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

export default function AIAgents() {
  const navigate = useNavigate();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#FDFDFD] p-6 animate-fade-in">
      
      {/* AI Assistant Available Now */}
      <Card className="max-w-xl w-full mb-10 shadow-md border-indigo-100 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/ai/assistant')}>
        <CardContent className="p-6 flex items-center gap-6">
          <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-800">AI Assistant</h2>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">Available Now</span>
            </div>
            <p className="text-slate-500 text-sm">
              Your intelligent chat assistant connected to all tasks, meetings, knowledge base, courses, and HR requests.
            </p>
          </div>
          <Button variant="ghost" className="shrink-0 rounded-full h-10 w-10 p-0 text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* AI Agents Coming Soon */}
      <div className="max-w-md w-full text-center flex flex-col items-center opacity-80">
        <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200">
          <Sparkles className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">
          Autonomous AI Agents
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          We are working hard to bring you powerful specialized AI Agents (Docs, Sheets, Code, Meetings) to automate your workflow. This feature is coming soon!
        </p>
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide">
          <Clock className="h-3.5 w-3.5" />
          Coming Soon
        </div>
      </div>
    </div>
  );
}
