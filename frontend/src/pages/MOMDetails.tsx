import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle2, User as UserIcon, Plus, Save, Edit2, UserPlus, Trash2, Search, X, Share2, Download, Send, Bell, Mail, FileText, Users, ListTodo, MapPin, Calendar, ClipboardList } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
// @ts-ignore
// import html2pdf from 'html2pdf.js';
import { API_BASE } from "@/config";

export default function MOMDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, username } = useAuth();
  const { toast } = useToast();

  const [mom, setMom] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<'client' | 'org'>('client');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false);
  const [extName, setExtName] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extPhone, setExtPhone] = useState('');
  
  const [isAddInternalOpen, setIsAddInternalOpen] = useState(false);
  const [internalUserId, setInternalUserId] = useState('');

  const currentUser = users.find(u => u.username === username);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newMeetingType, setNewMeetingType] = useState('');
  const [newPreparedBy, setNewPreparedBy] = useState('');
  const [newMeetingStatus, setNewMeetingStatus] = useState('scheduled');

  useEffect(() => {
    if (id) {
      fetchMOM();
      fetchUsers();
    }
  }, [id, token]);

  const fetchMOM = async () => {
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMom(data);
        setNewTitle(data.title || '');
        setNewDesc(data.description || '');
        setNewDate(data.meeting_date || '');
        setNewClientName(data.client_name || '');
        setNewSiteName(data.site_name || '');
        setNewLocation(data.location || '');
        setNewStartTime(data.start_time || '');
        setNewEndTime(data.end_time || '');
        setNewMeetingType(data.meeting_type || '');
        setNewPreparedBy(data.prepared_by || '');
        setNewMeetingStatus(data.meeting_status || 'scheduled');
        setPoints(data.points || []);
        setAgendas(data.agendas || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/employees/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePoints = async () => {
    if (!mom) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...mom,
          title: newTitle,
          description: newDesc,
          meeting_date: newDate,
          client_name: newClientName,
          site_name: newSiteName,
          location: newLocation,
          start_time: newStartTime || null,
          end_time: newEndTime || null,
          meeting_type: newMeetingType,
          prepared_by: newPreparedBy,
          meeting_status: newMeetingStatus,
          points_data: points.map(p => ({
            id: p.id,
            text: p.text,
            assigned_to: p.assigned_to,
            department: p.department || '',
            priority: p.priority || 'Medium',
            planned_date: p.planned_date || null,
            actual_date: p.actual_date || null,
            status: p.status || 'Open',
            remarks: p.remarks || ''
          })),
          agendas_data: agendas.map(a => ({
            id: a.id,
            topic: a.topic,
            remarks: a.remarks
          }))
        })
      });
      if (res.ok) {
        toast({ title: 'MOM Draft saved successfully' });
        fetchMOM();
      } else {
        toast({ title: 'Failed to update MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error updating MOM', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const convertToTask = async (pointId: number) => {
    try {
      const res = await fetch(`${API_BASE}/mom/mom-points/${pointId}/convert_to_task/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: 'Point converted to Task!' });
        fetchMOM(); // refresh
      } else {
        const err = await res.json();
        toast({ title: err.detail || 'Failed to convert', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error converting to task', variant: 'destructive' });
    }
  };

  const handleDeleteMOM = async () => {
    if (!confirm('Are you sure you want to delete this MOM?')) return;
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: 'MOM deleted' });
        navigate('/collaboration/moms');
      } else {
        toast({ title: 'Failed to delete MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error deleting MOM', variant: 'destructive' });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link copied to clipboard!' });
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('mom-pdf-content');
    if (!element) return;
    element.classList.remove('hidden');
    element.classList.remove('print:block');
    element.style.display = 'block';
    const opt = {
      margin:       0.5,
      filename:     `MOM-${mom?.id || 'export'}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as const }
    };
    // html2pdf().set(opt).from(element).save().then(() => {
    //   element.classList.add('hidden');
    //   element.classList.add('print:block');
    //   element.style.display = '';
    // });
  };

  const handleSubmitMOM = async () => {
    if (!mom) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ meeting_status: 'completed' })
      });
      if (res.ok) {
        toast({ title: 'MOM Submitted successfully!' });
        fetchMOM();
      } else {
        toast({ title: 'Failed to submit MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error submitting MOM', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/add_attendee/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_external: true, name: extName, email: extEmail, phone: extPhone })
      });
      if (res.ok) {
        toast({ title: 'External attendee added' });
        setIsAddExternalOpen(false);
        setExtName(''); setExtEmail(''); setExtPhone('');
        fetchMOM();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddInternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalUserId) return;
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/add_attendee/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_external: false, user_id: internalUserId })
      });
      if (res.ok) {
        toast({ title: 'Organization attendee added' });
        setIsAddInternalOpen(false);
        setInternalUserId('');
        fetchMOM();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeAttendee = async (attendeeId: number) => {
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/remove_attendee/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ attendee_id: attendeeId })
      });
      if (res.ok) {
        toast({ title: 'Attendee removed' });
        fetchMOM();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addPoint = () => {
    setPoints([...points, { text: '', assigned_to: null, department: '', priority: 'Medium', planned_date: '', actual_date: '', status: 'Open', remarks: '' }]);
  };

  const updatePoint = (index: number, field: string, value: any) => {
    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    if (field === 'assigned_to') {
      const emp = users.find(e => e.id.toString() === value?.toString() || e.name === value || e.username === value);
      if (emp) {
        newPoints[index].department = emp.department || '';
      }
    }
    setPoints(newPoints);
  };

  const removePoint = (index: number) => {
    const newPoints = [...points];
    newPoints.splice(index, 1);
    setPoints(newPoints);
  };

  const addAgenda = () => {
    setAgendas([...agendas, { topic: '', remarks: '' }]);
  };

  const updateAgenda = (index: number, field: string, value: string) => {
    const newAgendas = [...agendas];
    newAgendas[index] = { ...newAgendas[index], [field]: value };
    setAgendas(newAgendas);
  };

  const removeAgenda = (index: number) => {
    const newAgendas = [...agendas];
    newAgendas.splice(index, 1);
    setAgendas(newAgendas);
  };

  if (!mom) return <div className="p-8">Loading...</div>;

  const attendees = mom?.attendees || [];
  const externalAttendees = attendees.filter((a: any) => a.is_external);
  const internalAttendees = attendees.filter((a: any) => !a.is_external);

  const displayedAttendees = (activeTab === 'client' ? externalAttendees : internalAttendees).filter((a: any) => {
    const search = searchQuery.toLowerCase();
    if (activeTab === 'client') {
      return (a.name || '').toLowerCase().includes(search) || (a.email || '').toLowerCase().includes(search);
    }
    return (a.user_details?.username || '').toLowerCase().includes(search) || (a.user_details?.first_name || '').toLowerCase().includes(search) || (a.user_details?.email || '').toLowerCase().includes(search);
  });

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white print:m-0 print:p-0">
      {/* --- INTERACTIVE VIEW --- */}
      <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20 print:hidden">
        
        <div className="flex justify-between items-center -ml-4">
          <Button variant="ghost" className="gap-2" onClick={() => navigate('/collaboration/moms')}>
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 text-slate-700 font-semibold border-slate-200" onClick={handleShare}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button variant="outline" className="gap-2 text-slate-700 font-semibold border-slate-200" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleSavePoints} disabled={isSaving}>
              <Save className="h-4 w-4" /> Save MOM Draft
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleSubmitMOM} disabled={isSaving}>
              <Send className="h-4 w-4" /> Submit MOM
            </Button>
          </div>
        </div>

        {/* 01 Meeting Information */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">01 Meeting Information</h3>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Core meeting context and scheduling details</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="col-span-full space-y-2">
              <Label className="text-sm font-medium text-slate-700">Meeting Title <span className="text-red-500">*</span></Label>
              <Input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="E.g., Client Sync Review" className="border-slate-200 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Client Name</Label>
              <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Skyline Corporate Park" className="border-slate-200 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Site Name</Label>
              <Input value={newSiteName} onChange={e => setNewSiteName(e.target.value)} placeholder="Tower B — Bandra Kurla Complex" className="border-slate-200 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> Location</Label>
              <Input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Mumbai, Maharashtra" className="border-slate-200 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Meeting Date <span className="text-red-500">*</span></Label>
              <Input required type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="border-slate-200 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">Start Time</Label>
              <Input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="border-slate-200 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">End Time</Label>
              <Input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="border-slate-200 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Meeting Type</Label>
              <Select value={newMeetingType} onValueChange={setNewMeetingType}>
                <SelectTrigger className="border-slate-200 h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly review">Monthly Review</SelectItem>
                  <SelectItem value="weekly sync">Weekly Sync</SelectItem>
                  <SelectItem value="quaterly business review">Quarterly Business Review</SelectItem>
                  <SelectItem value="escalation">Escalation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Prepared By</Label>
              <Select value={newPreparedBy} onValueChange={setNewPreparedBy}>
                <SelectTrigger className="border-slate-200 h-10">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((emp) => (
                    <SelectItem key={emp.id} value={emp.name || emp.username}>
                      {emp.name || emp.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Meeting Status</Label>
              <Select value={newMeetingStatus} onValueChange={setNewMeetingStatus}>
                <SelectTrigger className="border-slate-200 h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-full space-y-2 mt-2">
              <Label className="text-sm font-medium text-slate-700">Description / Overview</Label>
              <textarea 
                className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)} 
                placeholder="Brief overview of what this meeting is about..."
              />
            </div>
          </div>
        </div>

        {/* 02 Attendees */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">02 Attendees</h3>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{externalAttendees.length + internalAttendees.length} participants</p>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200 rounded-full w-fit mb-6">
            <button 
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${activeTab === 'client' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('client')}
            >
              Client Attendees ({externalAttendees.length})
            </button>
            <button 
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${activeTab === 'org' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('org')}
            >
              Organization Attendees ({internalAttendees.length})
            </button>
          </div>

          <div className="flex justify-between items-center gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder={`Search ${activeTab === 'client' ? 'external' : 'internal'} attendees...`} 
                className="pl-9 h-10 border-slate-200" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Dialog open={isAddExternalOpen} onOpenChange={setIsAddExternalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 h-10 border-slate-200 text-slate-700">
                    <UserPlus className="h-4 w-4" /> Add External
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add External Client</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddExternal} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Client Name</Label>
                      <Input required value={extName} onChange={e => setExtName(e.target.value)} placeholder="Full Name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input required type="email" value={extEmail} onChange={e => setExtEmail(e.target.value)} placeholder="Email address" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input value={extPhone} onChange={e => setExtPhone(e.target.value)} placeholder="Phone number" />
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Add Attendee</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddInternalOpen} onOpenChange={setIsAddInternalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700 h-10">
                    <Plus className="h-4 w-4" /> Add Attendee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Organization Attendee</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddInternal} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Select Employee</Label>
                      <Select value={internalUserId} onValueChange={setInternalUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id.toString()}>
                              {u.full_name || u.username} ({u.email || 'No email'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Add Attendee</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedAttendees.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 p-4 bg-white border border-blue-100 rounded-xl shadow-sm hover:border-blue-300 transition-colors">
                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold shrink-0 text-lg">
                  {(activeTab === 'client' ? (a.name || 'U')[0] : (a.user_details?.first_name || a.user_details?.username || 'E')[0]).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {activeTab === 'client' ? a.name : (a.user_details?.first_name ? `${a.user_details.first_name} ${a.user_details.last_name || ''}` : a.user_details?.username || 'Employee')}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{activeTab === 'client' ? 'Client' : (a.user_details?.department || 'Organization Staff')}</p>
                  <p className="text-xs text-slate-500 truncate">{activeTab === 'client' ? a.email : a.user_details?.email}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 shrink-0" onClick={() => removeAttendee(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {displayedAttendees.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No attendees found.
              </div>
            )}
          </div>
        </div>

        {/* 03 Meeting Agenda */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <ListTodo className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">03 Meeting Agenda</h3>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Discussion topics and remarks</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-slate-200" onClick={addAgenda}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-16 text-center">SR</th>
                  <th className="px-4 py-3 w-1/3">Agenda Topic</th>
                  <th className="px-4 py-3">Discussion Remarks</th>
                  <th className="px-4 py-3 w-16 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agendas.map((agenda, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 text-center font-medium text-slate-400">
                      <span className="flex items-center justify-center gap-1.5"><span className="w-1 h-1 bg-slate-300 rounded-full"></span><span className="w-1 h-1 bg-slate-300 rounded-full"></span> {index + 1}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Input 
                        value={agenda.topic} 
                        onChange={e => updateAgenda(index, 'topic', e.target.value)} 
                        placeholder="Topic..." 
                        className="border-slate-200 bg-white" 
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Input 
                        value={agenda.remarks} 
                        onChange={e => updateAgenda(index, 'remarks', e.target.value)} 
                        placeholder="Remarks..." 
                        className="border-slate-200 bg-white" 
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeAgenda(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {agendas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500 bg-slate-50/50">
                      No agendas added. Click "Add Row" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 04 Action Plan / Next Steps */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">04 Action Plan / Next Steps</h3>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Assigning a responsible person automatically creates a task on submission</p>
              </div>
            </div>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={addPoint}>
              <Plus className="h-4 w-4" /> Add Action
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center whitespace-nowrap">SR</th>
                  <th className="px-4 py-3 min-w-[350px] whitespace-nowrap">Action Item</th>
                  <th className="px-4 py-3 min-w-[200px] whitespace-nowrap">Responsible</th>
                  <th className="px-4 py-3 min-w-[120px] whitespace-nowrap">Department</th>
                  <th className="px-4 py-3 min-w-[140px] whitespace-nowrap">Priority</th>
                  <th className="px-4 py-3 min-w-[160px] whitespace-nowrap">Planned</th>
                  <th className="px-4 py-3 min-w-[160px] whitespace-nowrap">Actual</th>
                  <th className="px-4 py-3 min-w-[140px] whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 min-w-[200px] whitespace-nowrap">Remarks</th>
                  <th className="px-4 py-3 w-16 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map((point, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-4 py-4 text-center font-medium text-slate-400 pt-6">
                      {index + 1}
                      {point.is_task_converted && <div title="Task created"><CheckCircle2 className="h-3 w-3 text-green-500 inline ml-1" /></div>}
                    </td>
                    <td className="px-4 py-4">
                      <textarea 
                        value={point.text} 
                        onChange={e => updatePoint(index, 'text', e.target.value)} 
                        placeholder="Action description..." 
                        className="w-full min-h-[60px] p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white leading-relaxed" 
                      />
                    </td>
                    <td className="px-4 py-4 space-y-1.5">
                      <Select value={point.assigned_to ? point.assigned_to.toString() : ""} onValueChange={(val) => updatePoint(index, 'assigned_to', parseInt(val))}>
                        <SelectTrigger className="border-slate-200 h-10 rounded-xl bg-white shadow-sm">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(e => (
                            <SelectItem key={e.id} value={e.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center font-bold shrink-0">
                                  {e.name ? e.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                                </div>
                                <span>{e.name || e.username}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-4">
                      <Input 
                        value={point.department || ''} 
                        onChange={e => updatePoint(index, 'department', e.target.value)} 
                        placeholder="Dept" 
                        className="border-slate-200 h-10 rounded-xl bg-white shadow-sm" 
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Select value={point.priority || 'Medium'} onValueChange={(val) => updatePoint(index, 'priority', val)}>
                        <SelectTrigger className={`h-10 rounded-xl bg-white shadow-sm transition-colors ${
                          point.priority === 'Critical' ? 'border-red-400 text-red-600 font-medium ring-1 ring-red-100' : 
                          point.priority === 'High' ? 'border-amber-400 text-amber-600 font-medium ring-1 ring-amber-100' : 
                          point.priority === 'Medium' ? 'border-blue-500 text-blue-600 font-medium ring-1 ring-blue-100' : 
                          'border-slate-200 text-slate-600 font-medium'
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Critical" className="text-red-600 font-medium">Critical</SelectItem>
                          <SelectItem value="High" className="text-amber-600 font-medium">High</SelectItem>
                          <SelectItem value="Medium" className="text-blue-600 font-medium">Medium</SelectItem>
                          <SelectItem value="Low" className="text-slate-600 font-medium">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-4">
                      <Input 
                        type="date"
                        value={point.planned_date || ''} 
                        onChange={e => updatePoint(index, 'planned_date', e.target.value)} 
                        className="border-slate-200 h-10 rounded-xl bg-white text-sm shadow-sm" 
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Input 
                        type="date"
                        value={point.actual_date || ''} 
                        onChange={e => updatePoint(index, 'actual_date', e.target.value)} 
                        className="border-slate-200 h-10 rounded-xl bg-white text-sm shadow-sm" 
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Select value={point.status || 'Open'} onValueChange={(val) => updatePoint(index, 'status', val)}>
                        <SelectTrigger className="border-slate-200 h-10 rounded-xl bg-white shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-4">
                      <Input 
                        value={point.remarks || ''} 
                        onChange={e => updatePoint(index, 'remarks', e.target.value)} 
                        placeholder="Remarks..." 
                        className="border-slate-200 h-10 rounded-xl bg-white shadow-sm" 
                      />
                    </td>
                    <td className="px-4 py-4 text-center pt-5 flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => removePoint(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {!point.is_task_converted && point.assigned_to && point.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50" onClick={() => convertToTask(point.id)} title="Convert to Task">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {points.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500 bg-slate-50/50">
                      No action items added. Click "Add Action" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- PRINT VIEW --- */}
      <div id="mom-pdf-content" className="hidden print:block w-full bg-white text-[13px] leading-tight print:m-0 print:p-0">
        <div className="bg-[#2563eb] text-white p-6 flex justify-between items-start mb-6" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">{currentUser?.organization_name || 'FACILITY MANAGEMENT'}</h1>
            <p className="text-blue-100 text-lg">Minutes of Meeting</p>
          </div>
          <div className="text-right text-sm">
            <p className="mb-1">MOM No: MOM-{new Date().getFullYear()}-{mom.id.toString().padStart(3, '0')}</p>
            <p>Status: {mom.meeting_status === 'completed' ? 'Completed' : 'Draft'}</p>
          </div>
        </div>

        <div className="mb-6 px-6">
          <h2 className="text-blue-600 font-bold text-base bg-blue-50 p-2 mb-0 border border-slate-300 border-b-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>1. Meeting Information</h2>
          <table className="w-full border-collapse border border-slate-300">
            <tbody>
              <tr><td className="border border-slate-300 p-2 font-bold w-1/4 bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>Client Name</td><td className="border border-slate-300 p-2">{mom.client_name || '-'}</td></tr>
              <tr><td className="border border-slate-300 p-2 font-bold bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>Site Name</td><td className="border border-slate-300 p-2">{mom.site_name || '-'}</td></tr>
              <tr><td className="border border-slate-300 p-2 font-bold bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>Location</td><td className="border border-slate-300 p-2">{mom.location || '-'}</td></tr>
              <tr><td className="border border-slate-300 p-2 font-bold bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>Meeting Date</td><td className="border border-slate-300 p-2">{mom.meeting_date || '-'}</td></tr>
              <tr><td className="border border-slate-300 p-2 font-bold bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>Start Time</td><td className="border border-slate-300 p-2">{mom.start_time || '-'}</td></tr>
              <tr><td className="border border-slate-300 p-2 font-bold bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>End Time</td><td className="border border-slate-300 p-2">{mom.end_time || '-'}</td></tr>
              <tr><td className="border border-slate-300 p-2 font-bold bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>Meeting Type</td><td className="border border-slate-300 p-2">{mom.meeting_type || '-'}</td></tr>
              <tr><td className="border border-slate-300 p-2 font-bold bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>Prepared By</td><td className="border border-slate-300 p-2">{mom.prepared_by || '-'}</td></tr>
              <tr><td className="border border-slate-300 p-2 font-bold bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>Meeting Status</td><td className="border border-slate-300 p-2">{mom.meeting_status === 'completed' ? 'Completed' : 'Scheduled'}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mb-6 px-6">
          <h2 className="text-blue-600 font-bold text-base bg-blue-50 p-2 mb-0 border border-slate-300 border-b-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>2. Attendees</h2>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-[#2563eb] text-white" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                <th className="border border-slate-300 p-2 text-left w-12">#</th>
                <th className="border border-slate-300 p-2 text-left w-1/4">Name</th>
                <th className="border border-slate-300 p-2 text-left w-1/4">Designation</th>
                <th className="border border-slate-300 p-2 text-left w-1/4">Email</th>
                <th className="border border-slate-300 p-2 text-left w-32">Type</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a: any, i: number) => {
                const isClient = a.is_external;
                const name = isClient ? a.name : (a.user_details?.first_name ? `${a.user_details.first_name} ${a.user_details.last_name || ''}` : a.user_details?.username || 'Employee');
                const designation = isClient ? 'Client' : (a.user_details?.department || 'Staff');
                const email = isClient ? a.email : a.user_details?.email;
                const type = isClient ? 'Client' : 'Logicon';
                return (
                  <tr key={i}>
                    <td className="border border-slate-300 p-2">{i + 1}</td>
                    <td className="border border-slate-300 p-2">{name}</td>
                    <td className="border border-slate-300 p-2">{designation || '-'}</td>
                    <td className="border border-slate-300 p-2">{email || '-'}</td>
                    <td className="border border-slate-300 p-2">{type}</td>
                  </tr>
                );
              })}
              {attendees.length === 0 && <tr><td colSpan={5} className="border border-slate-300 p-2 text-center text-slate-500">No attendees recorded.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mb-6 px-6">
          <h2 className="text-blue-600 font-bold text-base bg-blue-50 p-2 mb-0 border border-slate-300 border-b-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>3. Meeting Agenda</h2>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                <th className="border border-slate-300 p-2 text-left w-12">#</th>
                <th className="border border-slate-300 p-2 text-left w-1/2">Topic</th>
                <th className="border border-slate-300 p-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {agendas.map((ag: any, i: number) => (
                <tr key={i}>
                  <td className="border border-slate-300 p-2">{i + 1}</td>
                  <td className="border border-slate-300 p-2">{ag.topic || '-'}</td>
                  <td className="border border-slate-300 p-2">{ag.remarks || '-'}</td>
                </tr>
              ))}
              {agendas.length === 0 && <tr><td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-500">No agendas recorded.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mb-6 px-6">
          <h2 className="text-blue-600 font-bold text-base bg-blue-50 p-2 mb-0 border border-slate-300 border-b-0" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>4. Action Plan / Next Steps</h2>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                <th className="border border-slate-300 p-2 text-left w-10">#</th>
                <th className="border border-slate-300 p-2 text-left w-1/3">Action Description</th>
                <th className="border border-slate-300 p-2 text-left w-32">Assigned To</th>
                <th className="border border-slate-300 p-2 text-left w-24">Priority</th>
                <th className="border border-slate-300 p-2 text-left w-24">Target Date</th>
                <th className="border border-slate-300 p-2 text-left w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {points.map((pt: any, i: number) => (
                <tr key={i}>
                  <td className="border border-slate-300 p-2">{i + 1}</td>
                  <td className="border border-slate-300 p-2 whitespace-pre-wrap">{pt.text || '-'}</td>
                  <td className="border border-slate-300 p-2">{pt.assigned_to_details?.first_name ? `${pt.assigned_to_details.first_name} ${pt.assigned_to_details.last_name || ''}` : pt.assigned_to_details?.username || '-'}</td>
                  <td className="border border-slate-300 p-2">{pt.priority || '-'}</td>
                  <td className="border border-slate-300 p-2">{pt.planned_date || '-'}</td>
                  <td className="border border-slate-300 p-2">{pt.status || '-'}</td>
                </tr>
              ))}
              {points.length === 0 && <tr><td colSpan={6} className="border border-slate-300 p-2 text-center text-slate-500">No action points recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
