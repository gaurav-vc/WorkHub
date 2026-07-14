import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  FileText, Save, Sparkles, Languages, Type, 
  List, Loader2, RefreshCw, FilePlus2, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

import { API_BASE } from "@/config";

export default function AIDocs() {
  const { token } = useAuth();
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Existing Documents from Legacy API
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
    setContent(doc.content || "");
  };

  const createNewDocument = async () => {
    try {
      const res = await fetch(`${API_BASE}/docs/documents/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Untitled AI Document",
          content: "# Start typing here...",
        })
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocuments([newDoc, ...documents]);
        selectDocument(newDoc);
        toast.success("New document created");
      }
    } catch (err) {
      toast.error("Failed to create document");
    }
  };

  // 3. Autosave Logic (Hits Legacy API)
  const saveDocument = async (t: string, c: string) => {
    if (!currentDoc) return;
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/docs/documents/${currentDoc.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: t, content: c })
      });
    } catch (err) {
      console.error("Autosave failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDocument(title, newContent), 1500);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDocument(newTitle, content), 1500);
    setDocuments(docs => docs.map(d => d.id === currentDoc?.id ? { ...d, title: newTitle } : d));
  };

  // 4. AI Gateway Integration (Hits ai_agents API)
  const invokeAIGateway = async (action: string) => {
    if (!content.trim() && action !== 'generate') {
      toast.warning("Please add some content first!");
      return;
    }
    
    setIsAiProcessing(true);
    toast.info(`AI is processing your request: ${action}...`);
    
    try {
      const res = await fetch(`${API_BASE}/ai_agents/agents/invoke/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          agent: "docs",
          action: action,
          document_content: content,
          message: action === 'generate' ? "Generate a professional project brief outline" : ""
        })
      });

      if (!res.ok) throw new Error("AI Gateway failed");

      const data = await res.json();
      
      // We append AI result below the current content to preserve what they wrote
      const newContent = `${content}\n\n---\n**AI ${action.charAt(0).toUpperCase() + action.slice(1)} Result:**\n\n${data.response}`;
      handleContentChange(newContent);
      toast.success("AI transformation applied!");
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to AI Gateway");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const exportDocument = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Document exported to Markdown");
  };

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 bg-slate-50/50">
      {/* Sidebar: Document List */}
      <div className="hidden md:flex flex-col w-64 shrink-0 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            My Documents
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createNewDocument}>
            <FilePlus2 className="h-4 w-4 text-primary" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {documents.map(doc => (
              <div 
                key={doc.id}
                onClick={() => selectDocument(doc)}
                className={`p-2 text-sm rounded-md cursor-pointer truncate transition-colors ${
                  currentDoc?.id === doc.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-slate-100 text-slate-600"
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
            placeholder="Document Title"
          />
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground mr-2 flex items-center gap-1">
              {isSaving ? <><RefreshCw className="h-3 w-3 animate-spin"/> Saving...</> : <><Save className="h-3 w-3"/> Saved</>}
            </span>
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white" onClick={() => exportDocument()}>
              <Download className="h-3 w-3 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        {/* AI Action Bar */}
        <div className="px-3 py-2 border-b border-border bg-primary/5 flex items-center gap-2 overflow-x-auto">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mr-2 shrink-0">
            <Sparkles className="h-3 w-3 mr-1" /> AI Tools
          </Badge>
          <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-primary/10 hover:text-primary shrink-0" onClick={() => invokeAIGateway('summarize')} disabled={isAiProcessing}>
            <List className="h-3 w-3 mr-1.5" /> Summarize
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-primary/10 hover:text-primary shrink-0" onClick={() => invokeAIGateway('rewrite')} disabled={isAiProcessing}>
            <RefreshCw className="h-3 w-3 mr-1.5" /> Rewrite
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-primary/10 hover:text-primary shrink-0" onClick={() => invokeAIGateway('translate')} disabled={isAiProcessing}>
            <Languages className="h-3 w-3 mr-1.5" /> Translate
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-primary/10 hover:text-primary shrink-0" onClick={() => invokeAIGateway('format')} disabled={isAiProcessing}>
            <Type className="h-3 w-3 mr-1.5" /> Format MD
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-primary/10 hover:text-primary shrink-0" onClick={() => invokeAIGateway('generate')} disabled={isAiProcessing}>
            <FilePlus2 className="h-3 w-3 mr-1.5" /> Generate Template
          </Button>
          {isAiProcessing && <Loader2 className="h-4 w-4 text-primary animate-spin ml-auto shrink-0" />}
        </div>

        {/* Text Area */}
        <div className="flex-1 p-0 relative group">
          <textarea 
            className="absolute inset-0 w-full h-full p-6 resize-none outline-none font-mono text-sm leading-relaxed text-slate-700 bg-transparent placeholder-slate-300"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            spellCheck={false}
            placeholder="Start typing your document here... or use AI Tools above to generate content."
          />
        </div>
      </Card>
    </div>
  );
}
