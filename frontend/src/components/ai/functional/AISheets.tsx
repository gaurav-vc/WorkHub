import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Table, Save, Sparkles, BarChart, 
  Calculator, FilePlus2, Loader2, Download, RefreshCw, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

import { API_BASE } from "@/config";

export default function AISheets() {
  const { token } = useAuth();
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  
  const [title, setTitle] = useState("");
  // We store the sheet data as a 2D array of strings internally
  const [gridData, setGridData] = useState<string[][]>([["", "", ""], ["", "", ""]]);
  const [aiPrompt, setAiPrompt] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: CSV Parse/Stringify
  const gridToCsv = (grid: string[][]) => grid.map(row => row.join(",")).join("\n");
  const csvToGrid = (csv: string) => {
    if (!csv) return [["", "", ""], ["", "", ""]];
    return csv.split("\n").map(row => row.split(","));
  };

  // 1. Fetch Existing Spreadsheets (Prefixing title with [Sheet] to distinguish if needed, but we just load all docs for now)
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/docs/documents/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Optionally filter by some metadata if we added it, but let's just use the same docs pool
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
    setGridData(csvToGrid(doc.content || ""));
    setAnalysisResult(null);
  };

  const createNewDocument = async () => {
    try {
      const emptyGrid = [
        ["Header 1", "Header 2", "Header 3"],
        ["", "", ""],
        ["", "", ""]
      ];
      const res = await fetch(`${API_BASE}/docs/documents/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Untitled Spreadsheet",
          content: gridToCsv(emptyGrid),
        })
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocuments([newDoc, ...documents]);
        selectDocument(newDoc);
        toast.success("New spreadsheet created");
      }
    } catch (err) {
      toast.error("Failed to create spreadsheet");
    }
  };

  // 3. Autosave Logic (Hits Legacy API)
  const saveDocument = async (t: string, grid: string[][]) => {
    if (!currentDoc) return;
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/docs/documents/${currentDoc.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: t, content: gridToCsv(grid) })
      });
    } catch (err) {
      console.error("Autosave failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutosave(newTitle, gridData);
    setDocuments(docs => docs.map(d => d.id === currentDoc?.id ? { ...d, title: newTitle } : d));
  };

  const handleCellChange = (rIndex: number, cIndex: number, value: string) => {
    const newGrid = [...gridData];
    newGrid[rIndex] = [...newGrid[rIndex]];
    newGrid[rIndex][cIndex] = value;
    setGridData(newGrid);
    triggerAutosave(title, newGrid);
  };

  const triggerAutosave = (t: string, grid: string[][]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDocument(t, grid), 1500);
  };

  const addRow = () => {
    if (gridData.length === 0) return;
    const newRow = Array(gridData[0].length).fill("");
    const newGrid = [...gridData, newRow];
    setGridData(newGrid);
    triggerAutosave(title, newGrid);
  };

  const addColumn = () => {
    const newGrid = gridData.map(row => [...row, ""]);
    if (newGrid.length === 0) newGrid.push([""]);
    setGridData(newGrid);
    triggerAutosave(title, newGrid);
  };

  // 4. AI Gateway Integration (Hits ai_agents API)
  const invokeAIGateway = async (action: string) => {
    if (!aiPrompt.trim() && action !== 'analyze') {
      toast.warning("Please enter a prompt (e.g., 'Sum of Column B')");
      return;
    }
    
    setIsAiProcessing(true);
    setAnalysisResult(null);
    toast.info(`AI is processing: ${action}...`);
    
    try {
      const res = await fetch(`${API_BASE}/ai_agents/agents/invoke/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          agent: "sheets",
          action: action,
          document_content: gridToCsv(gridData),
          message: aiPrompt
        })
      });

      if (!res.ok) throw new Error("AI Gateway failed");
      const data = await res.json();
      
      if (action === 'create_template') {
        const newGrid = csvToGrid(data.response);
        setGridData(newGrid);
        triggerAutosave(title, newGrid);
        toast.success("Template generated!");
      } else if (action === 'analyze') {
        setAnalysisResult(data.response);
        toast.success("Analysis complete");
      } else if (action === 'generate_formula') {
        setAnalysisResult(`Suggested Formula: ${data.response}`);
        toast.success("Formula generated");
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
    const blob = new Blob([gridToCsv(gridData)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'spreadsheet'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Spreadsheet exported to CSV");
  };

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 bg-slate-50/50">
      {/* Sidebar: Document List */}
      <div className="hidden md:flex flex-col w-64 shrink-0 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            My Sheets
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createNewDocument}>
            <FilePlus2 className="h-4 w-4 text-green-600" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {documents.map(doc => (
              <div 
                key={doc.id}
                onClick={() => selectDocument(doc)}
                className={`p-2 text-sm rounded-md cursor-pointer truncate transition-colors ${
                  currentDoc?.id === doc.id ? "bg-green-600/10 text-green-700 font-medium" : "hover:bg-slate-100 text-slate-600"
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
            placeholder="Spreadsheet Title"
          />
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground mr-2 flex items-center gap-1">
              {isSaving ? <><RefreshCw className="h-3 w-3 animate-spin"/> Saving...</> : <><Save className="h-3 w-3"/> Saved</>}
            </span>
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white" onClick={exportDocument}>
              <Download className="h-3 w-3 mr-1.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* AI Action Bar */}
        <div className="px-3 py-2 border-b border-border bg-green-50/50 flex items-center gap-2 overflow-x-auto">
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 mr-2 shrink-0">
            <Sparkles className="h-3 w-3 mr-1" /> AI Tools
          </Badge>
          <Input 
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Create a budget template..."
            className="h-8 text-xs w-64 bg-white"
            disabled={isAiProcessing}
          />
          <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-green-100 hover:text-green-700 shrink-0" onClick={() => invokeAIGateway('create_template')} disabled={isAiProcessing}>
            <Table className="h-3 w-3 mr-1.5" /> Generate Sheet
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-green-100 hover:text-green-700 shrink-0" onClick={() => invokeAIGateway('generate_formula')} disabled={isAiProcessing}>
            <Calculator className="h-3 w-3 mr-1.5" /> Formula
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-green-100 hover:text-green-700 shrink-0" onClick={() => invokeAIGateway('analyze')} disabled={isAiProcessing}>
            <BarChart className="h-3 w-3 mr-1.5" /> Analyze Data
          </Button>
          {isAiProcessing && <Loader2 className="h-4 w-4 text-green-600 animate-spin ml-auto shrink-0" />}
        </div>

        {/* Analysis Result Panel */}
        {analysisResult && (
          <div className="p-3 bg-slate-800 text-slate-100 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto border-b border-slate-700 font-mono">
            {analysisResult}
            <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-xs text-slate-400 hover:text-white" onClick={() => setAnalysisResult(null)}>Close</Button>
          </div>
        )}

        {/* Grid Area */}
        <div className="flex-1 overflow-auto bg-slate-100/50 p-4">
          <div className="inline-block min-w-full bg-white border border-slate-300 rounded shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <tbody>
                {gridData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {/* Row Number Column */}
                    <td className="w-10 bg-slate-100 border-r border-b border-slate-300 text-center text-xs text-slate-400 font-mono select-none">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border-r border-b border-slate-200 p-0 relative">
                        <input
                          className={`w-full h-full p-2 outline-none text-slate-700 ${rowIndex === 0 ? "font-semibold bg-slate-50" : "bg-transparent focus:bg-blue-50/50"}`}
                          value={cell}
                          onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={addRow} className="text-xs bg-white text-slate-600 hover:text-slate-900">
              + Add Row
            </Button>
            <Button size="sm" variant="outline" onClick={addColumn} className="text-xs bg-white text-slate-600 hover:text-slate-900">
              + Add Column
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
