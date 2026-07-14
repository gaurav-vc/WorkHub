import { useState, useEffect } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getProjects, createProject, updateProject, deleteProject as deleteProjectApi, getDepartments, getTemplates, importTemplate } from "@/api/projects";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "on-hold" | "completed" | "planning";
  progress: number;
  department: string;
  template_type: string;
  team: Array<{ name: string; initials: string }>;
  dueDate: string | null;
  tasks: { total: number; completed: number };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-success/10 text-success border-success/20" },
  "on-hold": { label: "On Hold", color: "bg-warning/10 text-warning border-warning/20" },
  completed: { label: "Completed", color: "bg-info/10 text-info border-info/20" },
  planning: { label: "Planning", color: "bg-muted text-muted-foreground border-border" },
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", department: "Entire Organization", status: "planning" as Project["status"], dueDate: "", template_type: "blank" });
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const navigate = useNavigate();
  const { token } = useAuth();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        status: p.status,
        progress: p.progress || 0,
        department: p.department || "",
        template_type: p.template_type || "blank",
        team: p.team || [],
        dueDate: p.dueDate,
        tasks: p.tasks || { total: 0, completed: 0 }
      })));
    } catch (error) {
      console.error("Failed to fetch projects", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch(e) {}
  };

  useEffect(() => {
    fetchProjects();
    fetchTemplates();
    fetchDepartments();
  }, [token]);

  const filtered = projects.filter((p) => {
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openCreate = () => { setEditProject(null); setForm({ name: "", description: "", department: "Entire Organization", status: "planning", dueDate: "", template_type: "blank" }); setShowDialog(true); };
  
  const openEdit = (e: React.MouseEvent, p: Project) => { 
    e.stopPropagation();
    setEditProject(p); 
    setForm({ name: p.name, description: p.description, department: p.department, status: p.status, dueDate: p.dueDate || "", template_type: p.template_type }); 
    setShowDialog(true); 
  };

  const saveProject = async () => {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      const payload: any = { ...form };
      if (!payload.dueDate) {
        delete payload.dueDate;
      }
      
      let savedProject;
      if (editProject) {
        savedProject = await updateProject(editProject.id, payload);
      } else {
        savedProject = await createProject(payload);
      }

      if (!editProject && form.template_type && form.template_type !== "blank" && !["software", "marketing", "design"].includes(form.template_type)) {
        try {
          await importTemplate(form.template_type, savedProject.id);
        } catch(e: any) { 
          console.error("Template import failed", e); 
          toast.error(`Template import error: ${e.message}`);
        }
      }

      toast.success(`Project ${editProject ? 'updated' : 'created'} successfully`);
      fetchProjects();
      setShowDialog(false);
    } catch (err) {
      toast.error("Failed to save project");
    }
  };

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await deleteProjectApi(id);
      toast.success("Project deleted");
      fetchProjects();
    } catch (err) {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" /> Projects
          </h1>
          <p className="text-muted-foreground mt-1">Track project progress, teams, and milestones</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-1.5 px-6 py-5 text-base shadow-md hover:shadow-lg transition-all" onClick={openCreate}>
          <Plus className="h-5 w-5" /> New Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filtered.length === 0 ? (
         <div className="text-center p-12 bg-card rounded-xl border border-dashed border-border shadow-sm">
           <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
           <h3 className="text-lg font-medium text-foreground">No projects found</h3>
           <p className="text-muted-foreground mt-1">Create a new project to get started.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card 
              key={project.id} 
              className="shadow-card hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate(`/tasks/projects/${project.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => openEdit(e, project)}><Edit className="h-3.5 w-3.5 mr-1.5" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={(e) => deleteProject(e, project.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={`${statusConfig[project.status]?.color || statusConfig['planning'].color} text-[10px]`}>{statusConfig[project.status]?.label || 'Planning'}</Badge>
                  {project.department && <Badge variant="secondary" className="text-[10px]">{project.department}</Badge>}
                  {project.template_type !== 'blank' && <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 capitalize">{project.template_type}</Badge>}
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold text-foreground">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    {project.team.slice(0, 4).map((m, i) => (
                      <Avatar key={i} className="h-6 w-6 border-2 border-card">
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">{m.initials}</AvatarFallback>
                      </Avatar>
                    ))}
                    {project.team.length > 4 && <span className="text-[10px] text-muted-foreground ml-2">+{project.team.length - 4}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {project.dueDate && <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />{project.dueDate}</span>}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  {project.tasks.completed}/{project.tasks.total} tasks completed
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Expanded Dialog size max-w-2xl */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">{editProject ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2"><Label className="text-sm font-semibold">Project Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter project name" className="bg-muted" /></div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Template</Label>
                <Select value={form.template_type} onValueChange={(v) => setForm({ ...form, template_type: v })}>
                  <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Blank Project</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2"><Label className="text-sm font-semibold">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the project" className="bg-muted" /></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Access Scope</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger className="bg-muted"><SelectValue placeholder="Select access scope" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entire Organization">Entire Organization</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Project["status"] })}>
                  <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-sm font-semibold">Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-muted" /></div>
            </div>
          </div>
          <DialogFooter className="mt-8">
            <DialogClose asChild><Button variant="outline" className="px-5">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground px-6" onClick={saveProject}>{editProject ? "Save Changes" : "Create Project"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
