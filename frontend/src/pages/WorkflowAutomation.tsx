import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Connection,
  Edge,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Workflow, Plus, Play, Pause, Trash2, GripVertical, Zap, Mail,
  Bell, CheckSquare, Clock, Users, ArrowRight, X, Settings, Copy,
  MoreHorizontal, ChevronDown, Save, Clipboard, Trash
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  getWorkflows,
  getEmployees,
  getRoles,
  createWorkflow as createWorkflowApi,
  updateWorkflow as updateWorkflowApi,
  deleteWorkflow as deleteWorkflowApi,
  executeWorkflow as executeWorkflowApi
} from "@/api/automation";
import { toast } from "sonner";

// Icons and Options
const iconMap: Record<string, React.ReactNode> = {
  "check-square": <CheckSquare className="h-4 w-4" />,
  clipboard: <Clipboard className="h-4 w-4" />,
  clock: <Clock className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  mail: <Mail className="h-4 w-4" />,
  bell: <Bell className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

const triggerOptions = [
  { id: "task_created", label: "Task Created", icon: "check-square" },
  { id: "request_submitted", label: "Request Submitted", icon: "clipboard" },
  { id: "schedule", label: "On Schedule", icon: "clock" },
  { id: "employee_onboarded", label: "Employee Onboarded", icon: "users" },
  { id: "manager_assigned", label: "Manager Assigned", icon: "zap" },
];

const actionOptions = [
  { id: "send_email", label: "Send Email", icon: "mail" },
  { id: "send_notification", label: "Send Notification", icon: "bell" },
  { id: "assign_user", label: "Assign User", icon: "users" },
  { id: "assign_manager", label: "Assign Manager", icon: "users" },
  { id: "update_status", label: "Update Status", icon: "settings" },
];

const conditionOptions = [
  { id: "role_condition", label: "Role Condition", icon: "users" },
];

// Custom Node Component
const CustomNode = ({ data, selected }: any) => {
  const isTrigger = data.type === "trigger";
  const isCondition = data.type === "condition";
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border-2 bg-background min-w-[200px] transition-all",
      selected ? "border-blue-500 shadow-md" : "border-border shadow-sm",
      isTrigger ? "border-t-4 border-t-primary" : isCondition ? "border-t-4 border-t-amber-500" : "border-t-4 border-t-emerald-500"
    )}>
      {!isTrigger && <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-background bg-slate-400" />}
      
      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
        isTrigger ? "bg-primary/10 text-primary" : isCondition ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
      )}>
        {iconMap[data.icon] || <Zap className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{data.label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{data.type}</p>
      </div>

      {isCondition ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 border-2 border-background bg-green-500 left-1/3" />
          <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 border-2 border-background bg-red-500 left-2/3" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-background bg-slate-400" />
      )}
    </div>
  );
};

export default function WorkflowAutomation() {
  const { token } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [editingWorkflow, setEditingWorkflow] = useState<any | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showAddNode, setShowAddNode] = useState(false);
  const [addNodeType, setAddNodeType] = useState<"trigger" | "action" | "condition">("action");

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  useEffect(() => {
    fetchWorkflows();
    fetchEmployees();
    fetchRoles();
  }, [token]);

  const fetchWorkflows = async () => {
    try {
      const data = await getWorkflows();
      setWorkflows(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (e) {
      console.error(e);
    }
  };

  const createWorkflow = () => {
    const wf = {
      id: `wf-${Date.now()}`,
      name: "New Workflow",
      description: "",
      active: false,
      nodes: { nodes: [], edges: [] }
    };
    setEditingWorkflow(wf);
    setNodes([]);
    setEdges([]);
  };

  const openWorkflow = (wf: any) => {
    setEditingWorkflow(wf);
    const parsedNodes = wf.nodes?.nodes || [];
    const parsedEdges = wf.nodes?.edges || [];
    setNodes(parsedNodes);
    setEdges(parsedEdges);
  };

  const saveWorkflow = async () => {
    if (!editingWorkflow) return;
    const payload = {
      name: editingWorkflow.name,
      description: editingWorkflow.description,
      active: editingWorkflow.active,
      nodes: { nodes, edges }
    };
    
    const isNew = typeof editingWorkflow.id === 'string' && editingWorkflow.id.startsWith("wf-");

    try {
      if (isNew) {
        await createWorkflowApi(payload);
      } else {
        await updateWorkflowApi(editingWorkflow.id.toString(), payload);
      }
      toast.success("Workflow saved successfully");
      fetchWorkflows();
      setEditingWorkflow(null);
    } catch(err) {
      toast.error("Error saving workflow");
    }
  };

  const deleteWorkflow = async (id: number) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      await deleteWorkflowApi(id.toString());
      toast.success("Workflow deleted");
      fetchWorkflows();
    } catch(err) {
      console.error(err);
      toast.error("Failed to delete workflow");
    }
  };

  const executeWorkflow = async (id: number) => {
    try {
      await executeWorkflowApi(id.toString());
      toast.success("Workflow executed. Check logs for details.");
      fetchWorkflows();
    } catch(err) {
      console.error(err);
      toast.error("Error executing workflow");
    }
  };

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNodeToCanvas = (option: any, type: string) => {
    const newNode: Node = {
      id: `n-${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {
        label: option.label,
        icon: option.icon,
        type: type,
        config: {}
      }
    };
    setNodes((nds) => nds.concat(newNode));
    setShowAddNode(false);
  };

  const selectedNode = nodes.find(n => n.selected);

  const updateNodeConfig = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNode.id) {
        return {
          ...n,
          data: {
            ...n.data,
            config: {
              ...(n.data.config || {}),
              [key]: value
            }
          }
        };
      }
      return n;
    }));
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
  };

  if (editingWorkflow) {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingWorkflow(null)}>
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
            <div>
              <Input
                value={editingWorkflow.name}
                onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                className="font-display font-bold text-lg border-none shadow-none p-0 h-auto focus-visible:ring-0"
                placeholder="Workflow Name"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {typeof editingWorkflow.id === 'number' && (
              <Button size="sm" variant="outline" className="ml-2 text-primary border-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); executeWorkflow(editingWorkflow.id); }}>
                <Play className="h-4 w-4 mr-1" /> Run Workflow
              </Button>
            )}
            <Button size="sm" className="bg-primary text-primary-foreground ml-2" onClick={saveWorkflow}>
              <Save className="h-4 w-4 mr-1" /> Save Workflow
            </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Panel for Add Nodes */}
          <Card className="w-48 shrink-0 shadow-card flex flex-col p-3 space-y-3">
            <h3 className="text-sm font-semibold mb-2">Add Nodes</h3>
            <Button variant="outline" className="w-full justify-start" onClick={() => { setShowAddNode(true); setAddNodeType("trigger"); }}>
              <Zap className="h-4 w-4 mr-2 text-primary" /> Trigger
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => { setShowAddNode(true); setAddNodeType("condition"); }}>
              <Settings className="h-4 w-4 mr-2 text-amber-500" /> Condition
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => { setShowAddNode(true); setAddNodeType("action"); }}>
              <Plus className="h-4 w-4 mr-2 text-emerald-500" /> Action
            </Button>
          </Card>

          <Card className="flex-1 shadow-card overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              className="bg-slate-50/50"
            >
              <Background gap={12} size={1} />
              <Controls />
              <MiniMap zoomable pannable />
            </ReactFlow>
          </Card>

          {/* Node Config Panel */}
          {selectedNode && (
            <Card className="w-80 shrink-0 shadow-card flex flex-col animate-in slide-in-from-right-4">
              <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">{selectedNode.data.label}</CardTitle>
                  <p className="text-xs text-muted-foreground uppercase mt-1">{selectedNode.data.type}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={deleteSelectedNode}>
                  <Trash className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-5 flex-1 overflow-y-auto space-y-4">
                
                {selectedNode.data.label === "Assign User" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Assign Type</Label>
                      <Select 
                        value={selectedNode.data.config?.assignType || "self"} 
                        onValueChange={v => updateNodeConfig("assignType", v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">Assign to Self (Triggering User)</SelectItem>
                          <SelectItem value="other">Assign to Specific Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedNode.data.config?.assignType === "other" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Select Employee</Label>
                        <Select 
                          value={selectedNode.data.config?.assignee || ""} 
                          onValueChange={v => updateNodeConfig("assignee", v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                          <SelectContent>
                            {employees.map(e => (
                              <SelectItem key={e.id} value={e.id.toString()}>{e.full_name || e.username}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                {selectedNode.data.label === "Send Email" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Recipient Email</Label>
                    <Input 
                      placeholder="e.g. manager@company.com" 
                      value={selectedNode.data.config?.email || ""}
                      onChange={e => updateNodeConfig("email", e.target.value)} 
                    />
                  </div>
                )}

                {selectedNode.data.label === "Assign Manager" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Select Manager</Label>
                    <Select 
                      value={selectedNode.data.config?.managerId || ""} 
                      onValueChange={v => updateNodeConfig("managerId", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        {employees.map(e => (
                          <SelectItem key={e.id} value={e.id.toString()}>{e.full_name || e.username}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedNode.data.label === "Send Notification" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Notification Title</Label>
                      <Input 
                        placeholder="e.g. Action Required" 
                        value={selectedNode.data.config?.title || ""}
                        onChange={e => updateNodeConfig("title", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label className="text-xs">Message</Label>
                      <Textarea 
                        placeholder="e.g. Please review the new assignment..." 
                        value={selectedNode.data.config?.message || ""}
                        onChange={e => updateNodeConfig("message", e.target.value)}
                        className="text-xs min-h-[60px]"
                      />
                    </div>
                  </>
                )}

                {selectedNode.data.label === "Update Status" && (
                  <div className="space-y-2">
                    <Label className="text-xs">New Status</Label>
                    <Select 
                      value={selectedNode.data.config?.status || "Pending"} 
                      onValueChange={v => updateNodeConfig("status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedNode.data.label === "Role Condition" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Required Role</Label>
                    <Select 
                      value={selectedNode.data.config?.role || ""} 
                      onValueChange={v => updateNodeConfig("role", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Node Dialog */}
        <Dialog open={showAddNode} onOpenChange={setShowAddNode}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add {addNodeType}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(addNodeType === "trigger" ? triggerOptions : addNodeType === "condition" ? conditionOptions : actionOptions).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => addNodeToCanvas(opt, addNodeType)}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                    addNodeType === "trigger" ? "bg-primary/10 text-primary" : addNodeType === "condition" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {iconMap[opt.icon] || <Zap className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            Workflow Automation
          </h1>
          <p className="text-muted-foreground mt-1">Build dynamic logic with node-based workflows.</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-primary text-primary-foreground" onClick={createWorkflow}>
            <Plus className="h-4 w-4 mr-1" /> New Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((wf) => {
          const nodeCount = wf.nodes?.nodes?.length || 0;
          return (
            <Card key={wf.id} className="shadow-card hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openWorkflow(wf)}>
                    <h3 className="text-sm font-semibold text-foreground">{wf.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{wf.description || "No description"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-primary border-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); executeWorkflow(wf.id); }}>
                      <Play className="h-3 w-3 mr-1" /> Run
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openWorkflow(wf)}>Edit Visual Graph</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => executeWorkflow(wf.id)}>Run Manually</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteWorkflow(wf.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t">
                  <Badge variant={wf.active ? "default" : "secondary"} className="text-[10px]">
                    {wf.active ? "Active" : "Draft"}
                  </Badge>
                  <span>{nodeCount} nodes</span>
                  {wf.runs !== undefined && <span>{wf.runs} runs</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {workflows.length === 0 && (
        <div className="text-center py-12">
          <Workflow className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No workflows found. Create a new visual workflow.</p>
        </div>
      )}
    </div>
  );
}
