import { useState, useEffect } from "react";
import {
  ClipboardList,
  Plane,
  Calendar,
  Receipt,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { getHRRequests, createHRRequest, updateHRRequest } from "@/api/hr";
import { toast } from "sonner";

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  approved: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "bg-success/10 text-success border-success/20" },
  pending: { icon: <Clock className="h-3.5 w-3.5" />, color: "bg-warning/10 text-warning border-warning/20" },
  rejected: { icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const typeIcons: Record<string, React.ReactNode> = {
  Leave: <Calendar className="h-4 w-4 text-primary" />,
  Travel: <Plane className="h-4 w-4 text-accent" />,
  Expense: <Receipt className="h-4 w-4 text-warning" />,
};

export default function HRRequests() {
  const { token } = useAuth();
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requestType, setRequestType] = useState("leave");
  const [hrRequests, setHrRequests] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"mine" | "team">("mine");
  
  // Form State
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchRequests = async () => {
    if (token) {
      const data = await getHRRequests();
      setHrRequests(data);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const baseRequests = hrRequests.filter(r => viewMode === "mine" ? r.is_requester : !r.is_requester);

  const filtered = baseRequests.filter((r) => {
    const matchType = filter === "all" || r.type?.toLowerCase() === filter;
    const matchStatus = statusFilter === "all" || r.status?.toLowerCase() === statusFilter;
    return matchType && matchStatus;
  });

  const counts = {
    all: baseRequests,
    leave: baseRequests.filter((r) => r.type === "Leave"),
    travel: baseRequests.filter((r) => r.type === "Travel"),
    expense: baseRequests.filter((r) => r.type === "Expense"),
  };

  const getStatusCounts = (list: any[]) => ({
    approved: list.filter(r => r.status === 'approved').length,
    pending: list.filter(r => r.status === 'pending').length,
    rejected: list.filter(r => r.status === 'rejected').length,
    total: list.length
  });

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for the request");
      return;
    }

    try {
      const payload: any = {
        title,
        type: requestType.charAt(0).toUpperCase() + requestType.slice(1),
        detail,
      };

      if (requestType === "leave") {
        payload.form_data = {
          startDate,
          endDate,
        };
      }
      
      const newRequest = await createHRRequest(payload);
      setHrRequests([newRequest, ...hrRequests]);
      toast.success("HR Request submitted successfully");
      setShowDialog(false);
      setTitle("");
      setDetail("");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleUpdateStatus = async (action: string) => {
    if (!selectedRequest) return;
    try {
      const payload: any = { action };
      
      await updateHRRequest(selectedRequest.id, payload);
      toast.success(`Request ${action}ed`);
      setHrRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, status: action === "reassign" ? "reassigned" : action } : r));
    } catch (error) {
      toast.error("Action failed");
      console.error(error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">HR Requests</h1>
          <p className="text-muted-foreground mt-1">Submit and track your leave, travel, and expense requests</p>
        </div>

        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="mine" className="text-xs">My Requests</TabsTrigger>
              <TabsTrigger value="team" className="text-xs">Team Approvals</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* New Request Dialog */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit New Request</DialogTitle>
            </DialogHeader>
            <Tabs value={requestType} onValueChange={setRequestType} className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="leave" className="flex-1 gap-1.5"><Calendar className="h-3.5 w-3.5" />Leave</TabsTrigger>
                <TabsTrigger value="travel" className="flex-1 gap-1.5"><Plane className="h-3.5 w-3.5" />Travel</TabsTrigger>
                <TabsTrigger value="expense" className="flex-1 gap-1.5"><Receipt className="h-3.5 w-3.5" />Expense</TabsTrigger>
              </TabsList>

              <TabsContent value="leave" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input placeholder="e.g. Annual Leave" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Leave Type</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual Leave</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="wfh">Work from Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Duration</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Duration" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Day</SelectItem>
                        <SelectItem value="half-am">Half Day (AM)</SelectItem>
                        <SelectItem value="half-pm">Half Day (PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason / Details</Label>
                  <Textarea placeholder="Optional reason..." rows={2} value={detail} onChange={e => setDetail(e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="travel" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input placeholder="e.g. New York Conference" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Destination</Label>
                  <Input placeholder="e.g., New York, NY" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Departure Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Return Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estimated Budget</Label>
                    <Input type="number" placeholder="$0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Purpose</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Purpose" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client Meeting</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes / Details</Label>
                  <Textarea placeholder="Additional details..." rows={2} value={detail} onChange={e => setDetail(e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="expense" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input placeholder="e.g. Office Supplies" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meals">Meals & Entertainment</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="supplies">Office Supplies</SelectItem>
                        <SelectItem value="software">Software/Subscriptions</SelectItem>
                        <SelectItem value="conference">Conference/Training</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount</Label>
                    <Input type="number" placeholder="$0.00" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date of Expense</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description / Details</Label>
                  <Textarea placeholder="What was this expense for?" rows={2} value={detail} onChange={e => setDetail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Receipt</Label>
                  <Input type="file" accept="image/*,.pdf" />
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              </DialogClose>
              <Button className="gradient-primary text-primary-foreground" onClick={handleSubmit}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "All Requests", list: counts.all, key: "all", icon: <ClipboardList className="h-4 w-4" /> },
          { label: "Leave", list: counts.leave, key: "leave", icon: <Calendar className="h-4 w-4" /> },
          { label: "Travel", list: counts.travel, key: "travel", icon: <Plane className="h-4 w-4" /> },
          { label: "Expense", list: counts.expense, key: "expense", icon: <Receipt className="h-4 w-4" /> },
        ].map((item) => {
          const stats = getStatusCounts(item.list);
          return (
            <Card
              key={item.key}
              className={`shadow-card transition-all ${filter === item.key ? "ring-2 ring-primary" : "hover:shadow-md"}`}
            >
              <CardContent className="p-3">
                <div 
                  className="flex items-center gap-3 cursor-pointer" 
                  onClick={() => { setFilter(item.key); setStatusFilter("all"); }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground font-semibold">{item.label}</p>
                  </div>
                </div>
                
                <div className="flex w-full h-1.5 mt-4 gap-1 opacity-80 hover:opacity-100 transition-opacity">
                  <div 
                    className="flex-1 bg-success rounded-full cursor-pointer hover:scale-y-150 transition-transform"
                    onClick={(e) => { e.stopPropagation(); setFilter(item.key); setStatusFilter("approved"); }}
                    title={`Approved: ${stats.approved}`}
                  />
                  <div 
                    className="flex-1 bg-warning rounded-full cursor-pointer hover:scale-y-150 transition-transform"
                    onClick={(e) => { e.stopPropagation(); setFilter(item.key); setStatusFilter("pending"); }}
                    title={`Pending: ${stats.pending}`}
                  />
                  <div 
                    className="flex-1 bg-destructive rounded-full cursor-pointer hover:scale-y-150 transition-transform"
                    onClick={(e) => { e.stopPropagation(); setFilter(item.key); setStatusFilter("rejected"); }}
                    title={`Rejected: ${stats.rejected}`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Request List */}
      <Card className="shadow-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)} Requests 
            {statusFilter !== "all" && ` - ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
          </CardTitle>
          {(filter !== "all" || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFilter("all"); setStatusFilter("all"); }} className="h-8 text-xs text-muted-foreground">
              Clear Filters
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((req) => {
              const st = statusConfig[req.status];
              return (
                <div 
                  key={req.id} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRequest(req)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    {typeIcons[req.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{req.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{req.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className={`${st.color} gap-1 text-[10px]`}>
                      {st.icon}
                      {req.status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">{req.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* View Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between mt-2">
                  <span>{selectedRequest.title}</span>
                  <Badge variant="outline" className={`${statusConfig[selectedRequest.status]?.color} gap-1`}>
                    {statusConfig[selectedRequest.status]?.icon}
                    {selectedRequest.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 text-sm mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Requester</p>
                    <p className="font-medium">{selectedRequest.requester_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-medium flex items-center gap-1.5">
                      {typeIcons[selectedRequest.type]} {selectedRequest.type}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Details</p>
                    <p className="font-medium text-foreground bg-slate-50 p-3 rounded-md mt-1 border border-slate-100">{selectedRequest.detail || 'No additional details provided.'}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-sm mb-3">Activity Log</h4>
                  <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {selectedRequest.logs && selectedRequest.logs.length > 0 ? (
                      selectedRequest.logs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                          <div>
                            <p className="font-medium text-slate-700">
                              {log.actor_name} <span className="font-normal text-slate-500 capitalize">{log.action.replace('_', ' ')}</span>
                            </p>
                            {log.note && <p className="text-slate-500 mt-0.5">{log.note}</p>}
                            <p className="text-slate-400 text-[10px] mt-0.5">{log.timestamp}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No logs available.</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6 sm:justify-between border-t border-border pt-4">
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Close</Button>
                </DialogClose>
                
                {selectedRequest.can_approve && selectedRequest.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => handleUpdateStatus('rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" /> Reject
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-success hover:bg-success/90 text-white"
                      onClick={() => handleUpdateStatus('approved')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

