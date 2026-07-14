import { useState } from "react";
import {
  X, Clock, Calendar, Users, Link2, Flag, CheckSquare, MessageSquare, Send,
  Paperclip, ListTree, FileText, AlertTriangle, RotateCcw, Edit, Trash2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTaskContext } from "@/context/TaskContext";
import { Task } from "@/types/tasks";

const priorityConfig: Record<string, { color: string; label: string }> = {
  P1: { color: "bg-destructive text-destructive-foreground", label: "Critical" },
  P2: { color: "bg-warning text-warning-foreground", label: "High" },
  P3: { color: "bg-info text-info-foreground", label: "Medium" },
  P4: { color: "bg-muted text-muted-foreground", label: "Low" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  "todo": { color: "bg-muted text-muted-foreground", label: "To Do" },
  "in-progress": { color: "bg-primary/10 text-primary", label: "In Progress" },
  "done": { color: "bg-success/10 text-success", label: "Done" },
  "blocked": { color: "bg-destructive/10 text-destructive", label: "Blocked" },
};

export function TaskWorkspacePanel() {
  const { selectedTask, setSelectedTask, updateTask, tasks } = useTaskContext();
  const [chatInput, setChatInput] = useState("");
  const [commentInput, setCommentInput] = useState("");

  if (!selectedTask) return null;

  const task = selectedTask;
  const checklist = task.checklist || [];
  const subtasks = task.subtasks || [];
  const dependencies = task.dependencies || [];
  const pConfig = priorityConfig[task.priority] || priorityConfig.P3;
  const sConfig = statusConfig[task.status] || statusConfig.todo;
  const checklistProgress = checklist.length > 0
    ? Math.round((checklist.filter(c => c.completed).length / checklist.length) * 100) : 0;
  const subtaskProgress = subtasks.length > 0
    ? Math.round((subtasks.filter(s => s.status === "done").length / subtasks.length) * 100) : 0;

  const depTasks = tasks.filter(t => dependencies.includes(t.id));
  const blockedByIncomplete = depTasks.some(t => t.status !== "done");

  const sendChat = () => {
    if (!chatInput.trim()) return;
    updateTask(task.id, {
      chat: [...task.chat, { id: `ch-${Date.now()}`, user: "Sarah Johnson", initials: "SJ", text: chatInput, time: "Just now" }],
    });
    setChatInput("");
  };

  const addComment = () => {
    if (!commentInput.trim()) return;
    updateTask(task.id, {
      comments: [...(task.comments || []), { id: `c-${Date.now()}`, user: "Sarah Johnson", initials: "SJ", text: commentInput, time: "Just now" }],
    });
    setCommentInput("");
  };

  const toggleChecklist = (idx: number) => {
    const updated = (task.checklist || []).map((c, i) => i === idx ? { ...c, completed: !c.completed } : c);
    updateTask(task.id, { checklist: updated });
  };

  const updateSubtaskStatus = (idx: number, status: "todo" | "in-progress" | "done") => {
    const updated = (task.subtasks || []).map((s, i) => i === idx ? { ...s, status } : s);
    updateTask(task.id, { subtasks: updated });
  };

  return (
    <Sheet open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 pb-3 border-b space-y-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {task.isUrgent && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                <SheetTitle className="text-base font-semibold truncate">{task.title}</SheetTitle>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge className={`${pConfig.color} text-[10px]`}>{task.priority} {pConfig.label}</Badge>
                <Badge className={`${sConfig.color} text-[10px]`}>{sConfig.label}</Badge>
                {task.isUrgent && <Badge variant="destructive" className="text-[10px]">🔥 Urgent</Badge>}
                {task.repeat?.enabled && <Badge variant="outline" className="text-[10px] gap-0.5"><RotateCcw className="h-2.5 w-2.5" />{task.repeat.type}</Badge>}
                {blockedByIncomplete && <Badge variant="destructive" className="text-[10px]">⛔ Blocked</Badge>}
              </div>
            </div>
            {/* Status change */}
            <Select value={task.status} onValueChange={v => updateTask(task.id, { status: v as Task["status"] })}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 grid grid-cols-6 h-8">
            <TabsTrigger value="info" className="text-[10px] px-1">Info</TabsTrigger>
            <TabsTrigger value="chat" className="text-[10px] px-1">Chat</TabsTrigger>
            <TabsTrigger value="comments" className="text-[10px] px-1">Comments</TabsTrigger>
            <TabsTrigger value="checklist" className="text-[10px] px-1">Check</TabsTrigger>
            <TabsTrigger value="subtasks" className="text-[10px] px-1">Sub</TabsTrigger>
            <TabsTrigger value="files" className="text-[10px] px-1">Files</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-4">
            {/* Info Tab */}
            <TabsContent value="info" className="mt-0 space-y-4">
              {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={Calendar} label="Start Date" value={task.startDate || "—"} />
                <InfoRow icon={Calendar} label="Due Date" value={task.dueDate || "—"} />
                <InfoRow icon={Clock} label="Due Time" value={task.dueTime || "—"} />
                <InfoRow icon={Calendar} label="Created" value={task.createdDate} />
                <InfoRow icon={Flag} label="Effort (Est.)" value={`${task.estimatedEffort} ${task.effortUnit}`} />
                <InfoRow icon={Flag} label="Effort (Actual)" value={`${task.actualEffort} ${task.effortUnit}`} />
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Created By</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] bg-primary/10 text-primary">{task.createdBy.initials}</AvatarFallback></Avatar>
                  <span className="text-sm">{task.createdBy.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
                <div className="flex flex-wrap gap-2">
                  {(task.assignees || []).map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2 py-1">
                      <Avatar className="h-5 w-5"><AvatarFallback className="text-[7px] bg-primary/10 text-primary">{a.initials}</AvatarFallback></Avatar>
                      <span className="text-xs">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {depTasks.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" /> Dependencies</p>
                    {depTasks.map(dt => (
                      <div key={dt.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                        <span className="text-xs flex-1">{dt.title}</span>
                        <Badge variant="outline" className={`text-[9px] ${statusConfig[dt.status]?.color}`}>{dt.status}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {(task.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(task.tags || []).map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                </div>
              )}
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="mt-0 space-y-3">
              {(task.chat || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>}
              {(task.chat || []).map(msg => (
                <div key={msg.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[8px] bg-primary/10 text-primary">{msg.initials}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{msg.user}</span>
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm mt-0.5">{msg.text}</p>
                    {msg.file && <Badge variant="outline" className="text-[10px] mt-1 gap-1"><Paperclip className="h-2.5 w-2.5" />{msg.file}</Badge>}
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && sendChat()} className="flex-1" />
                <Button size="icon" onClick={sendChat}><Send className="h-4 w-4" /></Button>
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="mt-0 space-y-3">
              {(task.comments || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No comments yet.</p>}
              {(task.comments || []).map(c => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[8px] bg-accent/10 text-accent">{c.initials}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0 p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{c.user}</span>
                      <span className="text-[10px] text-muted-foreground">{c.time}</span>
                    </div>
                    <p className="text-sm mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t">
                <Textarea value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="Add a comment... Use @name to mention" rows={2} className="flex-1" />
                <Button size="sm" onClick={addComment} className="self-end">Post</Button>
              </div>
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="mt-0 space-y-3">
              {(task.checklist || []).length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{(task.checklist || []).filter(c => c.completed).length}/{(task.checklist || []).length}</span>
                  </div>
                  <Progress value={checklistProgress} className="h-2" />
                </div>
              )}
              {(task.checklist || []).map((item, i) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                  <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklist(i)}
                    className="data-[state=checked]:bg-success data-[state=checked]:border-success" />
                  <span className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                </div>
              ))}
              {(task.checklist || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No checklist items.</p>}
            </TabsContent>

            {/* Subtasks Tab */}
            <TabsContent value="subtasks" className="mt-0 space-y-3">
              {(task.subtasks || []).length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Subtask Progress</span>
                    <span className="font-semibold">{(task.subtasks || []).filter(s => s.status === "done").length}/{(task.subtasks || []).length}</span>
                  </div>
                  <Progress value={subtaskProgress} className="h-2" />
                </div>
              )}
              {(task.subtasks || []).map((st, i) => (
                <div key={st.id} className="p-3 rounded-lg border bg-card space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{st.title}</span>
                    <Select value={st.status} onValueChange={v => updateSubtaskStatus(i, v as "todo" | "in-progress" | "done")}>
                      <SelectTrigger className="w-[100px] h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />{st.assignee}
                    {st.dueDate && <><Calendar className="h-3 w-3 ml-2" />{st.dueDate}</>}
                  </div>
                </div>
              ))}
              {(task.subtasks || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No subtasks.</p>}
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="mt-0 space-y-3">
              {(task.attachments || []).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.size} · {a.uploadedBy} · {a.uploadedAt}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">Download</Button>
                </div>
              ))}
              {(task.attachments || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No attachments.</p>}
              <Button variant="outline" className="w-full gap-1.5"><Paperclip className="h-4 w-4" /> Upload File</Button>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
