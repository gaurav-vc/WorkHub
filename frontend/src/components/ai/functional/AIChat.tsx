import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Bot, Send, CheckSquare, ClipboardList, BookOpen, TrendingUp, User, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { aiAgents, aiSuggestedPrompts } from "@/config/ai-config";

import { API_BASE } from "@/config";

const agentIcons: Record<string, React.ReactNode> = {
  task: <CheckSquare className="h-4 w-4" />,
  hr: <ClipboardList className="h-4 w-4" />,
  knowledge: <BookOpen className="h-4 w-4" />,
  sales: <TrendingUp className="h-4 w-4" />,
};

const agentColors: Record<string, string> = {
  task: "bg-primary/10 text-primary",
  hr: "bg-success/10 text-success",
  knowledge: "bg-info/10 text-info",
  sales: "bg-warning/10 text-warning",
};

interface Message {
  role: "user" | "assistant";
  message: string;
}

export default function AIChat() {
  const [activeAgent, setActiveAgent] = useState("task");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  const { token } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const agent = aiAgents.find((a) => a.id === activeAgent) || aiAgents[0];
  const suggestions = aiSuggestedPrompts[activeAgent] || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    // Reset chat when switching agents
    setMessages([]);
    setConversationId(null);
  }, [activeAgent]);

  const handleSend = async (textToUse?: string) => {
    const userMessage = textToUse || prompt;
    if (!userMessage.trim() || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", message: userMessage.trim() }]);
    setPrompt("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai_agents/agents/invoke/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          agent: activeAgent,
          message: userMessage.trim(),
          conversation_id: conversationId
        })
      });

      if (!res.ok) {
        throw new Error("Failed to connect to AI Gateway");
      }

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect to AI Gateway");
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      setMessages((prev) => [...prev, { role: "assistant", message: data.response }]);
      
    } catch (error: any) {
      console.error("AI Gateway Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", message: error.message || "Sorry, I am having trouble connecting to the AI Gateway right now. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex gap-4 min-h-0 bg-slate-50/50 p-4">
      <div className="hidden md:flex flex-col w-56 shrink-0 space-y-2">
        {aiAgents.map((a) => (
          <Card
            key={a.id}
            onClick={() => setActiveAgent(a.id)}
            className={`cursor-pointer transition-all shadow-sm hover:shadow-md ${
              activeAgent === a.id ? "ring-2 ring-primary border-primary bg-white" : "bg-white"
            }`}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${agentColors[a.id] || "bg-primary/10 text-primary"}`}>
                {agentIcons[a.id] || <Bot className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{a.name}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{a.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1 flex flex-col shadow-sm border border-slate-200 bg-white min-h-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-slate-50/50">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${agentColors[activeAgent] || "bg-primary/10 text-primary"}`}>
            {agentIcons[activeAgent] || <Bot className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
            <p className="text-[11px] text-muted-foreground">{agent.description}</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 animate-fade-in">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl gradient-primary mb-4 shadow-lg">
                  <Bot className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Hi! I'm your {agent.name}</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  I am securely connected to your live CollabHub Database via the new AI Gateway! Ask me anything about your tasks, meetings, or records.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : "animate-fade-in"}`}>
                <Avatar className="h-8 w-8 shrink-0 shadow-sm">
                  <AvatarFallback className={`text-xs font-semibold ${
                    msg.role === "assistant" ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}>
                    {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "gradient-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 border border-border text-foreground rounded-tl-sm"
                }`}>
                  {msg.message}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3 animate-fade-in">
                <Avatar className="h-8 w-8 shrink-0 shadow-sm">
                  <AvatarFallback className="text-xs font-semibold gradient-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted/50 border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Reasoning...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-3 border-t border-border bg-slate-50/50">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                disabled={isLoading}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border/50 bg-white hover:border-primary/50 hover:text-primary transition-all text-muted-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Ask ${agent.name}...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
              className="flex-1 bg-white shadow-sm"
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={isLoading || !prompt.trim()}
              className="h-10 w-10 shrink-0 gradient-primary text-primary-foreground shadow-sm transition-all hover:scale-105"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
