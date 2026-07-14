import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, UserCheck } from 'lucide-react';
import { API_BASE } from "@/config";

export default function PendingApprovals() {
  const { token } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { role_id: string; department_id: string }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Pending Users
      let res = await fetch(`${API_BASE}/auth/pending-users/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setPendingUsers(await res.json());

      // Fetch Departments
      res = await fetch(`${API_BASE}/resources/departments/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDepartments(await res.json());

      // Fetch Roles
      res = await fetch(`${API_BASE}/auth/roles/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setRoles(await res.json());
    } catch (e) {
      console.error(e);
      toast.error('Failed to load pending approvals data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    const assign = assignments[userId];
    if (!assign?.role_id || !assign?.department_id) {
      toast.error("Please select a department and a role");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/approve-user/${userId}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', department_id: assign.department_id, role_id: assign.role_id })
      });
      if (res.ok) {
        toast.success("User approved!");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve user");
      }
    } catch (e) { toast.error("Error approving user"); }
  };

  const handleDecline = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/approve-user/${userId}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' })
      });
      if (res.ok) {
        toast.success("User declined and removed");
        fetchData();
      }
    } catch (e) { toast.error("Error declining user"); }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pending Approval</h2>
        <p className="text-muted-foreground mt-2">Review and approve new users who have requested access.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {pendingUsers.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No Pending Requests</h3>
            <p className="text-slate-500 mt-1">All users have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{u.username}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                  <p className="text-xs text-slate-400 mt-1">Requested: {new Date(u.date_joined).toLocaleDateString()}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-full sm:w-40">
                    <Select
                      onValueChange={(val) => setAssignments(p => ({ ...p, [u.id]: { ...p[u.id], department_id: val } }))}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select Dept" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-40">
                    <Select
                      onValueChange={(val) => setAssignments(p => ({ ...p, [u.id]: { ...p[u.id], role_id: val } }))}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select Role" /></SelectTrigger>
                      <SelectContent>
                        {roles.map((r: any) => <SelectItem key={r.id} value={String(r.id)} className="capitalize">{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm" onClick={() => handleApprove(u.id)}>
                      <Check className="h-4 w-4 mr-1.5" /> Approve
                    </Button>
                    <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDecline(u.id)}>
                      <X className="h-4 w-4 mr-1.5" /> Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
