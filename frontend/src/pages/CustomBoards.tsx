import React, { useState, useEffect, useMemo } from "react";
import {
  Kanban,
  Plus,
  MoreHorizontal,
  Calendar,
  User,
  Tag,
  GripVertical,
  LayoutGrid,
  Briefcase,
  UserCircle,
  Clock,
  MessageCircle,
  Paperclip,
  List,
  Trash2,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskDetailsModal } from "@/components/tasks/TaskDetailsModal";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";

export default function CustomBoards() {
  const { token, username } = useAuth();
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [dragCard, setDragCard] = useState<{ cardId: number; fromCol: string } | null>(null);
  
  // Dialog state
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", template_type: "project" });

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/boards/boards/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const boardsData = Array.isArray(data) ? data : (data.results || []);
        setBoards(boardsData);
        if (boardsData.length > 0 && !activeBoardId) {
          setActiveBoardId(boardsData[0].id.toString());
        } else if (boardsData.length === 0) {
          setActiveBoardId("");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates/`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setTemplates(await res.json());
    } catch(e) {}
  };

  useEffect(() => {
    fetchBoards();
    fetchTemplates();
  }, [token]);

  const activeBoard = boards.find(b => b.id.toString() === activeBoardId);

  const createBoard = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/boards/boards/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const createdBoard = await res.json();
        toast.success("Board created successfully");
        setShowAddBoard(false);
        setForm({ title: "", description: "", template_type: "project" });
        setActiveBoardId(createdBoard.id.toString());
        setViewMode("kanban");
        fetchBoards();
      }
    } catch (err) {
      toast.error("Failed to create board");
    }
  };

  // Add column state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // Add card state
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !activeBoardId) {
      setIsAddingColumn(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/boards/columns/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          board: parseInt(activeBoardId),
          title: newColumnTitle.trim(),
          color: "bg-primary"
        })
      });
      if (res.ok) {
        toast.success("Column added");
        setNewColumnTitle("");
        setIsAddingColumn(false);
        fetchBoards();
      } else {
        toast.error("Failed to add column");
      }
    } catch (err) {
      toast.error("Error adding column");
    }
  };

  const handleAddCard = async (columnId: string) => {
    if (!newCardTitle.trim()) {
      setAddingCardColumnId(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/boards/cards/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          column: columnId,
          title: newCardTitle.trim(),
          assignee: 'self'
        })
      });
      if (res.ok) {
        toast.success("Task added");
        setNewCardTitle("");
        setAddingCardColumnId(null);
        fetchBoards();
      } else {
        toast.error("Failed to add task");
      }
    } catch (err) {
      toast.error("Error adding task");
    }
  };

  // Edit column state
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState("");

  const handleUpdateColumn = async (columnId: string) => {
    if (!editColumnTitle.trim()) {
      setEditingColumnId(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/boards/columns/${columnId}/`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: editColumnTitle.trim() })
      });
      if (res.ok) {
        toast.success("Column updated");
        setEditingColumnId(null);
        fetchBoards();
      } else {
        toast.error("Failed to update column");
      }
    } catch (err) {
      toast.error("Error updating column");
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm("Are you sure you want to delete this column and all its tasks?")) return;
    try {
      const res = await fetch(`${API_BASE}/boards/columns/${columnId}/`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Column deleted");
        fetchBoards();
      } else {
        toast.error("Failed to delete column");
      }
    } catch (err) {
      toast.error("Error deleting column");
    }
  };

  const handleDrop = async (toColId: string) => {
    if (!dragCard || dragCard.fromCol === toColId) {
      setDragCard(null);
      return;
    }

    try {
      // Optimistic UI update
      setBoards(prevBoards => prevBoards.map(board => {
        if (board.id.toString() !== activeBoardId) return board;
        
        let movedCard = null;
        const newColumns = board.columns.map((col: any) => {
          if (col.id.toString() === dragCard.fromCol) {
            movedCard = col.cards.find((c: any) => c.id === dragCard.cardId);
            return { ...col, cards: col.cards.filter((c: any) => c.id !== dragCard.cardId) };
          }
          return col;
        });

        if (movedCard) {
          const finalColumns = newColumns.map((col: any) => {
            if (col.id.toString() === toColId) {
              return { ...col, cards: [...(col.cards || []), movedCard] };
            }
            return col;
          });
          return { ...board, columns: finalColumns };
        }
        return board;
      }));

      const res = await fetch(`${API_BASE}/boards/cards/${dragCard.cardId}/`, {
        method: "PATCH",
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ column: toColId })
      });

      if (!res.ok) {
        fetchBoards(); // revert on failure
        toast.error("Failed to move card");
      }
    } catch (e) {
      fetchBoards();
      toast.error("Error moving card");
    } finally {
      setDragCard(null);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`${API_BASE}/boards/cards/${cardId}/`, {
        method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Task deleted");
        fetchBoards();
      } else {
        toast.error("Failed to delete task");
      }
    } catch (e) {
      toast.error("Error deleting task");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Kanban className="h-6 w-6 text-primary" />
            My Boards
          </h1>
          <p className="text-muted-foreground mt-1">Organize work visually with custom boards.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeBoard && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[140px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="kanban" className="text-xs"><Kanban className="h-3.5 w-3.5 mr-1.5"/> Kanban</TabsTrigger>
                <TabsTrigger value="list" className="text-xs"><List className="h-3.5 w-3.5 mr-1.5"/> List</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Button onClick={() => setShowAddBoard(true)} className="gap-1.5"><Plus className="h-4 w-4"/> Add Board</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : boards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-card p-12 text-center">
          <Kanban className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Boards Yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">Create your first board from a template to start organizing tasks.</p>
          <Button onClick={() => setShowAddBoard(true)} className="gap-1.5"><Plus className="h-4 w-4"/> Create Board</Button>
        </div>
      ) : (
        <>
          <Tabs value={activeBoardId} onValueChange={setActiveBoardId} className="mb-4">
            <TabsList className="flex flex-wrap h-auto bg-transparent border-b border-border rounded-none p-0 justify-start space-x-2">
              {boards.map((b) => (
                <TabsTrigger 
                  key={b.id} 
                  value={b.id.toString()} 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md px-4 py-2 text-sm text-muted-foreground bg-card border border-border border-b-0 hover:bg-muted"
                >
                  {b.template_type === 'sales' ? <Briefcase className="h-3.5 w-3.5 mr-1.5" /> : 
                   b.template_type === 'personal' ? <UserCircle className="h-3.5 w-3.5 mr-1.5" /> : 
                   <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />}
                  {b.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex-1 overflow-x-auto min-h-0">
            {activeBoard && viewMode === "kanban" && (
              <div className="flex gap-3 pb-4 h-full items-start">
                {activeBoard.columns?.map((col: any) => (
                  <div 
                    key={col.id} 
                    className="w-[250px] shrink-0 flex flex-col bg-muted/40 rounded-xl border border-border/50 max-h-[calc(100vh-220px)]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleDrop(col.id.toString()); }}
                  >
                    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border/50 bg-background/50 rounded-t-xl shrink-0">
                      <div className={`h-2 w-2 rounded-full ${col.color || 'bg-primary'}`} />
                      
                      {editingColumnId === col.id ? (
                        <Input
                          autoFocus
                          value={editColumnTitle}
                          onChange={(e) => setEditColumnTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateColumn(col.id);
                            if (e.key === "Escape") setEditingColumnId(null);
                          }}
                          className="h-7 text-xs py-0 px-1.5 flex-1 bg-background font-semibold"
                        />
                      ) : (
                        <>
                          <h3 
                            className="text-xs font-semibold text-foreground flex-1 truncate cursor-pointer hover:underline"
                            onDoubleClick={() => {
                              setEditingColumnId(col.id);
                              setEditColumnTitle(col.title);
                            }}
                          >
                            {col.title}
                          </h3>
                          <Badge variant="secondary" className="text-[9px] px-1 h-4 mr-0.5 shrink-0">{col.cards?.length || 0}</Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 opacity-60 hover:opacity-100"><MoreHorizontal className="h-3 w-3" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {editingColumnId === col.id ? (
                                <DropdownMenuItem onClick={() => handleUpdateColumn(col.id)}>Save</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => { setEditingColumnId(col.id); setEditColumnTitle(col.title); }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Rename Column
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDeleteColumn(col.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Column
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 py-2 min-h-[150px]">
                      <div className="space-y-2 pb-1">
                        {col.cards?.map((card: any) => {
                          const totalChecks = card.checklists?.length || 0;
                          const completedChecks = card.checklists?.filter((st: any) => st.is_completed).length || 0;
                          const progress = totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0;
                          const daysAgo = card.created_at ? Math.floor((new Date().getTime() - new Date(card.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                          const hoursAgo = card.created_at ? Math.floor(((new Date().getTime() - new Date(card.created_at).getTime()) / (1000 * 60 * 60)) % 24) : 0;

                          return (
                            <Card 
                              key={card.id} 
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', '');
                                setDragCard({ cardId: card.id, fromCol: col.id.toString() });
                              }}
                              className="bg-card text-card-foreground border-border cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all group overflow-hidden rounded-lg shadow-sm"
                            >
                              <CardContent className="p-3 relative" onClick={() => { setSelectedCard(card); setIsTaskModalOpen(true); }} role="button">
                                {/* Title */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="text-sm font-semibold leading-snug break-words group-hover:text-primary transition-colors w-full pr-6">
                                    {card.title}
                                  </h4>
                                </div>

                                {/* Status Badge (Column title) */}
                                <div className="mb-3">
                                  <span className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold rounded-full capitalize text-white shadow-sm ${col.color || 'bg-primary'}`}>
                                    {col.title}
                                  </span>
                                </div>
                                
                                {/* Created By & Time Ago */}
                                <div className="text-xs mb-3 space-y-1 text-muted-foreground">
                                  <p>Created By: <span className="font-medium text-foreground">{card.created_by_name || "Unknown"}</span></p>
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
                                  <span>{card.due_date ? new Date(card.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ""}</span>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1" 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}

                        {addingCardColumnId === col.id ? (
                          <div className="mt-2 space-y-2 p-1">
                            <Input
                              autoFocus
                              placeholder="Task title..."
                              value={newCardTitle}
                              onChange={(e) => setNewCardTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddCard(col.id);
                                if (e.key === "Escape") setAddingCardColumnId(null);
                              }}
                              className="text-xs h-8"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAddCard(col.id)} className="w-full h-7 text-xs">Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setAddingCardColumnId(null)} className="h-7 text-xs">Cancel</Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-2 bg-background/30 rounded-b-xl border-t border-border/50 shrink-0">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-[11px] text-muted-foreground h-7 px-1.5 hover:text-primary hover:bg-primary/5 transition-colors" 
                        onClick={() => { setAddingCardColumnId(col.id); setNewCardTitle(""); }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add task
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="w-72 shrink-0">
                  {isAddingColumn ? (
                    <div className="bg-muted/50 rounded-xl border border-border p-3 space-y-2">
                      <Input
                        autoFocus
                        placeholder="Column title..."
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddColumn();
                          if (e.key === "Escape") setIsAddingColumn(false);
                        }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddColumn} className="w-full">Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsAddingColumn(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => { setIsAddingColumn(true); setNewColumnTitle(""); }} className="w-full border-dashed gap-1.5 text-muted-foreground"><Plus className="h-4 w-4" /> Add Column</Button>
                  )}
                </div>
              </div>
            )}

            {activeBoard && viewMode === "list" && (
              <div className="bg-card rounded-xl border border-border overflow-hidden h-full">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Card Title</th>
                      <th className="px-6 py-3 font-semibold">Column</th>
                      <th className="px-6 py-3 font-semibold">Assignee</th>
                      <th className="px-6 py-3 font-semibold">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeBoard.columns?.flatMap((c: any) => c.cards?.map((card: any) => ({...card, columnName: c.title})))?.map((card: any) => (
                      <tr key={card.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setSelectedCard(card); setIsTaskModalOpen(true); }}>
                        <td className="px-6 py-4 font-medium text-foreground">{card.title}</td>
                        <td className="px-6 py-4"><Badge variant="outline" className="text-[10px]">{card.columnName}</Badge></td>
                        <td className="px-6 py-4">
                          {card.assignee_detail ? (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{card.assignee_detail.name.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {card.due_date ? <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {card.due_date}</span> : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Board Dialog */}
      <Dialog open={showAddBoard} onOpenChange={setShowAddBoard}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2"><Label>Board Name</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Q3 Roadmap" /></div>
            <div className="space-y-2"><Label>Description (Optional)</Label><Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Brief description" /></div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={form.template_type} onValueChange={(v) => setForm({...form, template_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Basic Project Board (Default)</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={createBoard}>Create Board</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCard && (
        <TaskDetailsModal
          taskId={selectedCard.id}
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          onTaskUpdate={() => fetchBoards()}
          isBoardCard={true}
        />
      )}
    </div>
  );
}
