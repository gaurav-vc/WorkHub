import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Copy, Trash2, Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE } from "@/config";

interface MOM {
  id: number;
  title: string;
  description: string;
  meeting_date: string;
  tags: string[];
  created_by_details: any;
  created_at: string;
}

export default function MOMList() {
  const [moms, setMoms] = useState<MOM[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [newClientName, setNewClientName] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newMeetingType, setNewMeetingType] = useState('');
  const [newPreparedBy, setNewPreparedBy] = useState('');
  const [newMeetingStatus, setNewMeetingStatus] = useState('scheduled');
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMOMs();
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

  const fetchMOMs = async () => {
    try {
      const res = await fetch(`${API_BASE}/mom/moms/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMoms(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/mom/moms/`, {
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
      if (res.ok) {
        toast({ title: 'MOM created successfully' });
        setIsCreateOpen(false);
        setNewTitle('');
        setNewDesc('');
        setNewDate('');
        setNewClientName('');
        setNewSiteName('');
        setNewLocation('');
        setNewStartTime('');
        setNewEndTime('');
        setNewMeetingType('');
        setNewPreparedBy('');
        setNewMeetingStatus('scheduled');
        fetchMOMs();
      } else {
        toast({ title: 'Failed to create MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error creating MOM', variant: 'destructive' });
    }
  };

  const handleClone = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/clone/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: 'MOM cloned successfully' });
        fetchMOMs();
      } else {
        toast({ title: 'Failed to clone MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error cloning MOM', variant: 'destructive' });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this MOM?')) return;
    try {
      const res = await fetch(`${API_BASE}/mom/moms/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: 'MOM deleted' });
        fetchMOMs();
      } else {
        toast({ title: 'Failed to delete MOM', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error deleting MOM', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Minutes of Meeting
          </h1>
          <p className="text-sm text-slate-500">Track and manage meeting outcomes and action items.</p>
        </div>
        
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/collaboration/moms/create')}>
          <Plus className="h-4 w-4" /> New MOM
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moms.map(mom => (
          <Card key={mom.id} className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-slate-200" onClick={() => navigate(`/collaboration/moms/${mom.id}`)}>
            <div className="h-2 w-full bg-blue-500"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex justify-between items-start">
                <span className="truncate pr-2">{mom.title}</span>
                <div className="flex gap-1 -mt-1 -mr-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={(e) => handleClone(e, mom.id)} title="Clone MOM">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={(e) => handleDelete(e, mom.id)} title="Delete MOM">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <div className="flex items-center text-xs text-slate-500 gap-1 mt-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(mom.meeting_date + 'T12:00:00'), 'PP')}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                {mom.description || "No description provided."}
              </p>
              <div className="flex flex-wrap gap-1">
                {mom.tags && mom.tags.length > 0 ? mom.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">{tag}</Badge>
                )) : (
                  <span className="text-xs text-slate-400 italic">No tags</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {moms.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed rounded-lg bg-slate-50">
            <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p>No Minutes of Meetings found.</p>
            <p className="text-sm">Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
