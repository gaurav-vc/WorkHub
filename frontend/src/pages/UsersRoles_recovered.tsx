import React, { useState, useEffect, useCallback } from 'react';
import SetupDepartments from "./SetupDepartments";
import { 
  Users, 
  Shield, 
  Plus, 
  Search, 
  Copy, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  UserPlus,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

import { API_BASE } from "@/config";

export default function UsersRoles() {
  const { toast } = useToast();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('roles');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Edit States
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [editUserId, setEditUserId] = useState<number | null>(null);

  // Data
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Role Form State
  const defaultRoleState = {
    name: '', code: '', dept: '', scope: '', dashboard: '', 
    canManageUsers: true, canApprove: true, crossDept: false, status: 'Active'
  };
  const [newRole, setNewRole] = useState(defaultRoleState);

  // New User Form State
  const defaultUserState = {
    name: '', email: '', dept: '', role: '', status: true
  };
  const [newUser, setNewUser] = useState(defaultUserState);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE}/rbac/roles/`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${API_BASE}/rbac/users/`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${API_BASE}/resources/departments/`, { headers: { "Authorization": `Bearer ${token}` } })
      ]);
      
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (deptsRes.ok) setDepartments(await deptsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveRole = async () => {
    if (!newRole.name || !newRole.code) return toast({ title: "Error", description: "Role name and code are required", variant: "destructive" });
    setSaving(true);
    try {
      const body = {
        name: newRole.name,
        code: newRole.code,
        department: newRole.dept,
        access_scope: newRole.scope || 'Self',
        dashboard_type: newRole.dashboard || 'Standard',
        can_manage_users: newRole.canManageUsers,
        can_approve: newRole.canApprove,
        cross_department_access: newRole.crossDept,
        status: newRole.status
      };
      
      const method = editRoleId ? "PATCH" : "POST";
      const url = editRoleId ? `${API_BASE}/rbac/roles/${editRoleId}/` : `${API_BASE}/rbac/roles/`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({ title: editRoleId ? "Role Updated" : "Role Created", description: `Role has been ${editRoleId ? 'updated' : 'added'} successfully.` });
        setIsRoleModalOpen(false);
        fetchData();
      } else {
        throw new Error("Failed to save role");
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not save role.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email) return toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
    setSaving(true);
    try {
      const body = {
        name: newUser.name,
        email: newUser.email,
        dept: newUser.dept,
        role: newUser.role,
        status: newUser.status
      };
      
      const method = editUserId ? "PATCH" : "POST";
      const url = editUserId ? `${API_BASE}/rbac/users/${editUserId}/` : `${API_BASE}/rbac/users/`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({ title: editUserId ? "User Updated" : "User Created", description: `User has been ${editUserId ? 'updated' : 'added'} successfully.` });
        setIsUserModalOpen(false);
        fetchData();
      } else {
        throw new Error("Failed to save user");
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not save user.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/roles/${id}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Role Deleted" });
        fetchData();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not delete role.", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/users/${id}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "User Deleted" });
        fetchData();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not delete user.", variant: "destructive" });
    }
  };

  const openAddRole = () => {
    setEditRoleId(null);
    setNewRole(defaultRoleState);
    setIsRoleModalOpen(true);
  };

  const openEditRole = (r: any) => {
    setEditRoleId(r.id);
    setNewRole({
      name: r.name || '', code: r.code || '', dept: r.department || '', scope: r.access_scope || 'Self', 
      dashboard: r.dashboard_type || 'Standard', canManageUsers: r.can_manage_users ?? false, 
      canApprove: r.can_approve ?? false, crossDept: r.cross_department_access ?? false, status: r.status || 'Active'
    });
    setIsRoleModalOpen(true);
  };

  const openAddUser = () => {
    setEditUserId(null);
    setNewUser(defaultUserState);
    setIsUserModalOpen(true);
  };

  const openEditUser = (u: any) => {
    setEditUserId(u.id);
    setNewUser({
      name: u.name || '', email: u.email || '', dept: u.dept || '', role: u.role || '', status: u.status === 'Active'
    });
    setIsUserModalOpen(true);
  };

  const filteredRoles = roles.filter(r => 
    (r.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (r.code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (r.department?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );
  
  const filteredUsers = users.filter(u => 
    !u.is_superuser && (
    (u.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.empId?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.dept?.toLowerCase() || '').includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
// MISSING LINE 251
// MISSING LINE 252
// MISSING LINE 253
// MISSING LINE 254
// MISSING LINE 255
// MISSING LINE 256
// MISSING LINE 257
// MISSING LINE 258
// MISSING LINE 259
// MISSING LINE 260
// MISSING LINE 261
// MISSING LINE 262
// MISSING LINE 263
// MISSING LINE 264
// MISSING LINE 265
// MISSING LINE 266
// MISSING LINE 267
// MISSING LINE 268
// MISSING LINE 269
// MISSING LINE 270
// MISSING LINE 271
// MISSING LINE 272
// MISSING LINE 273
// MISSING LINE 274
// MISSING LINE 275
// MISSING LINE 276
// MISSING LINE 277
// MISSING LINE 278
// MISSING LINE 279
// MISSING LINE 280
// MISSING LINE 281
// MISSING LINE 282
// MISSING LINE 283
// MISSING LINE 284
// MISSING LINE 285
// MISSING LINE 286
// MISSING LINE 287
// MISSING LINE 288
// MISSING LINE 289
// MISSING LINE 290
// MISSING LINE 291
// MISSING LINE 292
// MISSING LINE 293
// MISSING LINE 294
// MISSING LINE 295
// MISSING LINE 296
// MISSING LINE 297
// MISSING LINE 298
// MISSING LINE 299
// MISSING LINE 300
// MISSING LINE 301
// MISSING LINE 302
// MISSING LINE 303
// MISSING LINE 304
// MISSING LINE 305
// MISSING LINE 306
// MISSING LINE 307
// MISSING LINE 308
// MISSING LINE 309
// MISSING LINE 310
// MISSING LINE 311
// MISSING LINE 312
// MISSING LINE 313
// MISSING LINE 314
// MISSING LINE 315
// MISSING LINE 316
// MISSING LINE 317
// MISSING LINE 318
// MISSING LINE 319
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label className="mb-2">Cross-Department Access</Label>
                      <Switch checked={newRole.crossDept} onCheckedChange={v => setNewRole({...newRole, crossDept: v})} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveRole} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editRoleId ? "Save Changes" : "Save Role"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
              <Button onClick={openAddUser}>
                <UserPlus className="h-4 w-4 mr-2" /> Add User
              </Button>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>{editUserId ? "Edit User" : "New User"}</DialogTitle>
                  <CardDescription>Fields are linked to keep your hierarchy consistent.</CardDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name <span className="text-red-500">*</span></Label>
                        <Input placeholder="e.g. Aarav Mehta" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Employee ID</Label>
                        <Input placeholder="Auto-generated" disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Email <span className="text-red-500">*</span></Label>
                        <Input type="email" placeholder="user@company.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} disabled={!!editUserId} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Organizational Assignment</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={newUser.dept} onValueChange={(v) => setNewUser({...newUser, dept: v})}>
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            {departments.map(d => (
                              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            {roles.map(r => (
                              <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                            ))}
                            {roles.length === 0 && <SelectItem value="none" disabled>No roles available</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Security</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 flex flex-col justify-center">
                        <Label className="mb-2">Status Active</Label>
                        <Switch checked={newUser.status} onCheckedChange={v => setNewUser({...newUser, status: v})} />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveUser} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editUserId ? "Save Changes" : "Save User"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="roles" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 space-x-6">
          <TabsTrigger 
            value="roles" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"
          >
            Roles <Badge variant="secondary" className="ml-2 bg-slate-100">{filteredRoles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"
          >
            Users <Badge variant="secondary" className="ml-2 bg-slate-100">{filteredUsers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="departments" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-2 py-3 bg-transparent shadow-none"
          >
            Departments
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              className="pl-9 bg-white border-slate-200" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="roles" className="mt-0">
          <Card className="border border-slate-200 shadow-sm rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600 text-xs">ROLE</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs">DEPARTMENT</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs">ACCESS SCOPE</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs">CAN APPROVE</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs">STATUS</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs text-right">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading roles...</TableCell>
                  </TableRow>
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">No roles found.</TableCell>
                  </TableRow>
                ) : filteredRoles.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-900">{r.name}</div>
                      <div className="text-xs text-slate-500 uppercase">{r.code}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{r.department || '-'}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">{r.access_scope}</span>
                    </TableCell>
                    <TableCell>
                      <Switch checked={r.can_approve} disabled />
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium ${r.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${r.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-slate-900" onClick={() => openEditRole(r)}><Edit className="h-4 w-4 mr-1"/> Edit</Button>
                        <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteRole(r.id)}><Trash2 className="h-4 w-4 mr-1"/> Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
