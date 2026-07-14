import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, FileText, Users, ListTodo, Plus, Trash2, Search, MapPin, Calendar, UserPlus, ClipboardList } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { API_BASE } from "@/config";

export default function CreateMOM() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<any[]>([]);
  
  // 01 Meeting Information State
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
  const [isSaving, setIsSaving] = useState(false);

  // 02 Attendees State
  const [activeTab, setActiveTab] = useState<'client' | 'org'>('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [externalAttendees, setExternalAttendees] = useState<any[]>([]);
  const [internalAttendees, setInternalAttendees] = useState<any[]>([]);

  // Add External Dialog
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false);
  const [extName, setExtName] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extPhone, setExtPhone] = useState('');

  // Add Internal Dialog
  const [isAddInternalOpen, setIsAddInternalOpen] = useState(false);
  const [internalUserId, setInternalUserId] = useState('');

  // 03 Agenda State
  const [agendas, setAgendas] = useState<any[]>([]);

  // 04 Action Plan State
  const [points, setPoints] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/employees/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) { console.error("Error fetching employees:", error); }
  };

  const handleAddExternal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extName || !extEmail) return;
    setExternalAttendees([...externalAttendees, {
      id: `ext-${Date.now()}`,
      is_external: true,
      name: extName,
      email: extEmail,
      phone: extPhone
    }]);
    setIsAddExternalOpen(false);
    setExtName(''); setExtEmail(''); setExtPhone('');
    toast({ title: 'External attendee added locally' });
  };

  const handleAddInternal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalUserId) return;
    const emp = employees.find(e => e.id.toString() === internalUserId);
    if (!emp) return;
    
    setInternalAttendees([...internalAttendees, {
      id: `int-${Date.now()}`,
      is_external: false,
      user_id: emp.id,
      user_details: emp
    }]);
    setIsAddInternalOpen(false);
    setInternalUserId('');
    toast({ title: 'Internal attendee added locally' });
  };

  const removeAttendee = (id: string, type: 'client' | 'org') => {
    if (type === 'client') {
      setExternalAttendees(externalAttendees.filter(a => a.id !== id));
    } else {
      setInternalAttendees(internalAttendees.filter(a => a.id !== id));
    }
  };

  const addAgenda = () => {
    setAgendas([...agendas, { id: `agenda-${Date.now()}`, topic: '', remarks: '' }]);
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

  const addPoint = () => {
    setPoints([...points, { 
      id: `point-${Date.now()}`, 
      text: '', 
      assigned_to: '', 
      department: '', 
      priority: 'Medium', 
      planned_date: '', 
      actual_date: '', 
      status: 'Open', 
      remarks: '' 
    }]);
  };

  const updatePoint = (index: number, field: string, value: string) => {
    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    
    // Auto-fetch department if responsible person is selected
    if (field === 'assigned_to') {
      const emp = employees.find(e => e.id.toString() === value || e.name === value || e.username === value);
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

  const handleSubmit = async () => {
    if (!newTitle || !newDate) {
      toast({ title: 'Title and Meeting Date are required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Create MOM
      const momRes = await fetch(`${API_BASE}/mom/moms/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
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
          tags: []
        })
      });

      if (!momRes.ok) {
        toast({ title: 'Failed to create MOM', variant: 'destructive' });
        return;
      }

      const momData = await momRes.json();
      const momId = momData.id;

      // 2. Add External Attendees
      const extPromises = externalAttendees.map(ext => 
        fetch(`${API_BASE}/mom/moms/${momId}/add_attendee/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ is_external: true, name: ext.name, email: ext.email, phone: ext.phone })
        })
      );

      // 3. Add Internal Attendees
      const intPromises = internalAttendees.map(int => 
        fetch(`${API_BASE}/mom/moms/${momId}/add_attendee/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ is_external: false, user_id: int.user_id })
        })
      );

      await Promise.all([...extPromises, ...intPromises]);

      // 4. Save Agendas and Points using PUT
      if (agendas.length > 0 || points.length > 0) {
        await fetch(`${API_BASE}/mom/moms/${momId}/`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            ...momData,
            agendas_data: agendas.map(a => ({
              topic: a.topic,
              remarks: a.remarks
            })),
            points_data: points.map(p => ({
              text: p.text,
              assigned_to: p.assigned_to,
              department: p.department,
              priority: p.priority,
              planned_date: p.planned_date || null,
              actual_date: p.actual_date || null,
              status: p.status,
              remarks: p.remarks
            }))
          })
        });
      }

      // 5. Send notifications and emails
      await fetch(`${API_BASE}/mom/moms/${momId}/send_notifications/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast({ title: 'MOM fully created successfully!' });
      navigate(`/collaboration/moms/${momId}`);

    } catch (e) {
      toast({ title: 'Error during MOM creation workflow', variant: 'destructive' });
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const displayedAttendees = (activeTab === 'client' ? externalAttendees : internalAttendees).filter(a => {
    const search = searchQuery.toLowerCase();
    if (activeTab === 'client') {
      return (a.name || '').toLowerCase().includes(search) || (a.email || '').toLowerCase().includes(search);
    }
    return (a.user_details?.username || '').toLowerCase().includes(search) || (a.user_details?.first_name || '').toLowerCase().includes(search) || (a.user_details?.email || '').toLowerCase().includes(search);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center -ml-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/collaboration/moms')}>
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="px-6" onClick={() => navigate('/collaboration/moms')} disabled={isSaving}>
            Cancel
          </Button>
          <Button className="px-8 bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Creating MOM..." : "Create MOM"}
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
                {employees.map((emp) => (
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
            Logicon Attendees ({internalAttendees.length})
          </button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
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
                        {employees.map(u => (
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
                <p className="text-xs text-slate-500 truncate mt-0.5">{activeTab === 'client' ? 'Client' : (a.user_details?.department || 'Logicon Staff')}</p>
                <p className="text-xs text-slate-500 truncate">{activeTab === 'client' ? a.email : a.user_details?.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 shrink-0" onClick={() => removeAttendee(a.id, activeTab)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {displayedAttendees.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No attendees added yet.
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

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
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
                <tr key={agenda.id} className="hover:bg-slate-50/50 transition-colors">
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
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={addPoint}>
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
                <th className="px-4 py-3 w-12 text-center whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {points.map((point, index) => (
                <tr key={point.id} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="px-4 py-4 text-center font-medium text-slate-400 pt-6">
                    {index + 1}
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
                    <Select value={point.assigned_to} onValueChange={(val) => updatePoint(index, 'assigned_to', val)}>
                      <SelectTrigger className="border-slate-200 h-10 rounded-xl bg-white shadow-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(e => (
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
                    <p className="text-[10px] text-blue-600 flex items-center gap-1 font-medium pl-1"><ClipboardList className="h-3 w-3" /> Task will be auto-created</p>
                  </td>
                  <td className="px-4 py-4">
                    <Input 
                      value={point.department} 
                      onChange={e => updatePoint(index, 'department', e.target.value)} 
                      placeholder="Dept" 
                      className="border-slate-200 h-10 rounded-xl bg-white shadow-sm" 
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Select value={point.priority} onValueChange={(val) => updatePoint(index, 'priority', val)}>
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
                      value={point.planned_date} 
                      onChange={e => updatePoint(index, 'planned_date', e.target.value)} 
                      className="border-slate-200 h-10 rounded-xl bg-white text-sm shadow-sm" 
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Input 
                      type="date"
                      value={point.actual_date} 
                      onChange={e => updatePoint(index, 'actual_date', e.target.value)} 
                      className="border-slate-200 h-10 rounded-xl bg-white text-sm shadow-sm" 
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Select value={point.status} onValueChange={(val) => updatePoint(index, 'status', val)}>
                      <SelectTrigger className="border-slate-200 h-10 rounded-xl bg-white shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-4">
                    <Input 
                      value={point.remarks} 
                      onChange={e => updatePoint(index, 'remarks', e.target.value)} 
                      placeholder="Remarks..." 
                      className="border-slate-200 h-10 rounded-xl bg-white shadow-sm" 
                    />
                  </td>
                  <td className="px-4 py-4 text-center pt-5">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => removePoint(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
  );
}
