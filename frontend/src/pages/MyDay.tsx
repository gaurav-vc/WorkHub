import { useState, useEffect } from "react";
import {
  CheckSquare, Plus, Clock, Flag, Circle, CheckCircle2, Calendar, Users, Video,
  RotateCcw, AlertTriangle, Link2, MoreHorizontal, Edit, Trash2, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTaskContext } from "@/context/TaskContext";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { TaskWorkspacePanel } from "@/components/tasks/TaskWorkspacePanel";
import { Task } from "@/types/tasks";
import { useAuth } from "@/context/AuthContext";
import { getMyDayDashboard } from "@/api/tasks";

const priorityConfig: Record<string, { color: string; label: string }> = {
  P1: { color: "bg-destructive text-destructive-foreground", label: "P1 Critical" },
  P2: { color: "bg-warning text-warning-foreground", label: "P2 High" },
  P3: { color: "bg-info text-info-foreground", label: "P3 Medium" },
  P4: { color: "bg-muted text-muted-foreground", label: "P4 Low" },
};

const statusIcon = (status: string) => {
  if (status === "in-progress") return <div className="h-4 w-4 rounded-full border-2 border-primary bg-primary/20" />;
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "blocked") return <AlertTriangle className="h-4 w-4 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};

export default function MyDay() {
  const { token } = useAuth();
  const { tasks, addTask, updateTask, deleteTask, setSelectedTask } = useTaskContext();
  const [newTask, setNewTask] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [meetings, setMeetings] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      getMyDayDashboard()
        .then(data => setMeetings(data.upcomingMeetings || []))
        .catch(console.error);
    }
  }, [token]);

  const filteredTasks = tasks.filter(t => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return a.priority.localeCompare(b.priority);
  });

  const handleQuickAdd = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`, title: newTask.trim(), description: "", taskType: "self",
      priority: "P3", status: "todo", project: "Personal",
      assignees: [{ name: "Sarah Johnson", initials: "SJ" }],
      createdBy: { name: "Sarah Johnson", initials: "SJ" },
      createdDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      dueDate: "", dueTime: "", startDate: "",
      estimatedEffort: 0, effortUnit: "hours", actualEffort: 0,
      isUrgent: false, repeat: { enabled: false, type: "daily" },
      dependencies: [], checklist: [], subtasks: [], comments: [], chat: [], attachments: [], tags: [],
    };
    addTask(task);
    setNewTask("");
  };

  const toggleComplete = (task: Task) => {
    updateTask(task.id, { status: task.status === "done" ? "todo" : "done" });
  };

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Day</h1>
          <p className="text-muted-foreground mt-1">{dayName}, {dateStr}</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => { setEditTask(null); setShowCreate(true); }}>
          <Plus className="h-4 w-4" /> Create Task
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Add */}
          <Card className="shadow-card">
            <CardContent className="p-3">
              <div className="flex gap-2">
                <Input placeholder="Quick add a task..." value={newTask} onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleQuickAdd()} className="flex-1" />
                <Button size="sm" onClick={handleQuickAdd} className="gradient-primary text-primary-foreground gap-1.5">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="P1">🔴 P1 Critical</SelectItem>
                <SelectItem value="P2">🟠 P2 High</SelectItem>
                <SelectItem value="P3">🔵 P3 Medium</SelectItem>
                <SelectItem value="P4">⚪ P4 Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs h-8 px-3 flex items-center">{sortedTasks.length} tasks</Badge>
          </div>

          {/* Task List */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" /> Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {sortedTasks.map(task => {
                  const done = task.status === "done";
                  const pConfig = priorityConfig[task.priority] || priorityConfig.P4;
                  const checklistDone = (task.checklist || []).filter(c => c.completed).length;
                  const checklistTotal = (task.checklist || []).length;
                  return (
                    <div key={task.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group cursor-pointer ${done ? "opacity-50" : ""} ${task.isUrgent && !done ? "bg-destructive/5 border-l-2 border-l-destructive" : ""}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {task.isUrgent && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                          <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`${pConfig.color} text-[10px] px-1.5 py-0 font-semibold`}>{task.priority}</Badge>
                          {task.project && <span className="text-xs text-muted-foreground">{task.project}</span>}
                          {(task.dependencies || []).length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Link2 className="h-2.5 w-2.5" />{(task.dependencies || []).length} deps</span>
                          )}
                          {task.repeat?.enabled && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><RotateCcw className="h-2.5 w-2.5" />{task.repeat.type}</span>
                          )}
                          {checklistTotal > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><CheckSquare className="h-2.5 w-2.5" />{checklistDone}/{checklistTotal}</span>
                          )}
                          {(task.subtasks || []).length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{(task.subtasks || []).filter(s => s.status === "done").length}/{(task.subtasks || []).length} subtasks</span>
                          )}
                          {(task.assignees || []).length > 1 && (
                            <div className="flex -space-x-1">
                              {(task.assignees || []).slice(0, 3).map((a, i) => (
                                <Avatar key={i} className="h-4 w-4 border border-card">
                                  <AvatarFallback className="text-[6px] bg-primary/10 text-primary">{a.initials}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {task.dueTime && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mr-1">
                          <Clock className="h-3 w-3" />{task.dueTime}
                        </div>
                      )}
                      
                      <div className="shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                        <Select value={task.status} onValueChange={v => updateTask(task.id, { status: v as "todo" | "in-progress" | "done" | "blocked" })}>
                          <SelectTrigger className={`w-[105px] h-7 text-[10px] font-semibold border-none ${task.status === 'done' ? 'bg-success/10 text-success' : task.status === 'in-progress' ? 'bg-primary/10 text-primary' : task.status === 'blocked' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end">
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}><Eye className="h-3.5 w-3.5 mr-1.5" /> Open</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTask(task); setShowCreate(true); }}><Edit className="h-3.5 w-3.5 mr-1.5" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                {sortedTasks.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No tasks match your filters</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Mini Calendar */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />{monthName}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                  <div key={d} className="py-1 font-semibold text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === today.getDate();
                  return (
                    <div key={day} className={`py-1 rounded-md cursor-pointer transition-colors ${isToday ? "gradient-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"}`}>
                      {day}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Meetings */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Video className="h-4 w-4 text-accent" /> Meetings Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {meetings.length > 0 ? meetings.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-8 w-1 rounded-full gradient-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />{m.time} · {m.duration}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />{m.attendees?.length || m.attendees || 0} attendees
                      {m.type === "recurring" && <span className="flex items-center gap-0.5 ml-1"><RotateCcw className="h-3 w-3" /> Recurring</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7 shrink-0">Join</Button>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">No meetings for today.</p>
              )}
            </CardContent>
          </Card>

          {/* Task Summary */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Task Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "To Do", count: tasks.filter(t => t.status === "todo").length, color: "bg-muted" },
                { label: "In Progress", count: tasks.filter(t => t.status === "in-progress").length, color: "bg-primary" },
                { label: "Blocked", count: tasks.filter(t => t.status === "blocked").length, color: "bg-destructive" },
                { label: "Done", count: tasks.filter(t => t.status === "done").length, color: "bg-success" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${s.color}`} />
                    <span className="text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="font-semibold">{s.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskCreateDialog open={showCreate} onOpenChange={setShowCreate} editTask={editTask} />
      <TaskWorkspacePanel />
    </div>
  );
}
