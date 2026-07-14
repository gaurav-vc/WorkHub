import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  User,
  Loader2,
  Trash2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

const GEMINI_API_KEY = "AIzaSyDEBCktsKtkbeVqYcL3rxS9U1Vs9n5FKEA";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export default function AIAssistant() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Summarize my tasks for today",
    "Draft an email to the HR department",
    "What are the best practices for remote work?",
    "Help me write a Python script"
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || prompt.trim();
    if (!textToSend) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", text: textToSend }];
    setMessages(newMessages);
    setPrompt("");
    setIsLoading(true);

    try {
      // Convert our messages to Gemini format
      const contents = newMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          systemInstruction: {
            parts: [{ text: "You are WorkHub AI, a helpful, professional, and intelligent workspace assistant. You have access to the company's Tasks, Meetings (MOM), Knowledge Base, Learning Center Courses, and HR Requests. Help the user manage their work, answer questions, draft documents, and navigate their portal efficiently." }]
          },
          contents 
        })
      });

      if (!res.ok) {
        throw new Error("Failed to communicate with AI");
      }

      const data = await res.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (aiResponse) {
        setMessages(prev => [...prev, { role: "model", text: aiResponse }]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not reach AI Assistant.", variant: "destructive" });
      // Remove the user message if it failed so they can try again? No, leave it for context
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            WorkHub AI
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Powered by Gemini. Your intelligent workspace assistant.</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Clear Chat
          </Button>
        )}
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Area */}
        <Card className="flex-1 flex flex-col shadow-card min-h-0 border-indigo-100">
          {/* Agent Banner */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-indigo-50/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Gemini Assistant</h3>
              <p className="text-xs text-slate-500 font-medium">Always here to help</p>
            </div>
            <Badge className="ml-auto bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none shadow-none">Online</Badge>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 bg-slate-50/50">
            <div className="space-y-6">
              {/* Welcome */}
              {messages.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-xl shadow-indigo-500/10 mb-6 border border-indigo-50">
                    <Sparkles className="h-10 w-10 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-slate-800 mb-2">How can I help you today?</h3>
                  <p className="text-slate-500 max-w-md mx-auto text-sm">
                    I can help you draft emails, summarize long documents, brainstorm ideas, and navigate your workspace.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 w-full max-w-lg">
                    {suggestions.map((s, i) => (
                      <Card 
                        key={i} 
                        className="cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors shadow-sm"
                        onClick={() => handleSend(s)}
                      >
                        <CardContent className="p-3 text-sm text-slate-600 font-medium text-center">
                          {s}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 shrink-0 shadow-sm">
                    <AvatarFallback className={`text-xs font-semibold ${
                      msg.role === "model" ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}>
                      {msg.role === "model" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-slate-800 text-white rounded-tr-sm"
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm whitespace-pre-wrap"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 bg-white border-t border-border">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
              <Input
                placeholder="Ask WorkHub AI anything..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-slate-700"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={isLoading || !prompt.trim()}
                className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2">
              WorkHub AI can make mistakes. Consider verifying important information.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
