import { useState, useEffect } from "react";
import {
  Plus, X, AlertTriangle, RotateCcw, Link2, CheckSquare, ListTree, Paperclip, Flag,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTaskContext } from "@/context/TaskContext";
import { Task, ChecklistItem, SubTask, RepeatConfig } from "@/types/tasks";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTask?: Task | null;
}

export function TaskCreateDialog({ open, onOpenChange, editTask }: TaskCreateDialogProps) {
  const { addTask, updateTask, tasks } = useTaskContext();
  const { token, username } = useAuth();
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    if (token && open) {
      fetch(`${API_BASE}/auth/employees/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          const members = (data.results || data).map((m: any) => ({
            ...m,
            name: m.full_name || m.username || m.name || "Unknown",
            initials: m.initials || (m.full_name || m.username || m.name || "U").substring(0, 2).toUpperCase(),
          }));
          setTeamMembers(members);
        })
        .catch(console.error);
    }
  }, [token, open]);

  const defaultForm = {
    title: "", description: "", taskType: "self" as "self" | "assign",
    priority: "P3" as Task["priority"], project: "", dueDate: "", dueTime: "",
    startDate: "", estimatedEffort: 0, effortUnit: "hours" as "hours" | "days",
    isUrgent: false, assigneeIds: [] as string[],
    dependencies: [] as string[],
    tags: [] as string[],
  };

  const [form, setForm] = useState(editTask ? {
    title: editTask.title, description: editTask.description, taskType: editTask.taskType,
    priority: editTask.priority, project: editTask.project, dueDate: editTask.dueDate,
    dueTime: editTask.dueTime, startDate: editTask.startDate,
    estimatedEffort: editTask.estimatedEffort, effortUnit: editTask.effortUnit,
    isUrgent: editTask.isUrgent, assigneeIds: editTask.assignees.map(a => {
      // In real scenario we match by id, for fallback match initials
      const found = teamMembers.find(m => m.initials === a.initials);
      return found?.id || a.initials;
    }), dependencies: editTask.dependencies, tags: editTask.tags,
  } : defaultForm);

  const [repeat, setRepeat] = useState<RepeatConfig>(editTask?.repeat || { enabled: false, type: "daily" });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(editTask?.checklist || []);
  const [subtasks, setSubtasks] = useState<SubTask[]>(editTask?.subtasks || []);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [newSubtask, setNewSubtask] = useState({ title: "", assignee: "", dueDate: "" });
  const [newTag, setNewTag] = useState("");

  const handleSave = () => {
    if (!form.title.trim()) return;
    const assignees = form.taskType === "self"
      ? [{ name: username || "User", initials: username ? username.substring(0, 2).toUpperCase() : "U" }]
      : form.assigneeIds.map(id => {
          const m = teamMembers.find(t => t.id === id);
          return m ? { name: m.name, initials: m.initials } : { name: "Unknown", initials: "??" };
        });

    const taskData: Task = {
      id: editTask?.id || `task-${Date.now()}`,
      title: form.title, description: form.description, taskType: form.taskType,
      priority: form.priority, status: editTask?.status || "todo",
      project: form.project, assignees, createdBy: { name: username || "User", initials: username ? username.substring(0, 2).toUpperCase() : "U" },
      createdDate: editTask?.createdDate || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      dueDate: form.dueDate, dueTime: form.dueTime, startDate: form.startDate,
      estimatedEffort: form.estimatedEffort, effortUnit: form.effortUnit,
      actualEffort: editTask?.actualEffort || 0,
      isUrgent: form.isUrgent, repeat, dependencies: form.dependencies,
      checklist, subtasks,
      comments: editTask?.comments || [], chat: editTask?.chat || [],
      attachments: editTask?.attachments || [], tags: form.tags,
    };

    if (editTask) {
      updateTask(editTask.id, taskData);
    } else {
      addTask(taskData);
    }
    onOpenChange(false);
  };

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist(prev => [...prev, { id: `cl-${Date.now()}`, text: newCheckItem.trim(), completed: false }]);
    setNewCheckItem("");
  };

  const addSubtask = () => {
    if (!newSubtask.title.trim()) return;
    setSubtasks(prev => [...prev, { id: `st-${Date.now()}`, title: newSubtask.title, assignee: newSubtask.assignee || "Unassigned", dueDate: newSubtask.dueDate, status: "todo" }]);
    setNewSubtask({ title: "", assignee: "", dueDate: "" });
  };

  const addTag = () => {
    if (!newTag.trim() || form.tags.includes(newTag.trim())) return;
    setForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
    setNewTag("");
  };

  const toggleDep = (taskId: string) => {
    setForm(prev => ({
      ...prev,
      dependencies: prev.dependencies.includes(taskId)
        ? prev.dependencies.filter(d => d !== taskId)
        : [...prev.dependencies, taskId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            {editTask ? "Edit Task" : "Create Task"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 overflow-y-auto">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 h-14 bg-muted/40 p-1.5 rounded-xl">
              <TabsTrigger value="details" className="text-base rounded-lg data-[state=active]:shadow-sm">Details</TabsTrigger>
              <TabsTrigger value="checklist" className="text-base rounded-lg data-[state=active]:shadow-sm">Checklist</TabsTrigger>
              <TabsTrigger value="subtasks" className="text-base rounded-lg data-[state=active]:shadow-sm">Subtasks</TabsTrigger>
              <TabsTrigger value="advanced" className="text-base rounded-lg data-[state=active]:shadow-sm">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-0">
              {/* Task Type */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
                <Label className="text-base font-semibold w-24">Task Type</Label>
                <div className="flex bg-muted/40 p-1 rounded-lg w-full sm:w-[360px]">
                  <Button size="sm" variant={form.taskType === "self" ? "default" : "ghost"} onClick={() => setForm(f => ({ ...f, taskType: "self" }))} className={`flex-1 text-base h-10 ${form.taskType === "self" ? "shadow-sm" : ""}`}>Self Task</Button>
                  <Button size="sm" variant={form.taskType === "assign" ? "default" : "ghost"} onClick={() => setForm(f => ({ ...f, taskType: "assign" }))} className={`flex-1 text-base h-10 ${form.taskType === "assign" ? "shadow-sm" : ""}`}>Assign to Others</Button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-sm">Task Topic <span className="text-destructive">*</span></Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Enter task title..." />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Add task details..." rows={3} />
              </div>

              {/* Assignees (only if assign type) */}
              {form.taskType === "assign" && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Assign To</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {teamMembers.map(m => (
                      <Badge key={m.id} variant={form.assigneeIds.includes(m.id) ? "default" : "outline"}
                        className="cursor-pointer text-xs" onClick={() => {
                          setForm(f => ({ ...f, assigneeIds: f.assigneeIds.includes(m.id) ? f.assigneeIds.filter(id => id !== m.id) : [...f.assigneeIds, m.id] }));
                        }}>{m.initials} {m.name ? m.name.split(" ")[0] : "Unknown"}</Badge>
                    ))}
                  </div>
                  {/* Selected Assignees Workload Preview */}
                  {form.assigneeIds.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-border/50">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2 block">Workload Preview</Label>
                      <div className="space-y-2">
                        {form.assigneeIds.map(id => {
                          const member = teamMembers.find(t => t.id === id);
                          if (!member) return null;
                          const assignedTasks = tasks.filter(t => t.assignees && t.assignees.some(a => a.initials === member.initials) && t.status !== "done");
                          const totalEffortHours = assignedTasks.reduce((sum, t) => sum + (t.effortUnit === "days" ? t.estimatedEffort * 8 : t.estimatedEffort), 0);
                          const capacity = member.capacity || 8;
                          const weeklyCapacity = (member.capacityUnit === "hours/day" ? capacity * 5 : capacity);
                          const utilization = weeklyCapacity > 0 ? Math.min(Math.round((totalEffortHours / weeklyCapacity) * 100), 150) : 0;
                          const isOverloaded = utilization > 100;

                          return (
                            <div key={id} className={`flex items-center gap-3 p-2.5 rounded-md border ${isOverloaded ? "bg-destructive/5 border-destructive/20" : "bg-muted/30"}`}>
                              <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">{member.initials}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-xs font-medium truncate">{member.name}</span>
                                  <span className={`text-[10px] font-semibold ${isOverloaded ? "text-destructive" : "text-muted-foreground"}`}>{utilization}% utilized</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={Math.min(utilization, 100)} className={`h-1.5 flex-1 ${isOverloaded ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`} />
                                  <span className="text-[10px] text-muted-foreground shrink-0">{assignedTasks.length} active tasks</span>
                                </div>
                                {isOverloaded && (
                                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-destructive font-medium">
                                    <AlertTriangle className="h-3 w-3" /> Warning: Over capacity
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Priority & Urgent */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Task["priority"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P1">🔴 P1 Critical</SelectItem>
                      <SelectItem value="P2">🟠 P2 High</SelectItem>
                      <SelectItem value="P3">🔵 P3 Medium</SelectItem>
                      <SelectItem value="P4">⚪ P4 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Project</Label>
                  <Input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} placeholder="e.g., Engineering" />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Due Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Due Time</Label>
                  <Input type="time" value={form.dueTime} onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))} />
                </div>
              </div>

              {/* Effort */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Estimated Effort</Label>
                  <Input type="number" min={0} value={form.estimatedEffort} onChange={e => setForm(f => ({ ...f, estimatedEffort: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Unit</Label>
                  <Select value={form.effortUnit} onValueChange={v => setForm(f => ({ ...f, effortUnit: v as "hours" | "days" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Urgent Flag */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <Label className="text-xs flex-1">Mark as Urgent</Label>
                <Switch checked={form.isUrgent} onCheckedChange={v => setForm(f => ({ ...f, isUrgent: v }))} />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-sm">Tags</Label>
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add tag..." className="flex-1" />
                  <Button size="sm" variant="outline" onClick={addTag}><Plus className="h-3 w-3" /></Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs gap-1">
                        {tag}
                        <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-4 mt-0">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Checklist Items</span>
                {checklist.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {checklist.filter(c => c.completed).length}/{checklist.length}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addChecklistItem())} placeholder="Add checklist item..." />
                <Button size="sm" onClick={addChecklistItem}><Plus className="h-3 w-3" /></Button>
              </div>

              <div className="space-y-1">
                {checklist.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                    <Checkbox checked={item.completed} onCheckedChange={v => {
                      setChecklist(prev => prev.map((c, idx) => idx === i ? { ...c, completed: !!v } : c));
                    }} />
                    <span className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setChecklist(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="subtasks" className="space-y-4 mt-0">
              <div className="flex items-center gap-2">
                <ListTree className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Subtasks</span>
                <Badge variant="secondary" className="text-xs ml-auto">{subtasks.length}</Badge>
              </div>

              <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <Input value={newSubtask.title} onChange={e => setNewSubtask(s => ({ ...s, title: e.target.value }))} placeholder="Subtask title..." />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newSubtask.assignee} onValueChange={v => setNewSubtask(s => ({ ...s, assignee: v }))}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newSubtask.dueDate} onChange={e => setNewSubtask(s => ({ ...s, dueDate: e.target.value }))} />
                </div>
                <Button size="sm" onClick={addSubtask} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Subtask</Button>
              </div>

              <div className="space-y-1">
                {subtasks.map((st, i) => (
                  <div key={st.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{st.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{st.assignee}</span>
                        {st.dueDate && <span>· {st.dueDate}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{st.status}</Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSubtasks(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-0">
              {/* Repeat */}
              <div className="space-y-3 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <Label className="text-xs flex-1 font-medium">Repeat Task</Label>
                  <Switch checked={repeat.enabled} onCheckedChange={v => setRepeat(r => ({ ...r, enabled: v }))} />
                </div>
                {repeat.enabled && (
                  <div className="space-y-2 pl-7">
                    <Select value={repeat.type} onValueChange={v => setRepeat(r => ({ ...r, type: v as RepeatConfig["type"] }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {repeat.type === "custom" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" min={1} value={repeat.interval || 1} onChange={e => setRepeat(r => ({ ...r, interval: Number(e.target.value) }))} placeholder="Every X" />
                        <Select value={repeat.unit || "days"} onValueChange={v => setRepeat(r => ({ ...r, unit: v as "days" | "weeks" | "months" }))}>
                          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                            <SelectItem value="months">Months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox checked={repeat.infinite || false} onCheckedChange={v => setRepeat(r => ({ ...r, infinite: !!v, endDate: v ? undefined : r.endDate }))} />
                      <Label className="text-sm">Repeat indefinitely</Label>
                    </div>
                    {!repeat.infinite && (
                      <div className="space-y-1">
                        <Label className="text-sm">End Date</Label>
                        <Input type="date" value={repeat.endDate || ""} onChange={e => setRepeat(r => ({ ...r, endDate: e.target.value }))} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dependencies */}
              <div className="space-y-2 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <Label className="text-xs font-medium">Dependencies</Label>
                </div>
                <p className="text-xs text-muted-foreground">Select tasks that must be completed before this task can start.</p>
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {tasks.filter(t => t.id !== editTask?.id).map(t => (
                      <div key={t.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                        <Checkbox checked={form.dependencies.includes(t.id)} onCheckedChange={() => toggleDep(t.id)} />
                        <span className="text-xs flex-1 truncate">{t.title}</span>
                        <Badge variant="outline" className="text-[9px]">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button className="gradient-primary text-primary-foreground" onClick={handleSave}>
            {editTask ? "Save Changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
