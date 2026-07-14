import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit, Save, X, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";

interface Department {
  id: number;
  name: string;
  description: string;
}

export default function SetupDepartments() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/resources/departments/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDepartments(await res.json());
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load departments.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditId(dept.id);
      setForm({ name: dept.name, description: dept.description });
    } else {
      setEditId(null);
      setForm({ name: "", description: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Department name is required.");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `${API_BASE}/resources/departments/${editId}/` : `${API_BASE}/resources/departments/`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success(editId ? "Department updated successfully" : "Department created successfully");
        setIsModalOpen(false);
        fetchDepartments();
      } else {
        const errorData = await res.json();
        toast.error(errorData.name?.[0] || "Failed to save department.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error connecting to server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const res = await fetch(`${API_BASE}/resources/departments/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Department deleted successfully.");
        fetchDepartments();
      } else {
        toast.error("Failed to delete department.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error connecting to server.");
    }
  };

  const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search departments..." 
            className="pl-9 bg-background" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Department
        </Button>
      </div>

      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[30%] font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="text-right w-[150px] font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading departments...</TableCell>
              </TableRow>
            ) : filteredDepts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ShieldAlert className="h-10 w-10 mb-2 opacity-50" />
                    <p>No departments found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredDepts.map(dept => (
                <TableRow key={dept.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-slate-800">{dept.name}</TableCell>
                  <TableCell className="text-slate-600 truncate max-w-[300px]">{dept.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(dept)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Department" : "Add Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input 
                placeholder="e.g. Engineering" 
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea 
                placeholder="Describe the department's purpose..." 
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : "Save Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
