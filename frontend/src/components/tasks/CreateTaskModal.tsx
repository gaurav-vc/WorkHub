import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { API_BASE } from "@/config";
import { ErrorBoundary } from "../ErrorBoundary";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (taskData: any) => Promise<void> | void;
  teamMembers?: any[];
  tasks?: any[];
}

export function CreateTaskModal({ open, onOpenChange, onSubmit, teamMembers, tasks }: CreateTaskModalProps) {
  const [taskType, setTaskType] = useState<"self" | "assign">("self");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dependentTask, setDependentTask] = useState<string>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  useEffect(() => {
    if (open) {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      fetch(`${API_BASE}/calendar/employees/`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(data => setGlobalUsers(Array.isArray(data) ? data : data.results || []))
        .catch(console.error);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate) {
      alert("Please fill in required fields (Task Topic and Due Date)");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        dueDate,
        description,
        taskType,
        assignedTo: taskType === "assign" && assignedTo !== "unassigned" ? parseInt(assignedTo) : null,
        file,
        dependentTask: dependentTask !== "none" ? parseInt(dependentTask) : null,
        isUrgent,
        isRepeat
      });
      // Reset form
      setTitle("");
      setDueDate("");
      setDescription("");
      setFile(null);
      setTaskType("self");
      setAssignedTo("unassigned");
      setDependentTask("none");
      setIsUrgent(false);
      setIsRepeat(false);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      alert("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <ErrorBoundary>
          <DialogHeader className="px-6 py-4 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Create Task
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <Tabs value={taskType} onValueChange={(v) => setTaskType(v as "self" | "assign")} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="self">Self Task</TabsTrigger>
                <TabsTrigger value="assign">Assign to others</TabsTrigger>
              </TabsList>
              <TabsContent value="self" className="hidden" />
              <TabsContent value="assign" className="hidden" />
            </Tabs>

            <div className="space-y-6">
              {taskType === "assign" && (
                <div className="bg-muted/20 p-4 rounded-lg border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Assign To <span className="text-destructive">*</span></Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select a team member..." />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(Array.isArray(teamMembers) && teamMembers.length ? teamMembers : (Array.isArray(globalUsers) ? globalUsers : [])).map((m: any, idx) => {
                        const uniqueVal = m?.id ? m.id.toString() : (m?.email || m?.username || m?.name || `user-${idx}`);
                        const displayName = m?.name || m?.username || m?.email || "Unknown User";
                        return (
                          <SelectItem key={uniqueVal} value={uniqueVal}>
                            {displayName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-6 sm:mt-8">
                    <div className="flex items-center gap-2">
                      <Switch checked={isUrgent} onCheckedChange={setIsUrgent} id="urgent" />
                      <Label htmlFor="urgent" className="text-sm font-medium cursor-pointer">Urgent Priority</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={isRepeat} onCheckedChange={setIsRepeat} id="repeat" />
                      <Label htmlFor="repeat" className="text-sm font-medium cursor-pointer">Recurring Task</Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Task Topic <span className="text-destructive">*</span></Label>
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Due Date <span className="text-destructive">*</span></Label>
                  <Input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Task Description</Label>
                <Textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details about this task..."
                  className="resize-none h-24 bg-background" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Attachment</Label>
                <div className="border-2 border-dashed border-border/60 rounded-lg h-20 flex flex-col items-center justify-center relative hover:bg-muted/50 transition-colors bg-background group cursor-pointer">
                  <Input 
                    type="file" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                  />
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="text-primary">{file ? file.name : "Click to select a file"}</span>
                    {!file && <span className="font-normal text-xs">(or drag and drop)</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Select Dependent Tasks (Optional)</Label>
                <Select value={dependentTask} onValueChange={setDependentTask}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select tasks..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Array.isArray(tasks) && tasks.map((t: any, idx) => {
                      const uniqueVal = t?.id ? t.id.toString() : `task-${idx}`;
                      const displayTitle = t?.title || "Untitled Task";
                      return (
                        <SelectItem key={uniqueVal} value={uniqueVal}>
                          {displayTitle}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
