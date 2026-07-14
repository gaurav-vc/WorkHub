import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { APP_ROUTES } from '@/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, ShieldCheck, Clock, Check, X, Trash2, UserPlus, UserMinus, ChevronDown, ChevronUp, RefreshCw, Settings2, Shield, UserCog, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE } from "@/config";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface RoleAccessData { id: string; site_id: string; site_name: string; role: string; title: string; permissions: any; }
interface Employee { id: number; username: string; full_name: string; email: string; department: string | null; department_id: number | null; reporting_to_id?: number | null; reporting_to_name?: string | null; }
interface RoleObj { id: number; name: string; description: string; }
interface RoleObj { id: number; name: string; description: string; }

const RoleBaseAccessPage: React.FC = () => {
  const { token, portalType } = useAuth();

  // Role permissions
  const [accessMappings, setAccessMappings] = useState<RoleAccessData[]>([]);
  const [rolesList, setRolesList] = useState<string[]>([]);
  const [rolesObjList, setRolesObjList] = useState<RoleObj[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedManagementRoleId, setSelectedManagementRoleId] = useState<number | null>(null);

  // Add Role dialog
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedUsersForNewRole, setSelectedUsersForNewRole] = useState<number[]>([]);

  // Employee assignment
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);

  // Add user to existing role dialog
  const [addUserRoleId, setAddUserRoleId] = useState<number | null>(null);
  const [addUserSearch, setAddUserSearch] = useState('');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchRoles();
    fetchEmployees();
  }, [token]);

  useEffect(() => {
    if (rolesList.length > 0 && selectedRole) fetchMappings();
  }, [selectedRole, rolesList]);

  const fetchRoles = async () => {
    const res = await fetch(`${API_BASE}/rbac/roles/`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const data: RoleObj[] = await res.json();
      const filteredData = data.filter(r => r.name.toLowerCase() !== 'admin' && r.name.toLowerCase() !== 'user');
      setRolesObjList(filteredData);
      const roleNames = filteredData.map(r => r.name.toLowerCase());
      setRolesList(roleNames);
      
      if (roleNames.length > 0 && !selectedRole) {
        setSelectedRole(roleNames[0]);
      }
      if (filteredData.length > 0 && !selectedManagementRoleId) {
         setSelectedManagementRoleId(filteredData[0].id);
      }
    }
  };

  const fetchEmployees = async () => {
    const res = await fetch(`${API_BASE}/auth/employees/`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setEmployees(await res.json());
  };

  const fetchMappings = async () => {
    if (!selectedRole) {
      setAccessMappings([]);
      return;
    }
    setIsLoading(true);
    const res = await fetch(`${API_BASE}/rbac/role-access/?role=${selectedRole}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setAccessMappings(await res.json());
    setIsLoading(false);
  };

  const handleSyncRoutes = async () => {
    setIsLoading(true);
    const res = await fetch(`${API_BASE}/rbac/role-access/sync_routes/`, { method: 'POST', headers, body: JSON.stringify({ routes: APP_ROUTES }) });
    if (res.ok) { toast.success('Routes synced'); await fetchMappings(); }
    else toast.error('Sync failed');
    setIsLoading(false);
  };

  const handleCreateRole = async () => {
    if (!newRoleName) return;
    if (newRoleName.toLowerCase() === 'admin') {
      toast.error('Cannot create admin role from web.');
      return;
    }
    setIsLoading(true);
    try {
      const roleRes = await fetch(`${API_BASE}/auth/roles/`, { method: 'POST', headers, body: JSON.stringify({ name: newRoleName, description: newRoleDesc }) });
      if (!roleRes.ok) { toast.error("Failed to create role"); return; }
      
      // Also create in RBAC table
      await fetch(`${API_BASE}/rbac/roles/`, { method: 'POST', headers, body: JSON.stringify({ name: newRoleName, code: newRoleName.toUpperCase().replace(/\s+/g, '_') }) });
      
      const newRole: RoleObj = await roleRes.json();
      toast.success(`Role "${newRoleName}" created!`);

      // Assign selected users to the new role
      if (selectedUsersForNewRole.length > 0) {
        await fetch(`${API_BASE}/auth/assign-department/`, {
          method: 'POST', headers,
          body: JSON.stringify({ department_id: newRole.id, user_ids: selectedUsersForNewRole })
        });
      }

      // Sync routes for new role
      await fetch(`${API_BASE}/rbac/role-access/sync_routes/`, { method: 'POST', headers, body: JSON.stringify({ routes: APP_ROUTES }) });
      await fetchRoles();
      await fetchEmployees();
      setSelectedRole(newRoleName.toLowerCase());
      setIsAddRoleOpen(false);
      setNewRoleName(''); setNewRoleDesc(''); setSelectedUsersForNewRole([]);
    } catch { toast.error("Error creating role"); }
    finally { setIsLoading(false); }
  };

  const handleDeleteRole = async (role: RoleObj) => {
    if (!confirm(`Delete role "${role.name}"? Users assigned to it will be unassigned.`)) return;
    const res = await fetch(`${API_BASE}/auth/roles/${role.id}/`, { method: 'DELETE', headers });
    if (res.ok) { toast.success(`Role "${role.name}" deleted`); fetchRoles(); fetchEmployees(); }
    else toast.error('Failed to delete role');
  };

  const handleAddUserToRole = async (userId: number, roleId: number) => {
    const res = await fetch(`${API_BASE}/auth/assign-department/`, {
      method: 'POST', headers,
      body: JSON.stringify({ department_id: roleId, user_ids: [userId] })
    });
    if (res.ok) { toast.success('User assigned!'); fetchEmployees(); }
    else toast.error('Failed to assign user');
  };

  const handleRemoveUserFromRole = async (userId: number) => {
    const res = await fetch(`${API_BASE}/auth/remove-department/${userId}/`, { method: 'POST', headers });
    if (res.ok) { toast.success('User removed from role'); fetchEmployees(); }
    else toast.error('Failed to remove user');
  };

  const toggleAccess = async (mapping: RoleAccessData, permissionType: 'view' | 'create' | 'edit') => {
    const newPermissions = { ...mapping.permissions, [permissionType]: !mapping.permissions[permissionType] };
    const res = await fetch(`${API_BASE}/rbac/role-access/${mapping.id}/`, { method: 'PATCH', headers, body: JSON.stringify({ permissions: newPermissions }) });
    if (res.ok) {
      setAccessMappings(prev => prev.map(m => m.id === mapping.id ? { ...m, permissions: newPermissions } : m));
      toast.success(`Updated ${mapping.title}`);
    }
  };

  const setScopeAccess = async (mapping: RoleAccessData, permissionType: 'view' | 'create' | 'edit', scope: string) => {
    const newPermissions = { ...mapping.permissions, [permissionType]: scope };
    const res = await fetch(`${API_BASE}/rbac/role-access/${mapping.id}/`, { method: 'PATCH', headers, body: JSON.stringify({ permissions: newPermissions }) });
    if (res.ok) {
      setAccessMappings(prev => prev.map(m => m.id === mapping.id ? { ...m, permissions: newPermissions } : m));
      toast.success(`Updated ${mapping.title}`);
    }
  };

  const toggleUserForNewRole = (id: number) => {
    setSelectedUsersForNewRole(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ══════════════════════════════════════════════════════
          ROLE PERMISSIONS (visible to everyone)
      ══════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl shadow-sm border border-emerald-200">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Role Permissions</h2>
              <p className="text-muted-foreground text-sm font-medium">Fine-tune page access and actions for each role.</p>
            </div>
          </div>
          <Button onClick={handleSyncRoutes} disabled={isLoading} className="bg-slate-900 text-white hover:bg-slate-800 shadow-md h-10 px-4 rounded-xl gap-2">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Sync App Routes
          </Button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-sm font-bold text-slate-600 whitespace-nowrap">Configuring permissions for:</span>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-64 bg-white border-slate-300 shadow-sm font-bold text-emerald-700 capitalize">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {rolesList.map(r => <SelectItem key={r} value={r} className="capitalize font-medium">{r} Role</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px] font-bold text-slate-700 pl-6">Module Name</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">View Access</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Create Access</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Edit Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(
                  accessMappings
                    .filter(mapping => APP_ROUTES.some(r => r.id === mapping.site_id))
                    .reduce((acc, mapping) => {
                      const route = APP_ROUTES.find(r => r.id === mapping.site_id);
                      const category = route?.category || 'Other Modules';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(mapping);
                      return acc;
                    }, {} as Record<string, RoleAccessData[]>)
                ).map(([category, mappings]) => (
                  <React.Fragment key={category}>
                    <TableRow className="bg-slate-100/60 hover:bg-slate-100/60">
                      <TableCell colSpan={4} className="font-extrabold text-slate-800 uppercase tracking-widest text-xs pl-6 py-2">
                        {category}
                      </TableCell>
                    </TableRow>
                    {mappings.map(mapping => {
                      return (
                        <TableRow key={mapping.id} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="pl-10">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                                <Settings2 className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{mapping.title}</div>
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">{mapping.site_name}</div>
                              </div>
                            </div>
                          </TableCell>
                          
                          {mapping.site_id === 'hr-requests' ? (
                            <>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Switch 
                                    checked={mapping.permissions?.view !== 'none' && mapping.permissions?.view !== false && mapping.permissions?.view !== undefined} 
                                    onCheckedChange={(checked) => setScopeAccess(mapping, 'view', checked ? 'all' : 'none')} 
                                    disabled={selectedRole === 'admin'} 
                                    className="data-[state=checked]:bg-emerald-500" 
                                  />
                                  {(mapping.permissions?.view !== 'none' && mapping.permissions?.view !== false && mapping.permissions?.view !== undefined) && (
                                    <Select disabled={selectedRole === 'admin'} value={typeof mapping.permissions?.view === 'string' ? mapping.permissions.view : 'all'} onValueChange={(val) => setScopeAccess(mapping, 'view', val)}>
                                      <SelectTrigger className="w-[75px] h-6 text-[10px] px-2 py-0">
                                        <SelectValue placeholder="Scope" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="own" className="text-[10px]">Own</SelectItem>
                                        <SelectItem value="team" className="text-[10px]">Team</SelectItem>
                                        <SelectItem value="all" className="text-[10px]">All</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Switch 
                                    checked={mapping.permissions?.create !== 'none' && mapping.permissions?.create !== false && mapping.permissions?.create !== undefined} 
                                    onCheckedChange={(checked) => setScopeAccess(mapping, 'create', checked ? 'all' : 'none')} 
                                    disabled={selectedRole === 'admin'} 
                                    className="data-[state=checked]:bg-blue-500" 
                                  />
                                  {(mapping.permissions?.create !== 'none' && mapping.permissions?.create !== false && mapping.permissions?.create !== undefined) && (
                                    <Select disabled={selectedRole === 'admin'} value={typeof mapping.permissions?.create === 'string' ? mapping.permissions.create : 'all'} onValueChange={(val) => setScopeAccess(mapping, 'create', val)}>
                                      <SelectTrigger className="w-[75px] h-6 text-[10px] px-2 py-0">
                                        <SelectValue placeholder="Scope" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="own" className="text-[10px]">Own</SelectItem>
                                        <SelectItem value="team" className="text-[10px]">Team</SelectItem>
                                        <SelectItem value="all" className="text-[10px]">All</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Switch 
                                    checked={mapping.permissions?.edit !== 'none' && mapping.permissions?.edit !== false && mapping.permissions?.edit !== undefined} 
                                    onCheckedChange={(checked) => setScopeAccess(mapping, 'edit', checked ? 'all' : 'none')} 
                                    disabled={selectedRole === 'admin'} 
                                    className="data-[state=checked]:bg-amber-500" 
                                  />
                                  {(mapping.permissions?.edit !== 'none' && mapping.permissions?.edit !== false && mapping.permissions?.edit !== undefined) && (
                                    <Select disabled={selectedRole === 'admin'} value={typeof mapping.permissions?.edit === 'string' ? mapping.permissions.edit : 'all'} onValueChange={(val) => setScopeAccess(mapping, 'edit', val)}>
                                      <SelectTrigger className="w-[75px] h-6 text-[10px] px-2 py-0">
                                        <SelectValue placeholder="Scope" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="own" className="text-[10px]">Own</SelectItem>
                                        <SelectItem value="team" className="text-[10px]">Team</SelectItem>
                                        <SelectItem value="all" className="text-[10px]">All</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <Switch checked={mapping.permissions?.view === true} onCheckedChange={() => toggleAccess(mapping, 'view')} disabled={selectedRole === 'admin'} className="data-[state=checked]:bg-emerald-500" />
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <Switch checked={mapping.permissions?.create === true} onCheckedChange={() => toggleAccess(mapping, 'create')} disabled={selectedRole === 'admin'} className="data-[state=checked]:bg-blue-500" />
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <Switch checked={mapping.permissions?.edit === true} onCheckedChange={() => toggleAccess(mapping, 'edit')} disabled={selectedRole === 'admin'} className="data-[state=checked]:bg-amber-500" />
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
                {accessMappings.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Settings2 className="h-8 w-8 mb-2 opacity-30" />
                        <p className="font-medium">No mapping routes found</p>
                        <p className="text-xs mt-1">Click "Sync App Routes" above to automatically generate them.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default RoleBaseAccessPage;