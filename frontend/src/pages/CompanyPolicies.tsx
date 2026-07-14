import { useState, useEffect } from "react";
import {
  FileCheck,
  Search,
  ChevronRight,
  ArrowLeft,
  Download,
  Plus,
  Trash2,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getCompanyPolicies, createCompanyPolicy, updateCompanyPolicy, deleteCompanyPolicy as deleteCompanyPolicyApi } from "@/api/hr";
import { toast } from "sonner";

interface Policy {
  id: string;
  title: string;
  category: string;
  lastUpdated: string;
  version: string;
  content: string;
  attachment?: string;
}

const policyCategories = ["All", "General", "HR", "IT", "Finance", "Legal"];

export default function CompanyPolicies() {
  const { token } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState({ title: "", category: "General", content: "", version: "1.0" });
  const [attachment, setAttachment] = useState<File | null>(null);

  const fetchPolicies = async () => {
    try {
      const data = await getCompanyPolicies();
      setPolicies(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchPolicies();
  }, [token]);

  const filtered = policies.filter((p) => {
    const matchCat = category === "All" || p.category === category;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openCreate = () => { setEditPolicy(null); setForm({ title: "", category: "General", content: "", version: "1.0" }); setAttachment(null); setShowCreate(true); };
  const openEdit = (p: Policy) => { setEditPolicy(p); setForm({ title: p.title, category: p.category, content: p.content, version: p.version }); setAttachment(null); setShowCreate(true); };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("category", form.category);
    formData.append("version", form.version);
    formData.append("content", form.content);
    if (attachment) {
      formData.append("attachment", attachment);
    }

    try {
      if (editPolicy) {
        await updateCompanyPolicy(editPolicy.id, formData);
      } else {
        await createCompanyPolicy(formData);
      }

      toast.success(editPolicy ? "Policy updated" : "Policy created");
      setShowCreate(false);
      fetchPolicies();
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const deletePolicy = async (id: string) => {
    try {
      await deleteCompanyPolicyApi(id);
      toast.success("Policy deleted");
      fetchPolicies();
      if (selectedPolicy?.id === id) setSelectedPolicy(null);
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  if (selectedPolicy) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => setSelectedPolicy(null)} className="gap-1.5 text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to policies
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">{selectedPolicy.category}</Badge>
              <Badge variant="outline" className="text-[10px]">v{selectedPolicy.version}</Badge>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">{selectedPolicy.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: {selectedPolicy.lastUpdated}</p>
          </div>
          {selectedPolicy.attachment ? (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(selectedPolicy.attachment, '_blank')}>
              <Download className="h-3.5 w-3.5" /> Download File
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5" disabled><Download className="h-3.5 w-3.5" /> No File Attached</Button>
          )}
        </div>
        <Card className="shadow-card">
          <CardContent className="p-6">
            {selectedPolicy.content.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-display font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h1>;
              if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-display font-semibold text-foreground mt-4 mb-2">{line.slice(3)}</h2>;
              if (line.startsWith("- ")) return <li key={i} className="text-sm text-foreground ml-4 py-0.5">{line.slice(2)}</li>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="text-sm text-foreground leading-relaxed">{line}</p>;
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" /> Company Policies
          </h1>
          <p className="text-muted-foreground mt-1">Browse and search company policy documents</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Policy
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {policyCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((policy) => (
          <Card key={policy.id} className="shadow-card hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedPolicy(policy)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{policy.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">{policy.category}</Badge>
                  <span className="text-[11px] text-muted-foreground">v{policy.version} · Updated {policy.lastUpdated}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(policy); }}>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deletePolicy(policy.id); }}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPolicy ? "Edit Policy" : "Add Policy"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label className="text-sm font-semibold">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{policyCategories.filter((c) => c !== "All").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-sm font-semibold">Version</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">File Attachment</Label>
              <Input type="file" onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)} className="cursor-pointer" />
              {editPolicy?.attachment && !attachment && <p className="text-xs text-muted-foreground mt-1">Currently attached: <a href={editPolicy.attachment} target="_blank" rel="noreferrer" className="text-primary hover:underline">View file</a></p>}
            </div>
            <div className="space-y-1.5"><Label className="text-sm font-semibold">Content</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} placeholder="Policy content (markdown supported)" className="resize-y" /></div>
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={save}>{editPolicy ? "Save Changes" : "Create Policy"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
