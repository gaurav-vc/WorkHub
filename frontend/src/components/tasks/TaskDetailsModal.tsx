import { useState, useEffect } from "react";
import {
  X, Pencil, UserPlus, Calendar, ArrowRight, MessageSquare, Info, Search, Send
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { ImageViewerModal } from "@/components/shared/ImageViewerModal";
import { API_BASE } from "@/config";
import { ErrorBoundary } from "../ErrorBoundary";

interface TaskDetailsModalProps {
  taskId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate?: () => void;
  projectId?: number;
  teamMembers?: any[];
  isBoardCard?: boolean;
}


export function TaskDetailsModal({ taskId, open, onOpenChange, onTaskUpdate, projectId, teamMembers = [], isBoardCard = false }: TaskDetailsModalProps) {
  const { token, username } = useAuth();
  const baseUrl = isBoardCard ? `${API_BASE}/boards/cards` : `${API_BASE}/projects/tasks`;
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [taskStack, setTaskStack] = useState<number[]>([]);
  const [taskHistory, setTaskHistory] = useState<{id: number, title: string}[]>([]);
  const currentTaskId = taskStack.length > 0 ? taskStack[taskStack.length - 1] : taskId;

  const [globalUsers, setGlobalUsers] = useState<any[]>([]);

  // UI state for popovers
  const [showComments, setShowComments] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  
  // Image Viewer State
  const [viewerImage, setViewerImage] = useState<{ url: string; alt: string } | null>(null);

  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename || "");
  };

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/calendar/employees/`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setGlobalUsers(Array.isArray(data) ? data : data.results || []))
        .catch(console.error);
    }
  }, [token]);

  useEffect(() => {
    if (open && taskId) {
      setTaskStack([taskId]);
      setTaskHistory([]);
      setShowComments(false);
      setShowChat(false);
      setShowSubtasks(false);
      setShowChecklist(false);
    }
  }, [open, taskId]);

  useEffect(() => {
    if (open && currentTaskId) {
      fetchTaskDetails(currentTaskId);
    }
  }, [open, currentTaskId]);

  const fetchTaskDetails = async (id: number) => {
    try {
      setLoading(true);
      setLoading(true);
      setError(null);
      const res = await fetch(`${baseUrl}/${id}/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        setTaskHistory(prev => {
          if (!prev.find(t => t.id === id)) {
            return [...prev, { id, title: data.title }];
          }
          return prev;
        });
      } else {
        setError("Failed to load task details");
      }
    } catch (e) {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const updateTaskField = async (field: string, value: any) => {
    try {
      if (isBoardCard && field === "assigned_to") field = "assignee";
      const res = await fetch(`${baseUrl}/${currentTaskId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        fetchTaskDetails(currentTaskId);
        if (onTaskUpdate) onTaskUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateSubtask = async (subtaskId: number, payload: any) => {
    try {
      const url = isBoardCard 
        ? `${baseUrl}/${currentTaskId}/update_subtask/` 
        : `${baseUrl}/${subtaskId}/`;
      const finalPayload = isBoardCard ? { subtask_id: subtaskId, ...payload } : payload;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(finalPayload)
      });
      if (res.ok) {
        fetchTaskDetails(currentTaskId);
        if (onTaskUpdate) onTaskUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSubtask = async (subtaskId: number) => {
    if (!confirm("Are you sure you want to delete this subtask?")) return;
    try {
      const url = isBoardCard 
        ? `${baseUrl}/${currentTaskId}/delete_subtask/?subtask_id=${subtaskId}` 
        : `${baseUrl}/${subtaskId}/`;
        
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTaskDetails(currentTaskId);
        if (onTaskUpdate) onTaskUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task) return;
    try {
      const pId = projectId || task.project_id || 1; // Always fallback safely so it doesn't hard error
      
      const payload: any = { 
        title: newSubtaskTitle, 
        parent_task_id: currentTaskId 
      };

      const url = isBoardCard 
        ? `${baseUrl}/${currentTaskId}/add_subtask/` 
        : `${API_BASE}/projects/${pId}/add_task/`;
        
      const finalPayload = isBoardCard 
        ? { title: newSubtaskTitle } 
        : { ...payload, column_id: task.column };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(finalPayload)
      });
      if (res.ok) {
        fetchTaskDetails(currentTaskId);
        setNewSubtaskTitle("");
        if (onTaskUpdate) onTaskUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${baseUrl}/${currentTaskId}/upload/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        fetchTaskDetails(currentTaskId);
      }
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  const STATUSES = ['planning', 'open', 'pending', 'review', 'completed', 'closed'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-2xl p-6 h-[85vh] flex flex-col bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden rounded-xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{task ? task.title : "Loading task"}</DialogTitle>
        <DialogDescription className="sr-only">Task details</DialogDescription>
        
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-600">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">{error}</div>
        ) : task ? (
          <ErrorBoundary>
            <div className="flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Header */}
            <div className="flex flex-col mb-4 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-wide flex items-center gap-2 text-slate-900">
                    {task.project || "Project"} <Pencil className="h-4 w-4 text-slate-400 cursor-pointer" />
                  </h1>
                </div>
              </div>
            </div>

            {/* Card-based Action Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign To</label>
                <Select value={task.assigned_to?.id?.toString() || task.assigned_to?.toString() || "unassigned"} onValueChange={(val) => updateTaskField("assigned_to", val === "unassigned" ? null : val)}>
                  <SelectTrigger className="bg-white border border-slate-200 text-slate-700 h-9 px-3 rounded-md flex items-center gap-2 hover:bg-slate-50 focus:ring-0 shadow-sm">
                    <UserPlus className="h-4 w-4 text-primary shrink-0" />
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {globalUsers.find((u:any) => u.username === username) && (
                      <SelectItem value={globalUsers.find((u:any) => u.username === username).id.toString()}>Self Assign</SelectItem>
                    )}
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {globalUsers.filter((u:any) => u.username !== username).map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.name || m.username}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                <div className="relative flex items-center bg-white border border-slate-200 rounded-md px-3 h-9 gap-2 shadow-sm focus-within:ring-1 focus-within:ring-slate-300">
                  <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                  <Input 
                    type="date" 
                    value={task.due_date ? task.due_date.split('T')[0] : ""}
                    onChange={(e) => updateTaskField("due_date", e.target.value)}
                    className="bg-transparent border-none text-slate-700 p-0 h-auto focus-visible:ring-0 w-full text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <Select value={task.status} onValueChange={(val) => updateTaskField("status", val)}>
                  <SelectTrigger className="bg-white border border-slate-200 text-slate-700 h-9 px-3 rounded-md flex items-center gap-2 hover:bg-slate-50 focus:ring-0 shadow-sm capitalize">
                    <ArrowRight className="h-4 w-4 text-[#eab308] shrink-0" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subheader */}
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-lg font-medium text-slate-800">{task.title}</h2>
              <Pencil className="h-4 w-4 text-slate-400 cursor-pointer" />
            </div>

            {/* Details List */}
            <div className="space-y-2 text-sm mb-10 text-slate-700">
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Created By :</span> <span>{task.created_by_name || "System"}</span></div>
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Created Date :</span> <span>{new Date(task.created_at).toLocaleString()}</span></div>
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Due Date :</span> <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : ""}</span></div>
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Assign To :</span> <span>{task.assignee_detail?.name || "Unassigned"}</span></div>
            </div>

            {/* Checklist Section */}
            <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <button 
                onClick={() => setShowChecklist(!showChecklist)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-slate-800 text-sm font-semibold">Checklist</h3>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{task.checklists?.length || 0}</span>
                </div>
                <span className="text-slate-400 text-xs">{showChecklist ? "▼" : "▶"}</span>
              </button>
              
              <div className={`transition-all overflow-hidden ${showChecklist ? "max-h-[500px]" : "max-h-0"}`}>
                <div className="p-3 border-t border-slate-200">
                  {task.checklists && task.checklists.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {task.checklists.map((ck: any) => (
                        <div key={ck.id} className="flex items-center gap-2 bg-slate-50/50 p-2 rounded border border-slate-100">
                          <input 
                            type="checkbox" 
                            checked={ck.is_completed} 
                            onChange={async () => {
                              await fetch(`${baseUrl}/${currentTaskId}/toggle_checklist/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                                body: JSON.stringify({ checklist_id: ck.id })
                              });
                              fetchTaskDetails(currentTaskId);
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" 
                          />
                          <span className={`text-sm ${ck.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{ck.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input 
                      value={newChecklist}
                      onChange={(e) => setNewChecklist(e.target.value)}
                      placeholder="Add New Checklist..." 
                      className="h-8 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button 
                      onClick={async () => {
                        if (!newChecklist.trim()) return;
                        await fetch(`${baseUrl}/${currentTaskId}/add_checklist/`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                          body: JSON.stringify({ title: newChecklist })
                        });
                        fetchTaskDetails(currentTaskId);
                        setNewChecklist("");
                      }} 
                      className="h-8 text-xs bg-primary hover:bg-primary/90 text-white px-4">Add</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub Task Section */}
            <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <button 
                onClick={() => setShowSubtasks(!showSubtasks)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-slate-800 text-sm font-semibold">Sub Tasks</h3>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{task.subtasks?.length || 0}</span>
                  {taskStack.length > 1 && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit ml-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        setTaskStack(prev => prev.slice(0, prev.length - 1));
                        setTaskHistory(prev => prev.slice(0, prev.length - 1));
                      }} className="hover:underline font-semibold">
                        &larr; Back to Parent Task
                      </button>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600">Child Lvl {taskStack.length - 1}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-400 text-xs">{showSubtasks ? "▼" : "▶"}</span>
                </div>
              </button>
              
              <div className={`transition-all overflow-hidden ${showSubtasks ? "max-h-[800px]" : "max-h-0"}`}>
                <div className="p-3 border-t border-slate-200">
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {task.subtasks.map((st: any) => (
                        <div 
                          key={st.id} 
                          onClick={() => {
                            if (!isBoardCard) setTaskStack(prev => [...prev, st.id]);
                          }}
                          className={`p-2.5 bg-white border border-slate-200 shadow-sm rounded flex justify-between items-center ${!isBoardCard ? 'cursor-pointer hover:bg-slate-50 hover:border-blue-300' : ''} transition-all group`}
                          title={!isBoardCard ? "Click to view child tasks inside this subtask" : ""}
                        >
                          <span className={`text-sm text-slate-800 font-medium ${!isBoardCard ? 'group-hover:text-blue-600' : ''} transition-colors truncate max-w-[200px]`}>{st.title}</span>
                          <div className="flex items-center gap-2">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select 
                                value={st.assignee?.toString() || st.assigned_to?.toString() || "unassigned"} 
                                onValueChange={(val) => updateSubtask(st.id, { assigned_to: val === "unassigned" ? null : val })}
                              >
                                <SelectTrigger className="h-7 w-[100px] text-[10px] px-2 py-0 border-slate-200 bg-slate-50 font-semibold focus:ring-0 truncate">
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  <SelectItem value="self">Self Assign</SelectItem>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {globalUsers.filter((u:any) => u.username !== username).map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.name || m.username}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select 
                                value={st.status} 
                                onValueChange={(val) => updateSubtask(st.id, { status: val })}
                              >
                                <SelectTrigger className="h-7 w-[100px] text-[10px] px-2 py-0 border-slate-200 uppercase tracking-wider bg-slate-50 font-semibold focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0" 
                              onClick={(e) => { e.stopPropagation(); deleteSubtask(st.id); }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-slate-400 group-hover:text-blue-500 ml-1">&rarr;</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input 
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                      placeholder="Add New Subtask..." 
                      className="h-8 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button onClick={addSubtask} className="h-8 text-xs bg-primary hover:bg-primary/90 text-white px-4">Add</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachment Section */}
            <div className="mb-6 border border-slate-200 rounded-lg bg-white shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400" />
                  Attachments
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{task.attachments?.length || 0}</span>
                </h3>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors">
                    <Info className="h-3.5 w-3.5" /> Upload File
                  </div>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {task.attachments && task.attachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {task.attachments.map((att: any) => {
                    const fileName = att.file_name || att.file.split('/').pop() || "Attachment";
                    const isImg = isImageFile(fileName);
                    const url = att.file.startsWith('http') ? att.file : `${API_BASE.replace('/api', '')}${att.file}`;
                    return (
                      <div key={att.id} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50 aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => {
                          if (isImg) {
                            setViewerImage({ url, alt: fileName });
                          } else {
                            window.open(url, '_blank');
                          }
                        }}>
                        {isImg ? (
                          <img src={url} alt={fileName} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <div className="flex flex-col items-center text-slate-400 p-2">
                            <Info className="h-8 w-8 mb-2 text-blue-400" />
                            <span className="text-[10px] font-medium text-center truncate w-full text-slate-600">{fileName}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-semibold">{isImg ? 'View Image' : 'Download File'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  No attachments yet. Click "Upload File" to add one.
                </div>
              )}
            </div>
            </div>
          </ErrorBoundary>
        ) : null}



        {/* Slide-in Chat Panel */}
        {showChat && (
          <div className="absolute top-0 right-0 h-full w-[260px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 transition-transform">
            <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-blue-50">
              <button onClick={() => setShowChat(false)} className="text-slate-500 hover:text-slate-900 px-1">
                &larr;
              </button>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Task Chat</h3>
            </div>
            
            <div className="flex-1 p-2.5 overflow-y-auto bg-slate-50">
              {task?.chats && task.chats.length > 0 ? (
                task.chats.map((c: any) => (
                  <div key={c.id} className={`mb-3 flex flex-col ${c.user_name === (globalUsers.find((u:any) => u.username === username)?.name || 'You') ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-slate-500 font-bold block mb-0.5">{c.user_name}</span>
                    <p className={`text-xs p-2 rounded-lg max-w-[90%] shadow-sm ${c.user_name === (globalUsers.find((u:any) => u.username === username)?.name || 'You') ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                      {c.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-500 mt-6">Start the conversation...</div>
              )}
            </div>

            <div className="p-2 bg-white border-t border-slate-200">
              <div className="relative">
                <Input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && chatInput.trim()) {
                      await fetch(`${baseUrl}/${currentTaskId}/add_chat/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify({ text: chatInput })
                      });
                      fetchTaskDetails(currentTaskId);
                      setChatInput("");
                    }
                  }}
                  placeholder="Type a message..."
                  className="bg-slate-50 border-slate-200 text-slate-900 pr-10 focus-visible:ring-1 focus-visible:ring-blue-500"
                />
                <button className="absolute right-2 top-2 text-slate-400 hover:text-blue-500">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Modal */}
        {viewerImage && (
          <ImageViewerModal
            open={!!viewerImage}
            onOpenChange={(open) => !open && setViewerImage(null)}
            imageUrl={viewerImage.url}
            altText={viewerImage.alt}
          />
        )}


      </DialogContent>
    </Dialog>
  );
}
