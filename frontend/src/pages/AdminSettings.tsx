import { useState } from "react";
import {
  Settings,
  Shield,
  Users,
  Plus,
  Trash2,
  Edit,
  CheckSquare,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Role {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  permissions: Record<string, boolean>;
}

const permissionsList = [
  "Dashboard",
  "My Day",
  "Calendar",
  "Projects",
  "Timeline",
  "Resources",
  "Templates",
  "MOM",
  "Team Chat",
  "Docs & Notes",
  "Knowledge Base",
  "My Boards",
  "Learning Center",
  "HR Requests",
  "Directory",
  "Recognition",
  "Policies",
  "Attendance",
  "Company Pulse",
  "Workflows",
  "Insights",
  "AI Agents",
  "Setup",
  "Branding",
  "Integrations"
];

const initialRoles: Role[] = [
  {
    id: "r1", name: "Admin", description: "Full access to all features and settings", usersCount: 3,
    permissions: Object.fromEntries(permissionsList.map((p) => [p, true])),
  },
  {
    id: "r2", name: "Manager", description: "Team management and approval capabilities", usersCount: 8,
    permissions: Object.fromEntries(permissionsList.map((p) => [p, !["Setup", "Branding", "Integrations"].includes(p)])),
  },
  {
    id: "r3", name: "Employee", description: "Standard employee access", usersCount: 45,
    permissions: Object.fromEntries(permissionsList.map((p) => [p, !["Projects", "Workflows", "Insights", "Setup", "Branding", "Integrations"].includes(p)])),
  },
];

interface AuditLog {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

const auditLogs: AuditLog[] = [
  { id: "al1", user: "Sarah Johnson", action: "Updated", target: "Employee role permissions", time: "2h ago" },
  { id: "al2", user: "Tom Baker", action: "Connected", target: "Slack integration", time: "5h ago" },
  { id: "al3", user: "Sarah Johnson", action: "Created", target: "New workflow: Leave Approval", time: "1d ago" },
  { id: "al4", user: "Admin", action: "Updated", target: "Company branding settings", time: "2d ago" },
  { id: "al5", user: "Tom Baker", action: "Invited", target: "3 new users", time: "3d ago" },
];

export default function AdminSettings() {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: {} as Record<string, boolean> });

  const openCreate = () => {
    setEditRole(null);
    setForm({ name: "", description: "", permissions: Object.fromEntries(permissionsList.map((p) => [p, false])) });
    setShowRoleDialog(true);
  };

  const openEdit = (r: Role) => {
    setEditRole(r);
    setForm({ name: r.name, description: r.description, permissions: { ...r.permissions } });
    setShowRoleDialog(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editRole) {
      setRoles((prev) => prev.map((r) => r.id === editRole.id ? { ...r, name: form.name, description: form.description, permissions: form.permissions } : r));
    } else {
      setRoles((prev) => [...prev, { id: `r-${Date.now()}`, name: form.name, description: form.description, usersCount: 0, permissions: form.permissions }]);
    }
    setShowRoleDialog(false);
    toast({ title: "Role saved", description: `${form.name} role has been updated.` });
  };

  const deleteRole = (id: string) => setRoles((prev) => prev.filter((r) => r.id !== id));

  const togglePermission = (perm: string) => {
    setForm((prev) => ({ ...prev, permissions: { ...prev.permissions, [perm]: !prev.permissions[perm] } }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" /> Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage roles, permissions, and audit logs</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Role
        </Button>
      </div>

      {/* Roles */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{role.description}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">{role.usersCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {Object.values(role.permissions).filter(Boolean).length}/{permissionsList.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(role)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteRole(role.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-sm">{log.user}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{log.action}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.target}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{log.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRole ? "Edit Role" : "New Role"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Role Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {permissionsList.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={form.permissions[perm] || false} onCheckedChange={() => togglePermission(perm)} />
                    <span className="text-xs text-foreground">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={save}><Save className="h-3.5 w-3.5 mr-1" /> Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
