import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Building2, Plus, Users, ChevronRight, Search,
  UserCheck, UserX, Loader2, Settings2, Check, X,
  ShieldPlus, MapPin, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/config";


const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman & Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

interface Department { id: number; name: string; description: string; }
interface Employee {
  id: number; username: string; full_name: string;
  email: string; department: string | null; department_id: number | null;
}
interface Organization {
  id: number; name: string; state: string; city: string;
  address: string; created_at: string;
}

const DEPT_COLORS = [
  "from-blue-500 to-blue-600", "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600", "from-orange-500 to-orange-600",
  "from-rose-500 to-rose-600", "from-cyan-500 to-cyan-600",
  "from-amber-500 to-amber-600", "from-indigo-500 to-indigo-600",
];

export default function OrganizationSetup() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [empSearch, setEmpSearch] = useState("");

  // Create department dialog
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Create user dialog
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Create admin dialog
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminFullName, setNewAdminFullName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminDeptId, setNewAdminDeptId] = useState<number | null>(null);
  const [newAdminState, setNewAdminState] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminCreatedInfo, setAdminCreatedInfo] = useState<{ username: string; temp_password: string } | null>(null);

  // Create organization dialog
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgState, setNewOrgState] = useState("");
  const [newOrgCity, setNewOrgCity] = useState("");
  const [newOrgAddress, setNewOrgAddress] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchDepartments = async () => {
    const res = await fetch(`${API_BASE}/auth/roles/`, { headers });
    if (res.ok) setDepartments(await res.json());
  };

  const fetchEmployees = async () => {
    const res = await fetch(`${API_BASE}/auth/employees/`, { headers });
    if (res.ok) setEmployees(await res.json());
  };

  const fetchOrganizations = async () => {
    const res = await fetch(`${API_BASE}/auth/organizations/`, { headers });
    if (res.ok) setOrganizations(await res.json());
  };

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchOrganizations();
  }, [token]);

  // ─── Create Department ──────────────────────────────────────────
  const handleCreateDept = async () => {
    if (!newDeptName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/auth/roles/`, {
        method: "POST", headers,
        body: JSON.stringify({ name: newDeptName, description: newDeptDesc }),
      });
      if (!res.ok) { toast.error("Failed to create department"); return; }
      toast.success(`Department "${newDeptName}" created!`);
      setNewDeptName(""); setNewDeptDesc("");
      setShowCreateDept(false);
      await fetchDepartments();
    } catch { toast.error("Network error"); }
    finally { setIsCreating(false); }
  };

  // ─── Create Organization ────────────────────────────────────────
  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !newOrgState) return;
    setIsCreatingOrg(true);
    try {
      const res = await fetch(`${API_BASE}/auth/organizations/`, {
        method: "POST", headers,
        body: JSON.stringify({ name: newOrgName, state: newOrgState, city: newOrgCity, address: newOrgAddress }),
      });
      if (!res.ok) { toast.error("Failed to create organization"); return; }
      toast.success(`Organization "${newOrgName}" created!`);
      setNewOrgName(""); setNewOrgState(""); setNewOrgCity(""); setNewOrgAddress("");
      setShowCreateOrg(false);
      await fetchOrganizations();
    } catch { toast.error("Network error"); }
    finally { setIsCreatingOrg(false); }
  };

  // ─── Create User ────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserPassword.trim()) return;
    setIsCreatingUser(true);
    try {
      const res = await fetch(`${API_BASE}/auth/create-user/`, {
        method: "POST", headers,
        body: JSON.stringify({
          username: newUserName, email: newUserEmail,
          full_name: newUserFullName, password: newUserPassword,
          department_id: selectedDept?.id,
        }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "Failed to create member"); return; }
      toast.success(`Member "${newUserName}" created and assigned!`);
      setNewUserName(""); setNewUserEmail(""); setNewUserFullName(""); setNewUserPassword("");
      setShowCreateUser(false);
      fetchEmployees();
    } catch { toast.error("Network error"); }
    finally { setIsCreatingUser(false); }
  };

  // ─── Create Admin ───────────────────────────────────────────────
  const handleCreateAdmin = async () => {
    if (!newAdminFullName.trim() || !newAdminEmail.trim()) return;
    setIsCreatingAdmin(true);
    try {
      const res = await fetch(`${API_BASE}/auth/create-admin/`, {
        method: "POST", headers,
        body: JSON.stringify({
          full_name: newAdminFullName, email: newAdminEmail,
          department_id: newAdminDeptId, state: newAdminState,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create admin"); return; }
      setAdminCreatedInfo({ username: data.username, temp_password: data.temp_password });
      setNewAdminFullName(""); setNewAdminEmail(""); setNewAdminDeptId(null); setNewAdminState("");
      toast.success(`Admin "${data.username}" created!`);
    } catch { toast.error("Network error"); }
    finally { setIsCreatingAdmin(false); }
  };

  // ─── Delete Department ──────────────────────────────────────────
  const handleDeleteDept = async (dept: Department) => {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    const res = await fetch(`${API_BASE}/auth/roles/${dept.id}/`, { method: "DELETE", headers });
    if (res.ok) {
      toast.success("Department deleted");
      if (selectedDept?.id === dept.id) setSelectedDept(null);
      fetchDepartments(); fetchEmployees();
    }
  };

  // ─── Assign / Remove Employee ───────────────────────────────────
  const assignEmployee = async (emp: Employee) => {
    if (!selectedDept) return;
    if (emp.department_id === selectedDept.id) {
      const res = await fetch(`${API_BASE}/auth/remove-department/${emp.id}/`, { method: "POST", headers });
      if (res.ok) { toast.success(`${emp.full_name} removed`); fetchEmployees(); }
      return;
    }
    const res = await fetch(`${API_BASE}/auth/assign-department/`, {
      method: "POST", headers,
      body: JSON.stringify({ department_id: selectedDept.id, user_ids: [emp.id] }),
    });
    if (res.ok) { toast.success(`${emp.full_name} assigned to ${selectedDept.name}`); fetchEmployees(); }
  };

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.email.toLowerCase().includes(empSearch.toLowerCase())
  );
  const deptMembers = employees.filter(e => e.department_id === selectedDept?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Organization Setup</h1>
            <p className="text-sm text-slate-500">Manage organisations and departments</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
            onClick={() => setShowCreateOrg(true)}
          >
            <Globe className="h-4 w-4" /> Add Organisation
          </Button>
        </div>
      </div>

      {/* ── Organisations List ───────────────────────────────────── */}
      {organizations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" /> Organisations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {organizations.map((org, idx) => (
              <div key={org.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
                <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white font-bold", DEPT_COLORS[idx % DEPT_COLORS.length])}>
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{org.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {org.city ? `${org.city}, ` : ""}{org.state}
                  </p>
                  {org.address && <p className="text-xs text-slate-400 mt-0.5 truncate">{org.address}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left: Departments Panel ──────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Departments
              </h2>
              <Button size="sm" className="h-7 text-xs bg-primary text-white hover:bg-primary/90 gap-1" onClick={() => setShowCreateDept(true)}>
                <Plus className="h-3 w-3" /> New
              </Button>
            </div>
            <div className="divide-y divide-slate-50">
              {departments.length === 0 && (
                <div className="p-8 text-center">
                  <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No departments yet.</p>
                </div>
              )}
              {departments.map((dept, idx) => {
                const memberCount = employees.filter(e => e.department_id === dept.id).length;
                const isSelected = selectedDept?.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDept(dept)}
                    className={cn("w-full text-left p-3 transition-all hover:bg-slate-50 flex items-center gap-3", isSelected && "bg-primary/5 border-l-2 border-primary")}
                  >
                    <div className={cn("h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 text-white font-bold text-sm", DEPT_COLORS[idx % DEPT_COLORS.length])}>
                      {dept.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{dept.name}</p>
                      <p className="text-xs text-slate-400">{memberCount} member{memberCount !== 1 ? "s" : ""}</p>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-slate-300 transition-transform", isSelected && "rotate-90 text-primary")} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{departments.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Departments</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{employees.filter(e => e.department_id).length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Assigned</p>
            </div>
          </div>
        </div>

        {/* ── Right: Members Panel ─────────────────────────────── */}
        <div className="lg:col-span-9">
          {!selectedDept ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-80 flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Settings2 className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Select a Department</h3>
              <p className="text-sm text-slate-400 max-w-xs">Choose a department from the left panel to manage its members.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dept Header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg", DEPT_COLORS[departments.findIndex(d => d.id === selectedDept.id) % DEPT_COLORS.length])}>
                    {selectedDept.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedDept.name}</h2>
                    <p className="text-sm text-slate-400">{selectedDept.description || "No description"} · {deptMembers.length} member{deptMembers.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 text-xs" onClick={() => handleDeleteDept(selectedDept)}>
                  <X className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>

              {/* Members */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-9 h-9 text-sm bg-slate-50 border-slate-200" placeholder="Search employees..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="h-9 bg-primary text-white hover:bg-primary/90 gap-1 whitespace-nowrap" onClick={() => setShowCreateUser(true)}>
                    <Plus className="h-4 w-4" /> Add Member
                  </Button>
                </div>

                <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                  {filteredEmployees.map(emp => {
                    const isInThisDept = emp.department_id === selectedDept.id;
                    const isInOtherDept = emp.department_id && !isInThisDept;
                    return (
                      <div key={emp.id} className="flex items-center gap-4 p-3.5 hover:bg-slate-50 transition-colors">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {emp.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{emp.full_name}</p>
                          <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                        </div>
                        <div className="shrink-0">
                          {isInThisDept && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs"><Check className="h-3 w-3 mr-1" />{selectedDept.name}</Badge>}
                          {isInOtherDept && <Badge variant="secondary" className="text-xs text-slate-500">{emp.department}</Badge>}
                          {!emp.department_id && <Badge variant="outline" className="text-xs text-slate-400">Unassigned</Badge>}
                        </div>
                        <Button
                          size="sm"
                          variant={isInThisDept ? "outline" : "default"}
                          className={cn("h-7 text-xs shrink-0", isInThisDept ? "text-red-500 border-red-200 hover:bg-red-50" : "bg-primary text-white hover:bg-primary/90")}
                          onClick={() => assignEmployee(emp)}
                        >
                          {isInThisDept ? <><UserX className="h-3 w-3 mr-1" />Remove</> : <><UserCheck className="h-3 w-3 mr-1" />Assign</>}
                        </Button>
                      </div>
                    );
                  })}
                  {filteredEmployees.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No employees found.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ DIALOGS ═══════════════════════════════════ */}

      {/* Create Organisation Dialog */}
      <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-600" /> Add New Organisation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Organisation Name *</label>
              <Input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="e.g., Acme Corp" className="h-10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">State *</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={newOrgState}
                  onChange={e => setNewOrgState(e.target.value)}
                >
                  <option value="">— Select State —</option>
                  {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">City</label>
                <Input value={newOrgCity} onChange={e => setNewOrgCity(e.target.value)} placeholder="e.g., Mumbai" className="h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Address (optional)</label>
              <Input value={newOrgAddress} onChange={e => setNewOrgAddress(e.target.value)} placeholder="e.g., 42 Park Street, 3rd Floor" className="h-10" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateOrg(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!newOrgName.trim() || !newOrgState || isCreatingOrg} onClick={handleCreateOrg}>
              {isCreatingOrg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
              Create Organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Department Dialog */}
      <Dialog open={showCreateDept} onOpenChange={setShowCreateDept}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Create New Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Department Name *</label>
              <Input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="e.g., Engineering, HR, Sales" className="h-10" onKeyDown={e => e.key === "Enter" && handleCreateDept()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Description (optional)</label>
              <Input value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)} placeholder="Brief description" className="h-10" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateDept(false)}>Cancel</Button>
            <Button className="bg-primary text-white" disabled={!newDeptName.trim() || isCreating} onClick={handleCreateDept}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /> Add New Member to {selectedDept?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
              <Input value={newUserFullName} onChange={e => setNewUserFullName(e.target.value)} placeholder="e.g., John Doe" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Username *</label>
              <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="e.g., johndoe" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
              <Input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="e.g., john@company.com" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password *</label>
              <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Temporary password" className="h-10" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateUser(false)}>Cancel</Button>
            <Button className="bg-primary text-white" disabled={!newUserName.trim() || !newUserPassword.trim() || isCreatingUser} onClick={handleCreateUser}>
              {isCreatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateAdmin} onOpenChange={(open) => { setShowCreateAdmin(open); if (!open) setAdminCreatedInfo(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldPlus className="h-5 w-5 text-violet-600" /> Add Admin Account
            </DialogTitle>
          </DialogHeader>

          {adminCreatedInfo ? (
            <div className="space-y-4 mt-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
                <p className="font-bold text-emerald-700 mb-2">✅ Admin created successfully!</p>
                <p className="text-slate-600">Share these credentials securely with the admin:</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between bg-white rounded-lg px-3 py-2 border">
                    <span className="text-xs text-slate-500 font-medium">Username</span>
                    <span className="text-xs font-mono font-bold">{adminCreatedInfo.username}</span>
                  </div>
                  <div className="flex justify-between bg-white rounded-lg px-3 py-2 border">
                    <span className="text-xs text-slate-500 font-medium">Temp Password</span>
                    <span className="text-xs font-mono font-bold">{adminCreatedInfo.temp_password}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">⚠️ This password will not be shown again. Please save it now.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowCreateAdmin(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Admin Full Name *</label>
                  <Input value={newAdminFullName} onChange={e => setNewAdminFullName(e.target.value)} placeholder="e.g., Jane Smith" className="h-10" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Admin Email *</label>
                  <Input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="e.g., jane@company.com" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Role / Department</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={newAdminDeptId ?? ""}
                    onChange={e => setNewAdminDeptId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— None —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">State / Location</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={newAdminState}
                    onChange={e => setNewAdminState(e.target.value)}
                  >
                    <option value="">— Select State —</option>
                    {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-xs text-violet-700">
                <strong>Note:</strong> A secure temporary password will be auto-generated and shown once after creation.
              </div>
              <DialogFooter className="mt-2">
                <Button variant="outline" onClick={() => setShowCreateAdmin(false)}>Cancel</Button>
                <Button
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={!newAdminFullName.trim() || !newAdminEmail.trim() || isCreatingAdmin}
                  onClick={handleCreateAdmin}
                >
                  {isCreatingAdmin ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldPlus className="h-4 w-4 mr-2" />}
                  Create Admin
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
