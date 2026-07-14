import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Star,
  Download,
  LayoutTemplate,
  CheckCircle2,
  Users,
  Clock,
  ArrowRight,
  Plus,
  Copy,
  Trash2,
  Edit,
  FileSpreadsheet,
  Briefcase,
  GraduationCap,
  Code,
  Palette,
  Camera,
  DollarSign,
  Megaphone,
  Headphones,
  User,
  Target,
  Zap,
  CheckSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProjectTemplate } from "@/types/tasks";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const categoryIcons: Record<string, any> = {
  "Team Management": Users, "Productivity": Zap, "Business": Briefcase,
  "Education": GraduationCap, "Project Management": Target, "Engineering": Code,
  "Design": Palette, "Creative": Camera, "Finance": DollarSign,
  "Marketing": Megaphone, "Support": Headphones, "Personal": User,
};

const categories = [
  "All", "Team Management", "Productivity", "Business", "Education",
  "Project Management", "Engineering", "Design", "Creative",
  "Finance", "Marketing", "Support", "Personal",
];

export default function TemplateMarketplace() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [tab, setTab] = useState("marketplace");
  const [myTemplates, setMyTemplates] = useState<ProjectTemplate[]>([]);
  const [backendTemplates, setBackendTemplates] = useState<any[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  
  const [createForm, setCreateForm] = useState({ title: "", description: "", category: "", numTasks: 1 });
  const [createTasks, setCreateTasks] = useState([{ title: "", status: "pending" }]);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTemplates(); }, [token]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates/`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setBackendTemplates(await res.json());
    } catch (e) { console.error(e); }
  };

  const handlePreviewClick = async (tmpl: any) => {
    setPreviewTemplate(tmpl); // Show immediately with basic info
    if (tmpl.isBackend) {
      try {
        const res = await fetch(`${API_BASE}/templates/${tmpl.id}/`, { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
          const fullData = await res.json();
          setPreviewTemplate((prev: any) => prev?.id === tmpl.id ? { ...prev, original: fullData } : prev);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleNumTasksChange = (val: number) => {
    const num = Math.max(1, val);
    setCreateForm(prev => ({ ...prev, numTasks: num }));
    setCreateTasks(prev => {
      const newTasks = [...prev];
      if (num > newTasks.length) {
        while (newTasks.length < num) newTasks.push({ title: "", status: "pending" });
      } else if (num < newTasks.length) {
        newTasks.length = num;
      }
      return newTasks;
    });
  };

  const handleTaskChange = (idx: number, field: string, val: string) => {
    setCreateTasks(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleCreateTemplate = async () => {
    if (!createForm.title || !createForm.category) return toast.error("Title and category are required");
    if (createTasks.some(t => !t.title.trim())) return toast.error("Fill in all task titles");
    setIsCreating(true);
    try {
      const payload = { 
        title: createForm.title, 
        description: createForm.description, 
        category: createForm.category,
        is_public: true, 
        tasks: createTasks 
      };
      const res = await fetch(`${API_BASE}/templates/`, {
        method: "POST", headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Template created successfully!");
        setShowCreate(false);
        setCreateForm({ title: "", description: "", category: "", numTasks: 1 });
        setCreateTasks([{ title: "", status: "pending" }]);
        fetchTemplates();
      } else {
        let errMsg = "Unknown error";
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.error || (typeof errData === 'object' ? JSON.stringify(errData) : "Invalid payload");
        } catch (e) {
          errMsg = res.statusText;
        }
        toast.error(`Failed to create template: ${errMsg}`);
      }
    } catch (e: any) { 
      toast.error(`Error: ${e?.message || "Network issue"}`); 
    } finally { 
      setIsCreating(false); 
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + "Task Title,Description,Status\nSample Task,This is a sample description,pending\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Template_Format.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length <= 1) {
         toast.error("CSV file is empty or only contains headers");
         return;
      }
      
      const parseCSVLine = (text: string) => {
         const re = /,"|",|"(?=[^"]*"$)/g;
         let a = text.split(re);
         if (a.length === 1) return text.split(',');
         return text.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g, '').trim()) || text.split(',');
      };

      const parsedTasks = lines.slice(1).map(line => {
         // Use a more robust split to handle quotes if possible, otherwise fallback
         let parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(',');
         parts = parts.map(p => p.replace(/^"|"$/g, '').trim());
         return {
            title: parts[0] || "Untitled Task",
            description: parts[1] || "",
            status: parts[2] || "pending"
         };
      });
      
      setCreateTasks(parsedTasks);
      setCreateForm(prev => ({ ...prev, numTasks: parsedTasks.length, title: file.name.replace('.csv', '') }));
      setShowImport(false);
      setShowCreate(true);
      toast.success(`Successfully parsed ${parsedTasks.length} tasks from CSV. Review and save.`);
    };
    reader.readAsText(file);
  };

  const normalizedTemplates = useMemo(() => {
    return backendTemplates.map(t => ({ id: t.id, name: t.title, description: t.description || "", category: t.category_name || "General", tasks: t.estimated_tasks || 0, isBackend: true, popular: t.is_featured || false, original: t }));
  }, [backendTemplates]);

  const filtered = useMemo(() => {
    return normalizedTemplates.filter(t => {
      const matchCat = activeCategory === "All" || t.category === activeCategory;
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCategory, normalizedTemplates]);

  const useTemplate = (tmpl: any) => {
    setMyTemplates(prev => {
      if (prev.find(t => t.id === tmpl.id)) return prev;
      return [...prev, { ...tmpl, id: `my-${tmpl.id}` }];
    });
    setPreviewTemplate(null);
  };

  const deleteMyTemplate = (id: string) => setMyTemplates(prev => prev.filter(t => t.id !== id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6 text-primary" /> Template Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">{backendTemplates.length} project templates ready to use</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-1.5 bg-primary text-primary-foreground" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create Template
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setShowImport(true)}>
            <FileSpreadsheet className="h-4 w-4" /> Import CSV
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="marketplace">Browse Templates</TabsTrigger>
          <TabsTrigger value="my-templates">My Templates <Badge variant="secondary" className="ml-1.5 text-[10px]">{myTemplates.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="flex gap-6">
            {/* Category sidebar */}
            <div className="hidden lg:block w-48 shrink-0 space-y-1">
              {categories.map(cat => {
                const Icon = categoryIcons[cat] || LayoutTemplate;
                const count = cat === "All" ? normalizedTemplates.length : normalizedTemplates.filter(t => t.category === cat).length;
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors ${activeCategory === cat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="flex-1">{cat}</span>
                    <span className="text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile category tabs */}
            <div className="flex-1 space-y-4">
              <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <Badge key={cat} variant={activeCategory === cat ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap text-xs" onClick={() => setActiveCategory(cat)}>
                    {cat}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.slice(0, 30).map(tmpl => {
                  const CatIcon = categoryIcons[tmpl.category] || LayoutTemplate;
                  return (
                    <Card key={tmpl.id} className="shadow-card hover:shadow-md transition-all cursor-pointer group" onClick={() => handlePreviewClick(tmpl)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <CatIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-semibold truncate">{tmpl.name}</h3>
                              {tmpl.popular && <Star className="h-3 w-3 text-warning fill-warning shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tmpl.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-[10px]">{tmpl.category}</Badge>
                              <span className="text-[10px] text-muted-foreground">{tmpl.tasks} tasks</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {filtered.length > 30 && (
                <p className="text-xs text-center text-muted-foreground">Showing 30 of {filtered.length} templates. Use search to narrow down.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="my-templates" className="mt-4">
          {myTemplates.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-12 text-center">
                <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No saved templates yet</p>
                <p className="text-xs text-muted-foreground mt-1">Browse the marketplace and save templates you like</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myTemplates.map(tmpl => (
                <Card key={tmpl.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold">{tmpl.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">{tmpl.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">{tmpl.tasks} tasks</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"><Copy className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteMyTemplate(tmpl.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3 gradient-primary text-primary-foreground text-xs" onClick={(e) => { e.stopPropagation(); handlePreviewClick(tmpl); }}>Preview / Use</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium">{previewTemplate.category}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tasks Included</p>
                  <p className="text-sm font-medium">{previewTemplate.tasks} tasks</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-medium mb-2">Tasks Included in Template</p>
                {previewTemplate.original?.template_tasks?.length > 0 ? (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
                    {previewTemplate.original.template_tasks.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <CheckSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs">{t.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {previewTemplate.original?.template_tasks ? "No tasks defined." : "Loading tasks..."}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="outline" onClick={() => previewTemplate && useTemplate(previewTemplate)}>Save to My Templates</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => previewTemplate && useTemplate(previewTemplate)}>Use Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /> Import Template from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-primary/5 p-4 rounded-lg border border-primary/20">
              <div>
                <p className="text-sm font-semibold text-foreground">Need the correct format?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Download our standard CSV template.</p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadCsvTemplate} className="gap-1.5">
                <Download className="h-4 w-4" /> Template
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Upload a CSV file (.csv) with the following columns:</p>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              {["Task Title", "Description", "Status"].map(col => (
                <div key={col} className="flex items-center gap-2 text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {col}
                </div>
              ))}
            </div>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Click to browse your files</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .csv format</p>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5 text-primary" /> Create New Template</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 pr-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Title</Label>
                <Input value={createForm.title} onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Employee Onboarding" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={createForm.description} onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe what this template is for..." />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={createForm.category}
                  onChange={e => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select category...</option>
                  {categories.filter(c => c !== "All").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-base font-semibold">Define Tasks</Label>
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Number of Tasks</Label>
                  <Input 
                    type="number" min={1} max={50} className="w-24"
                    value={createForm.numTasks}
                    onChange={e => handleNumTasksChange(parseInt(e.target.value) || 1)}
                  />
                  <span className="text-xs text-muted-foreground">(Changes automatically update the rows below)</span>
                </div>
              </div>
              <div className="space-y-3 mt-4">
                {createTasks.map((task, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg border border-border/50">
                    <div className="h-9 w-6 flex items-center justify-center shrink-0 text-muted-foreground text-xs font-medium">
                      {idx + 1}.
                    </div>
                    <Input 
                      placeholder={`Task ${idx + 1} title`} 
                      value={task.title}
                      onChange={e => handleTaskChange(idx, "title", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={handleCreateTemplate} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
