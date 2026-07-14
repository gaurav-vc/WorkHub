import { useState, useEffect } from "react";
import {
  Kanban, List, LayoutGrid, CheckCircle2, MoreHorizontal, Pencil, Trash2, Plus, X, GripVertical, AlertCircle, ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { TaskDetailsModal } from "./TaskDetailsModal";
import { CreateTaskModal } from "./CreateTaskModal";
import { ErrorBoundary } from "../ErrorBoundary";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";

interface Task {
  id: number;
  title: string;
  status: string;
  due_date: string | null;
  created_at?: string;
  created_by_name?: string;
  assigned_to?: any;
  assigned_to_name?: string;
  assignee_detail?: any;
  subtasks?: any[];
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  team?: any[];
  imported_tasks?: Task[];
  tasks?: {
    columns?: Array<{ id: string; title: string; color: string }>;
  };
}

interface ProjectBoardProps {
  projectId: number;
  onBack: () => void;
}


const DEFAULT_COLUMNS = [
  { id: "planning", title: "Planning", color: "bg-slate-400" },
  { id: "open", title: "Open", color: "bg-blue-400" },
  { id: "pending", title: "Pending", color: "bg-yellow-500" },
  { id: "review", title: "Review", color: "bg-purple-500" },
  { id: "completed", title: "Completed", color: "bg-green-500" },
  { id: "closed", title: "Closed", color: "bg-red-500" },
];

// Mapping frontend status values to display statuses if they differ slightly
const STATUS_MAPPING: Record<string, string> = {
  "in_progress": "open",
  "done": "completed",
  "hold": "pending",
  "on_hold": "pending",
  "delay": "review",
  "delayed": "review",
};

const getMappedStatus = (status: string, columns: Array<{ id: string }>) => {
  if (!status) return "pending";
  if (columns.some(c => c.id === status)) return status;
  return STATUS_MAPPING[status] || status;
};

export default function ProjectBoard({ projectId, onBack }: ProjectBoardProps) {
  const { token, username } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [dragCard, setDragCard] = useState<{ taskId: number; fromCol: string } | null>(null);
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreateModalForCol, setShowCreateModalForCol] = useState<string | null>(null);
  
  // Custom columns state
  const [columns, setColumns] = useState<Array<{ id: string; title: string; color: string }>>(DEFAULT_COLUMNS);
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  // Editing columns state
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState("");

  const handleSaveColumnTitle = async (colId: string) => {
    const title = editingColTitle.trim();
    if (!title) {
      setEditingColId(null);
      return;
    }
    const newCols = columns.map(c => c.id === colId ? { ...c, title } : c);
    setColumns(newCols);
    setEditingColId(null);
    await saveColumns(newCols);
  };

  const fetchProject = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/`, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        if (data.tasks && data.tasks.columns && Array.isArray(data.tasks.columns)) {
          setColumns(data.tasks.columns);
        } else {
          setColumns(DEFAULT_COLUMNS);
        }
      }
    } catch (error) {
      console.error("Failed to fetch project details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const saveColumns = async (newCols: typeof DEFAULT_COLUMNS) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          tasks: {
            ...project?.tasks,
            columns: newCols
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        if (data.tasks && data.tasks.columns && Array.isArray(data.tasks.columns)) {
          setColumns(data.tasks.columns);
        }
      }
    } catch (error) {
      console.error("Failed to save custom columns:", error);
    }
  };

  const handleAddColumn = async () => {
    if (!newColTitle.trim()) return;
    const title = newColTitle.trim();
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    if (columns.some(c => c.id === id)) {
      alert("A section with this name already exists!");
      return;
    }

    const MODERN_COLORS = ["bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-teal-500", "bg-cyan-500"];
    const color = MODERN_COLORS[columns.length % MODERN_COLORS.length];

    const newCol = { id, title, color };
    const newCols = [...columns, newCol];

    setColumns(newCols);
    setNewColTitle("");
    setIsAddingCol(false);

    await saveColumns(newCols);
  };

  const handleDeleteColumn = async (colId: string) => {
    if (DEFAULT_COLUMNS.some(d => d.id === colId)) return;
    if (!confirm("Are you sure you want to delete this section? Tasks in this section will be moved to Pending.")) return;

    const newCols = columns.filter(c => c.id !== colId);
    
    // Update tasks status in UI/DB
    const tasksToMove = (project?.imported_tasks || []).filter(t => getMappedStatus(t.status, columns) === colId);
    for (const task of tasksToMove) {
      await updateTaskStatus(task.id, "pending");
    }

    await saveColumns(newCols);
  };

  const addTask = async (status: string) => {
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    const tempId = Date.now();
    
    // Optimistic UI update
    setProject(prev => {
      if (!prev) return prev;
      const tasks = prev.imported_tasks || [];
      return { ...prev, imported_tasks: [...tasks, { id: tempId, title, status, due_date: null, created_by_name: username }] };
    });
    setNewTaskTitle("");
    setAddingToCol(null);

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/add_task/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title, status })
      });
      if (!res.ok) {
        // revert on failure
        fetchProject();
        toast.error("Failed to create task");
      } else {
        toast.success("Task created successfully");
        fetchProject(); // fetch to get actual ID and backend progress
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while creating task");
      fetchProject();
    }
  };

  const addTaskWithDetails = async (taskData: any) => {
    if (!showCreateModalForCol) return;
    const tempId = Date.now();
    
    // Optimistic UI update
    setProject(prev => {
      if (!prev) return prev;
      const tasks = prev.imported_tasks || [];
      return { ...prev, imported_tasks: [...tasks, { id: tempId, title: taskData.title, status: showCreateModalForCol, due_date: taskData.dueDate, created_by_name: username }] };
    });

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/add_task/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          title: taskData.title, 
          status: showCreateModalForCol,
          due_date: taskData.dueDate,
          description: taskData.description,
          assigned_to: taskData.assignedTo,
          parent_task_id: taskData.dependentTask
        })
      });
      if (!res.ok) {
        fetchProject();
        toast.error("Failed to create detailed task");
      } else {
        toast.success("Task created successfully");
        fetchProject();
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while creating detailed task");
      fetchProject();
    }
  };

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      // Optimistic update
      setProject(prev => {
        if (!prev || !prev.imported_tasks) return prev;
        return {
          ...prev,
          imported_tasks: prev.imported_tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
        };
      });

      const res = await fetch(`${API_BASE}/projects/tasks/${taskId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
         fetchProject(); // Revert on failure
      }
    } catch (e) {
      console.error(e);
      fetchProject();
    }
  };

  const handleDrop = async (toStatus: string) => {
    if (!dragCard || dragCard.fromCol === toStatus) {
      setDragCard(null);
      return;
    }
    
    // Check if dragging to a completed state
    const isCompletedState = ['completed', 'done'].includes(toStatus.toLowerCase());
    
    if (isCompletedState) {
        try {
            // Fetch the task details first to check for blocking dependencies
            const res = await fetch(`${API_BASE}/projects/tasks/${dragCard.taskId}/`, { headers: { "Authorization": `Bearer ${token}` } });
            if (res.ok) {
                const taskDetails = await res.json();
                if (taskDetails.blocked_by && taskDetails.blocked_by.length > 0) {
                    const hasIncompleteDeps = taskDetails.blocked_by.some((dep: any) => !['completed', 'done'].includes(dep.status.toLowerCase()));
                    if (hasIncompleteDeps) {
                        alert("Cannot complete task: It has active blocking dependencies!");
                        setDragCard(null);
                        return;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to check dependencies", e);
        }
    }

    await updateTaskStatus(dragCard.taskId, toStatus);
    setDragCard(null);
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`${API_BASE}/projects/tasks/${taskId}/`, {
        method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setProject(prev => {
          if (!prev || !prev.imported_tasks) return prev;
          return { ...prev, imported_tasks: prev.imported_tasks.filter(t => t.id !== taskId) };
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading board...</div>;
  }

  if (!project) {
    return <div className="p-8 text-center text-destructive">Project not found</div>;
  }

  const tasks = project.imported_tasks || [];

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-1 h-8">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
          </Button>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold text-foreground">{project.name}</h2>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase tracking-wider">{project.status}</Badge>
          </div>
        </div>
        <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border">
          <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 rounded-md text-xs gap-1" onClick={() => setViewMode("kanban")}>
            <LayoutGrid className="h-3 w-3" /> <span className="hidden sm:inline">Kanban</span>
          </Button>
          <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 rounded-md text-xs gap-1" onClick={() => setViewMode("list")}>
            <List className="h-3 w-3" /> <span className="hidden sm:inline">List</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto min-h-[500px]">
        {viewMode === "kanban" ? (
          <div className="flex gap-3 min-h-0 h-full pb-4 items-start">
            {columns.map(col => {
              const colTasks = tasks.filter(t => getMappedStatus(t.status, columns) === col.id);
              return (
                <div 
                  key={col.id} 
                  className="w-[250px] shrink-0 flex flex-col bg-muted/40 rounded-xl border border-border/50 max-h-[calc(100vh-220px)]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleDrop(col.id); }}
                >
                  <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border/50 bg-background/50 rounded-t-xl shrink-0">
                    <div className={`h-2 w-2 rounded-full ${col.color}`} />
                    {editingColId === col.id ? (
                      <Input
                        value={editingColTitle}
                        onChange={(e) => setEditingColTitle(e.target.value)}
                        onBlur={() => handleSaveColumnTitle(col.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveColumnTitle(col.id);
                          if (e.key === "Escape") setEditingColId(null);
                        }}
                        autoFocus
                        className="h-7 text-xs py-0 px-1.5 flex-1 bg-background font-semibold"
                      />
                    ) : (
                      <>
                        <h3 
                          className="text-xs font-semibold text-foreground flex-1 truncate cursor-pointer hover:underline"
                          onDoubleClick={() => {
                            setEditingColId(col.id);
                            setEditingColTitle(col.title);
                          }}
                        >
                          {col.title}
                        </h3>
                        <Badge variant="secondary" className="text-[9px] px-1 h-4 mr-0.5 shrink-0">{colTasks.length}</Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 opacity-60 hover:opacity-100">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingColId(col.id); setEditingColTitle(col.title); }}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Rename Section
                            </DropdownMenuItem>
                            {!DEFAULT_COLUMNS.some(d => d.id === col.id) && (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteColumn(col.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Section
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
 
                  <div className="flex-1 overflow-y-auto px-2 py-2 min-h-[150px]">
                    <div className="space-y-2 pb-1">
                      {colTasks.map(task => {
                        const totalChecks = task.subtasks?.length || 0;
                        const completedChecks = task.subtasks?.filter(st => st.status === 'completed').length || 0;
                        const progress = totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0;
                        const daysAgo = task.created_at ? Math.floor((new Date().getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                        const hoursAgo = task.created_at ? Math.floor(((new Date().getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60)) % 24) : 0;
                        
                        return (
                          <Card 
                            key={task.id} 
                            draggable 
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', '');
                              setDragCard({ taskId: task.id, fromCol: col.id });
                            }}
                            className="bg-card text-card-foreground border-border cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all group overflow-hidden rounded-lg shadow-sm"
                          >
                            <CardContent className="p-3 relative" onClick={() => setSelectedTaskId(task.id)} role="button">
                              {/* Title */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="text-sm font-semibold leading-snug break-words group-hover:text-primary transition-colors w-full pr-6">
                                  {task.title}
                                </h4>
                              </div>

                              {/* Status Badge */}
                              <div className="mb-3">
                                <span className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold rounded-full capitalize text-white shadow-sm ${col.color}`}>
                                  {getMappedStatus(task.status, columns)}
                                </span>
                              </div>
                              
                              {/* Created By & Time Ago */}
                              <div className="text-xs mb-3 space-y-1 text-muted-foreground">
                                <p>Created By: <span className="font-medium text-foreground">{task.created_by_name && task.created_by_name !== "Unknown" ? task.created_by_name : (username || task.assigned_to_name || "System")}</span></p>
                                {daysAgo > 0 || hoursAgo > 0 ? (
                                  <p className="text-[10px] italic">{daysAgo}d {hoursAgo}h ago</p>
                                ) : null}
                              </div>
                              
                              {/* Progress */}
                              {totalChecks > 0 && (
                                <div className="mb-3">
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] mt-1 font-medium text-muted-foreground">
                                    <span>{completedChecks}/{totalChecks}</span>
                                    <span>{Math.round(progress)}%</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Footer: Date and Delete Icon */}
                              <div className="flex justify-between items-center text-muted-foreground text-[10px] font-medium pt-1 border-t border-border/40 mt-1">
                                <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ""}</span>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1" 
                                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
 
                  <div className="p-2 bg-background/30 rounded-b-xl border-t border-border/50 shrink-0">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-[11px] text-muted-foreground h-7 px-1.5 hover:text-primary hover:bg-primary/5 transition-colors" 
                      onClick={() => setShowCreateModalForCol(col.id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add task
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Add Section Button/Input in Kanban */}
            {isAddingCol ? (
              <div className="w-[250px] shrink-0 p-3 bg-muted/40 rounded-xl border border-border/50 flex flex-col gap-2">
                <Input 
                  placeholder="Section title (e.g. Approval)..." 
                  value={newColTitle} 
                  onChange={(e) => setNewColTitle(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleAddColumn()} 
                  autoFocus 
                  className="h-8 text-xs bg-background" 
                />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={handleAddColumn} className="flex-1 gradient-primary text-primary-foreground h-8 text-xs">
                    Add Section
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsAddingCol(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-[250px] shrink-0 h-[46px] border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all rounded-xl flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-semibold"
                onClick={() => setIsAddingCol(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Add Section
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-6">
            {columns.map(col => {
              const colTasks = tasks.filter(t => getMappedStatus(t.status, columns) === col.id);
              if (colTasks.length === 0 && addingToCol !== col.id) return null;
              return (
                <div key={col.id} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
                    <div className={`h-2 w-2 rounded-full ${col.color}`} />
                    {editingColId === col.id ? (
                      <Input
                        value={editingColTitle}
                        onChange={(e) => setEditingColTitle(e.target.value)}
                        onBlur={() => handleSaveColumnTitle(col.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveColumnTitle(col.id);
                          if (e.key === "Escape") setEditingColId(null);
                        }}
                        autoFocus
                        className="h-7 text-xs py-0 px-1.5 flex-1 bg-background font-semibold max-w-xs"
                      />
                    ) : (
                      <>
                        <h3 
                          className="text-xs font-semibold text-foreground flex-1 cursor-pointer hover:underline"
                          onDoubleClick={() => {
                            setEditingColId(col.id);
                            setEditingColTitle(col.title);
                          }}
                        >
                          {col.title}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] px-1 h-4.5 mr-1 shrink-0">{colTasks.length}</Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 opacity-60 hover:opacity-100">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingColId(col.id); setEditingColTitle(col.title); }}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Rename Section
                            </DropdownMenuItem>
                            {!DEFAULT_COLUMNS.some(d => d.id === col.id) && (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteColumn(col.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Section
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    {colTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-colors shadow-sm group">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${col.id === 'done' ? 'text-green-500' : 'text-muted-foreground/50'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground break-words">{task.title}</p>
                            {task.due_date && <p className="text-[9px] text-muted-foreground mt-0.5">Due: {task.due_date}</p>}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0">
                              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteTask(task.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                    
                    <Button 
                      variant="ghost" 
                      className="justify-start text-[11px] text-muted-foreground h-7 px-1.5 -ml-1.5 hover:text-primary hover:bg-primary/5 transition-colors" 
                      onClick={() => setShowCreateModalForCol(col.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add task
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Add Section Button/Input in List View */}
            <div className="pt-2">
              {isAddingCol ? (
                <div className="flex items-center gap-1.5 max-w-md border border-primary/30 rounded-lg p-2 bg-primary/5 shadow-sm">
                  <Input 
                    placeholder="Section title (e.g. Approval)..." 
                    value={newColTitle} 
                    onChange={(e) => setNewColTitle(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && handleAddColumn()} 
                    autoFocus 
                    className="h-8 text-xs bg-background flex-1" 
                  />
                  <Button size="sm" onClick={handleAddColumn} className="gradient-primary text-primary-foreground h-8 text-xs px-3">
                    Add Section
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsAddingCol(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all rounded-lg flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-semibold px-3 h-8"
                  onClick={() => setIsAddingCol(true)}
                >
                  <Plus className="h-3 w-3" /> Add Section
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <TaskDetailsModal 
        open={selectedTaskId !== null} 
        onOpenChange={(open) => !open && setSelectedTaskId(null)} 
        taskId={selectedTaskId as number} 
        teamMembers={project?.team || []}
        projectId={project?.id}
      />
      <CreateTaskModal 
        open={showCreateModalForCol !== null} 
        onOpenChange={(open) => !open && setShowCreateModalForCol(null)}
        onSubmit={addTaskWithDetails}
        teamMembers={project?.team || []}
        tasks={project?.imported_tasks || []}
      />
    </div>
  );
}
