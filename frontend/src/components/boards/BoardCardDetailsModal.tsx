import { useState, useEffect } from "react";
import {
  X, Pencil, UserPlus, Calendar, ArrowRight, MessageSquare, Plus, Info, Search, Send, Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { ImageViewerModal } from "@/components/shared/ImageViewerModal";
import { API_BASE } from "@/config";

interface BoardCardDetailsModalProps {
  cardId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardUpdate?: () => void;
  boardId?: number;
  teamMembers?: string[];
}


export function BoardCardDetailsModal({ cardId, open, onOpenChange, onCardUpdate, boardId, teamMembers = [] }: BoardCardDetailsModalProps) {
  const { token, username } = useAuth();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cardStack, setCardStack] = useState<number[]>([]);
  const [cardHistory, setCardHistory] = useState<{id: number, title: string}[]>([]);
  const currentCardId = cardStack.length > 0 ? cardStack[cardStack.length - 1] : cardId;

  const [globalUsers, setGlobalUsers] = useState<any[]>([]);

  // UI state for popovers
  const [showComments, setShowComments] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newSubcardTitle, setNewSubcardTitle] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showChecklist, setShowChecklist] = useState(false);
  const [showSubcards, setShowSubcards] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  
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
    if (open && cardId) {
      setCardStack([cardId]);
      setCardHistory([]);
      setShowComments(false);
      setShowChat(false);
      setShowChecklist(false);
      setShowSubcards(false);
    }
  }, [open, cardId]);

  useEffect(() => {
    if (open && currentCardId) {
      fetchCardDetails(currentCardId);
    }
  }, [open, currentCardId]);

  const fetchCardDetails = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/boards/cards/${id}/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCard(data);
        setCardHistory(prev => {
          if (!prev.find(t => t.id === id)) {
            return [...prev, { id, title: data.title }];
          }
          return prev;
        });
      } else {
        setError("Failed to load card details");
      }
    } catch (e) {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const updateCardField = async (field: string, value: any) => {
    try {
      const res = await fetch(`${API_BASE}/boards/cards/${currentCardId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        fetchCardDetails(currentCardId);
        if (onCardUpdate) onCardUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCurrentCard = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`${API_BASE}/boards/cards/${currentCardId}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        if (onCardUpdate) onCardUpdate();
        onOpenChange(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateSubcard = async (subcardId: number, payload: any) => {
    try {
      const res = await fetch(`${API_BASE}/boards/cards/${currentCardId}/update_subtask/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ subtask_id: subcardId, ...payload })
      });
      if (res.ok) {
        fetchCardDetails(currentCardId);
        if (onCardUpdate) onCardUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSubcard = async (subcardId: number) => {
    if (!confirm("Are you sure you want to delete this subcard?")) return;
    try {
      const res = await fetch(`${API_BASE}/boards/cards/${currentCardId}/delete_subtask/?subtask_id=${subcardId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCardDetails(currentCardId);
        if (onCardUpdate) onCardUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addSubcard = async () => {
    if (!newSubcardTitle.trim() || !card) return;
    try {
      const pId = boardId || card.board_id || 1; // Always fallback safely so it doesn't hard error
      
      const payload: any = { 
        title: newSubcardTitle, 
        parent_card_id: currentCardId 
      };

      const res = await fetch(`${API_BASE}/boards/cards/${currentCardId}/add_subtask/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchCardDetails(currentCardId);
        setNewSubcardTitle("");
        if (onCardUpdate) onCardUpdate();
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
      const res = await fetch(`${API_BASE}/boards/cards/${currentCardId}/upload/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        fetchCardDetails(currentCardId);
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
        <DialogTitle className="sr-only">{card ? card.title : "Loading card"}</DialogTitle>
        <DialogDescription className="sr-only">Card details</DialogDescription>
        
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-600">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">{error}</div>
        ) : card ? (
          <div className="flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Header */}
            <div className="flex flex-col mb-4 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-wide flex items-center gap-2 text-slate-900">
                    {card.board_title || "Board"}
                  </h1>
                </div>
                <button 
                  onClick={deleteCurrentCard}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" /> Delete Task
                </button>
              </div>
            </div>

            {/* Card-based Action Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign To</label>
                <Select value={card.assignee?.toString() || "unassigned"} onValueChange={(val) => updateCardField("assignee", val === "unassigned" ? null : val)}>
                  <SelectTrigger className="bg-white border border-slate-200 text-slate-700 h-9 px-3 rounded-md flex items-center gap-2 hover:bg-slate-50 focus:ring-0 shadow-sm">
                    <UserPlus className="h-4 w-4 text-primary shrink-0" />
                    <SelectValue placeholder="Assign" />
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
                    value={card.due_date || ""}
                    onChange={(e) => updateCardField("due_date", e.target.value)}
                    className="bg-transparent border-none text-slate-700 p-0 h-auto focus-visible:ring-0 w-full text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <Select value={card.status} onValueChange={(val) => updateCardField("status", val)}>
                  <SelectTrigger className="bg-white border border-slate-200 text-slate-700 h-9 px-3 rounded-md flex items-center gap-2 hover:bg-slate-50 focus:ring-0 shadow-sm capitalize">
                    <ArrowRight className="h-4 w-4 text-[#eab308] shrink-0" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center gap-2 h-9">
                  <button 
                    onClick={() => {
                      setShowChat(!showChat);
                      setShowComments(false);
                    }}
                    className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md flex items-center justify-center gap-1.5 transition-all shadow-sm px-3 whitespace-nowrap h-full w-full"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" /> <span className="text-xs font-semibold">Chat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subheader */}
            <div className="flex items-center gap-2 mb-6">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 w-full max-w-md">
                  <Input 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)} 
                    className="h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateCardField("title", editTitle);
                        setIsEditingTitle(false);
                      } else if (e.key === "Escape") {
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground" 
                    onClick={() => {
                      updateCardField("title", editTitle);
                      setIsEditingTitle(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setIsEditingTitle(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-medium text-slate-800">{card.title}</h2>
                  <Pencil 
                    className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600" 
                    onClick={() => {
                      setEditTitle(card.title);
                      setIsEditingTitle(true);
                    }} 
                  />
                </>
              )}
            </div>

            {/* Details List */}
            <div className="space-y-2 text-sm mb-10 text-slate-700">
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Start Date :</span> <span></span></div>
              <div className="flex"><span className="w-32 text-slate-500 font-medium">End Date :</span> <span></span></div>
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Created By :</span> <span>{card.created_by_name || "Unknown"}</span></div>
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Created Date :</span> <span>{new Date(card.created_at).toLocaleString()}</span></div>
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Due Date :</span> <span>{card.due_date ? new Date(card.due_date).toLocaleDateString() : "Not set"}</span></div>
              <div className="flex"><span className="w-32 text-slate-500 font-medium">Assign To :</span> <span>{card.assignee_detail?.name || "Unassigned"}</span></div>
            </div>

            {/* Add Checklist Handler */}
            <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <button 
                onClick={() => setShowChecklist(!showChecklist)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-slate-800 text-sm font-semibold">Checklist</h3>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{card.checklists?.length || 0}</span>
                </div>
                <span className="text-slate-400 text-xs">{showChecklist ? "▼" : "▶"}</span>
              </button>
              
              <div className={`transition-all overflow-hidden ${showChecklist ? "max-h-[500px]" : "max-h-0"}`}>
                <div className="p-3 border-t border-slate-200">
                  {card.checklists && card.checklists.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {card.checklists.map((ck: any) => (
                        <div key={ck.id} className="flex items-center gap-2 bg-slate-50/50 p-2 rounded border border-slate-100">
                          <input type="checkbox" checked={ck.is_completed} readOnly className="rounded border-slate-300 text-primary focus:ring-primary" />
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
                        await fetch(`${API_BASE}/boards/cards/${currentCardId}/add_checklist/`, {
                          method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}, body: JSON.stringify({ title: newChecklist })
                        });
                        fetchCardDetails(currentCardId);
                        setNewChecklist("");
                      }} 
                      className="h-8 text-xs bg-primary hover:bg-primary/90 text-white px-4">Add</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub Card Section */}
            <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <button 
                onClick={() => setShowSubcards(!showSubcards)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-slate-800 text-sm font-semibold">Sub Cards</h3>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{card.subcards?.length || 0}</span>
                  {cardStack.length > 1 && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit ml-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        setCardStack(prev => prev.slice(0, prev.length - 1));
                        setCardHistory(prev => prev.slice(0, prev.length - 1));
                      }} className="hover:underline font-semibold">
                        &larr; Back to Parent Card
                      </button>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600">Child Lvl {cardStack.length - 1}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-400 text-xs">{showSubcards ? "▼" : "▶"}</span>
                </div>
              </button>
              
              <div className={`transition-all overflow-hidden ${showSubcards ? "max-h-[800px]" : "max-h-0"}`}>
                <div className="p-3 border-t border-slate-200">
                  {card.subcards && card.subcards.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {card.subcards.map((st: any) => (
                        <div 
                          key={st.id} 
                          onClick={() => setCardStack(prev => [...prev, st.id])}
                          className="p-2.5 bg-white border border-slate-200 shadow-sm rounded flex justify-between items-center cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group"
                          title="Click to view child cards inside this subcard"
                        >
                          <span className="text-sm text-slate-800 font-medium group-hover:text-blue-600 transition-colors truncate max-w-[200px]">{st.title}</span>
                          <div className="flex items-center gap-2">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select 
                                value={st.assignee?.toString() || "unassigned"} 
                                onValueChange={(val) => updateSubcard(st.id, { assigned_to: val === "unassigned" ? null : val })}
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
                                onValueChange={(val) => updateSubcard(st.id, { status: val })}
                              >
                                <SelectTrigger className="h-7 w-[100px] text-[10px] px-2 py-0 border-slate-200 uppercase tracking-wider bg-slate-50 font-semibold focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  <SelectItem value="pending">PENDING</SelectItem>
                                  <SelectItem value="delay">DELAY</SelectItem>
                                  <SelectItem value="completed">COMPLETED</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0" 
                              onClick={(e) => { e.stopPropagation(); deleteSubcard(st.id); }}
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
                      value={newSubcardTitle}
                      onChange={(e) => setNewSubcardTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubcard()}
                      placeholder="Add New Subcard..." 
                      className="h-8 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button onClick={addSubcard} className="h-8 text-xs bg-primary hover:bg-primary/90 text-white px-4">Add</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachment Section */}
            <div className="mb-6">
              <h3 className="text-slate-800 mb-2 text-sm font-semibold">Attachment</h3>
              <div className="h-0.5 w-full bg-primary mb-3"></div>
              
              {card.attachments && card.attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {card.attachments.map((a: any) => {
                    const fileName = a.file_name || a.file.split('/').pop() || "Attachment";
                    const isImg = isImageFile(fileName);
                    return (
                      <div 
                        key={a.id} 
                        className="text-sm text-blue-600 font-medium hover:underline cursor-pointer flex items-center gap-2" 
                        onClick={() => {
                          const url = `${API_BASE}${a.file}`;
                          if (isImg) {
                            setViewerImage({ url, alt: fileName });
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                      >
                        {fileName}
                        {isImg && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-2">Image</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative flex items-center gap-2 text-slate-700 cursor-pointer hover:text-slate-900 font-medium">
                <Search className="h-4 w-4" />
                <span className="text-sm">Add Attachment</span>
                <Input 
                  type="file" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

          </div>
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
              {card?.chats && card.chats.length > 0 ? (
                card.chats.map((c: any) => (
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
                      await fetch(`${API_BASE}/boards/cards/${currentCardId}/add_chat/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify({ text: chatInput })
                      });
                      fetchCardDetails(currentCardId);
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
