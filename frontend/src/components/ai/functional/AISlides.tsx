import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Presentation, Save, Sparkles, FilePlus2, 
  Loader2, Download, RefreshCw, ChevronLeft, ChevronRight, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { API_BASE } from "@/config";

type Slide = {
  title: string;
  content: string[];
};

export default function AISlides() {
  const { token } = useAuth();
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([{ title: "New Presentation", content: ["Add a prompt below and click Generate Presentation"] }]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Existing Presentations (we just load all docs for now)
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/docs/documents/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0 && !currentDoc) {
          selectDocument(data[0]);
        } else if (data.length === 0) {
          createNewDocument();
        }
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  };

  useEffect(() => {
    if (token) fetchDocuments();
  }, [token]);

  // 2. Document Switcher & Creator
  const selectDocument = (doc: any) => {
    setCurrentDoc(doc);
    setTitle(doc.title);
    try {
      const parsed = JSON.parse(doc.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSlides(parsed);
      } else {
        throw new Error();
      }
    } catch {
      setSlides([{ title: doc.title, content: ["No valid slides found."] }]);
    }
    setActiveSlideIndex(0);
  };

  const createNewDocument = async () => {
    try {
      const defaultSlides = [{ title: "Untitled Presentation", content: ["Let's start building!"] }];
      const res = await fetch(`${API_BASE}/docs/documents/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Untitled Presentation",
          content: JSON.stringify(defaultSlides),
        })
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocuments([newDoc, ...documents]);
        selectDocument(newDoc);
        toast.success("New presentation created");
      }
    } catch (err) {
      toast.error("Failed to create presentation");
    }
  };

  // 3. Autosave Logic (Hits Legacy API)
  const saveDocument = async (t: string, currentSlides: Slide[]) => {
    if (!currentDoc) return;
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/docs/documents/${currentDoc.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: t, content: JSON.stringify(currentSlides) })
      });
    } catch (err) {
      console.error("Autosave failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutosave(newTitle, slides);
    setDocuments(docs => docs.map(d => d.id === currentDoc?.id ? { ...d, title: newTitle } : d));
  };

  const triggerAutosave = (t: string, currentSlides: Slide[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDocument(t, currentSlides), 1500);
  };

  // 4. AI Gateway Integration (Hits ai_agents API)
  const invokeAIGateway = async (action: string) => {
    if (!aiPrompt.trim()) {
      toast.warning("Please enter a topic or prompt for the presentation!");
      return;
    }
    
    setIsAiProcessing(true);
    toast.info(`AI is generating your presentation...`);
    
    try {
      const res = await fetch(`${API_BASE}/ai_agents/agents/invoke/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          agent: "slides",
          action: action,
          message: aiPrompt
        })
      });

      if (!res.ok) throw new Error("AI Gateway failed");
      const data = await res.json();
      
      try {
        const generatedSlides = JSON.parse(data.response);
        if (Array.isArray(generatedSlides) && generatedSlides.length > 0) {
          setSlides(generatedSlides);
          setActiveSlideIndex(0);
          triggerAutosave(title, generatedSlides);
          toast.success("Presentation generated successfully!");
        } else {
          throw new Error("Invalid format");
        }
      } catch (parseError) {
        toast.error("AI returned an invalid format. Please try again.");
        console.error("Failed to parse AI slides response", data.response);
      }
      
      setAiPrompt("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to AI Gateway");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const exportDocument = () => {
    const blob = new Blob([JSON.stringify(slides, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'presentation'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Presentation exported as JSON");
  };

  const activeSlide = slides[activeSlideIndex] || { title: "", content: [] };

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 bg-slate-50/50">
      {/* Sidebar: Document List */}
      <div className="hidden md:flex flex-col w-64 shrink-0 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
            <Presentation className="h-4 w-4 text-orange-500" />
            My Decks
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createNewDocument}>
            <FilePlus2 className="h-4 w-4 text-orange-500" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {documents.map(doc => (
              <div 
                key={doc.id}
                onClick={() => selectDocument(doc)}
                className={`p-2 text-sm rounded-md cursor-pointer truncate transition-colors ${
                  currentDoc?.id === doc.id ? "bg-orange-500/10 text-orange-700 font-medium" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                {doc.title || "Untitled"}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Editor */}
      <Card className="flex-1 flex flex-col shadow-sm border border-slate-200 bg-white overflow-hidden">
        
        {/* Editor Toolbar */}
        <div className="p-3 border-b border-border flex items-center justify-between bg-slate-50/50 flex-wrap gap-2">
          <input 
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="font-bold text-lg bg-transparent border-none outline-none flex-1 min-w-[200px] text-slate-800 placeholder-slate-400"
            placeholder="Presentation Title"
          />
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground mr-2 flex items-center gap-1">
              {isSaving ? <><RefreshCw className="h-3 w-3 animate-spin"/> Saving...</> : <><Save className="h-3 w-3"/> Saved</>}
            </span>
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white" onClick={exportDocument}>
              <Download className="h-3 w-3 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        {/* AI Action Bar */}
        <div className="px-3 py-2 border-b border-border bg-orange-50/50 flex items-center gap-2 overflow-x-auto">
          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 mr-2 shrink-0">
            <Sparkles className="h-3 w-3 mr-1" /> AI Prompter
          </Badge>
          <Input 
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Generate a Q3 Sales Presentation..."
            className="h-8 text-xs w-80 bg-white"
            disabled={isAiProcessing}
          />
          <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-orange-100 hover:text-orange-700 shrink-0" onClick={() => invokeAIGateway('generate_presentation')} disabled={isAiProcessing}>
            <Presentation className="h-3 w-3 mr-1.5" /> Generate Deck
          </Button>
          {isAiProcessing && <Loader2 className="h-4 w-4 text-orange-500 animate-spin ml-auto shrink-0" />}
        </div>

        {/* Slides Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Thumbnails */}
          <div className="w-48 bg-slate-100/50 border-r border-slate-200 p-2 overflow-y-auto space-y-2">
            {slides.map((slide, idx) => (
              <div 
                key={idx} 
                onClick={() => setActiveSlideIndex(idx)}
                className={`aspect-video rounded border cursor-pointer flex flex-col p-2 text-xs transition-colors ${idx === activeSlideIndex ? 'border-orange-500 bg-white shadow-sm ring-1 ring-orange-500/50' : 'border-slate-300 bg-slate-50 hover:bg-white'}`}
              >
                <div className="font-semibold text-slate-700 truncate">{idx + 1}. {slide.title}</div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">{slide.content.length} bullets</div>
              </div>
            ))}
          </div>
          
          {/* Main Slide View */}
          <div className="flex-1 p-8 bg-slate-200/50 flex flex-col items-center justify-center relative">
            <div className="bg-white border shadow-md w-full max-w-3xl aspect-video rounded-xl flex flex-col items-center justify-center p-12 text-center relative transition-all duration-300">
              <h1 className="text-4xl font-bold mb-8 text-slate-800">{activeSlide.title}</h1>
              <ul className="text-slate-600 text-lg space-y-4 text-left max-w-xl mx-auto list-disc pl-6">
                {activeSlide.content.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
            
            {/* Controls */}
            <div className="absolute bottom-4 flex items-center gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))} disabled={activeSlideIndex === 0}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium text-slate-600">Slide {activeSlideIndex + 1} of {slides.length}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))} disabled={activeSlideIndex === slides.length - 1}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
