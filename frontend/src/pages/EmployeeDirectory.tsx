import { useState, useEffect } from "react";
import {
  Search,
  Users,
  MapPin,
  Mail,
  Phone,
  Building,
  ArrowLeft,
  Download,
  MessageCircle,
  Grid3X3,
  List,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  status: "active" | "away" | "busy" | "offline";
  joinedDate: string;
  manager: string;
  skills: string[];
}

const departments = ["All", "Engineering", "Product", "Design", "Sales", "Human Resources", "Marketing", "Finance"];

const statusColors: Record<string, string> = {
  active: "bg-success",
  away: "bg-warning",
  busy: "bg-destructive",
  offline: "bg-muted-foreground",
};

export default function EmployeeDirectory() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: "", role: "", department: "Engineering", email: "", phone: "", location: "", joinedDate: "", manager: "", skills: ""
  });

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/directory/employees/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((e: any) => ({
          id: e.id.toString(),
          name: e.name,
          initials: e.initials || e.name.substring(0, 2).toUpperCase(),
          role: e.role,
          department: e.department,
          email: e.email,
          phone: e.phone,
          location: e.location,
          status: e.status || "active",
          joinedDate: e.joined_date || e.joinedDate,
          manager: e.manager,
          skills: e.skills || []
        }));
        setEmployees(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchEmployees();
  }, [token]);

  const handleAddEmployee = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and Email are required");
      return;
    }
    const initials = form.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    const payload = {
      name: form.name,
      initials: initials,
      role: form.role || "Employee",
      department: form.department || "General",
      email: form.email,
      phone: form.phone || "N/A",
      location: form.location || "Remote",
      joinedDate: form.joinedDate || new Date().toISOString().split('T')[0],
      manager: form.manager,
      skills: form.skills.split(",").map(s => s.trim()).filter(s => s),
      status: "active"
    };

    try {
      const res = await fetch(`${API_BASE}/directory/employees/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Employee added to directory");
        setShowAddForm(false);
        setForm({ name: "", role: "", department: "Engineering", email: "", phone: "", location: "", joinedDate: "", manager: "", skills: "" });
        fetchEmployees();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Failed to add employee");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const filtered = employees.filter((e) => {
    const matchDept = department === "All" || e.department === department;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()) || e.department.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  if (selectedEmployee) {
    const e = selectedEmployee;
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
        <Button variant="ghost" onClick={() => setSelectedEmployee(null)} className="gap-1.5 text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to directory
        </Button>
        <Card className="shadow-card overflow-hidden">
          <div className="h-24 gradient-primary" />
          <CardContent className="p-6 -mt-12">
            <div className="flex items-end gap-4 mb-6">
              <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
                <AvatarFallback className="text-2xl font-display font-bold gradient-primary text-primary-foreground">{e.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-display font-bold text-foreground">{e.name}</h1>
                  <div className={`h-2.5 w-2.5 rounded-full ${statusColors[e.status]}`} />
                </div>
                <p className="text-sm text-muted-foreground">{e.role} · {e.department}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs"><MessageCircle className="h-3.5 w-3.5" /> Message</Button>
                <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 text-xs"><Download className="h-3.5 w-3.5" /> vCard</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                  <p className="text-sm text-foreground">{e.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                  <p className="text-sm text-foreground">{e.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                  <p className="text-sm text-foreground">{e.location}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Building className="h-3 w-3" /> Department</p>
                  <p className="text-sm text-foreground">{e.department}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Reports to</p>
                  <p className="text-sm text-foreground">{e.manager}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Joined</p>
                  <p className="text-sm text-foreground">{e.joinedDate}</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {e.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Employee Directory
          </h1>
          <p className="text-muted-foreground mt-1">Find and connect with colleagues across the organization</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-1.5 shadow-sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, role, or department..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border border-border rounded-md p-0.5">
          <Button size="icon" variant={viewMode === "grid" ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
          <Button size="icon" variant={viewMode === "list" ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} employees found</p>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp) => (
            <Card key={emp.id} className="shadow-card hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedEmployee(emp)}>
              <CardContent className="p-4 text-center">
                <div className="relative inline-block mb-3">
                  <Avatar className="h-16 w-16 mx-auto">
                    <AvatarFallback className="text-lg font-display font-bold gradient-primary text-primary-foreground">{emp.initials}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card ${statusColors[emp.status]}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{emp.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{emp.role}</p>
                <Badge variant="secondary" className="text-[10px] mt-2">{emp.department}</Badge>
                <div className="flex items-center justify-center gap-1 mt-2 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />{emp.location}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm font-semibold gradient-primary text-primary-foreground">{emp.initials}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${statusColors[emp.status]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.role} · {emp.department}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{emp.location}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="jane@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} placeholder="e.g. Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.filter(d => d !== "All").map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="e.g. New York, NY" />
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Input value={form.manager} onChange={(e) => setForm({...form, manager: e.target.value})} placeholder="Manager Name" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Skills (comma separated)</Label>
              <Input value={form.skills} onChange={(e) => setForm({...form, skills: e.target.value})} placeholder="React, Node.js, Design" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddEmployee}>Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
