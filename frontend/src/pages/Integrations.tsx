import { useState, useEffect } from "react";
import {
  Plug,
  Settings,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";

interface Integration {
  id?: string | number;
  name: string;
  description: string;
  category: string;
  connected: boolean;
  icon: string;
  config?: Record<string, string>;
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [configuring, setConfiguring] = useState<Integration | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "", category: "" });
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchIntegrations();
  }, [token]);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/integrations/items/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIntegrations(await res.json());
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load integrations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleConnection = async (integration: Integration) => {
    const newConnectedStatus = !integration.connected;
    
    // Optimistic update
    setIntegrations((prev) => prev.map((i) => i.id === integration.id ? { ...i, connected: newConnectedStatus } : i));
    
    try {
      const res = await fetch(`${API_BASE}/integrations/items/${integration.id}/`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ connected: newConnectedStatus })
      });
      
      if (!res.ok) throw new Error("Failed to toggle connection");
      
      toast({ 
        title: `${integration.name} ${newConnectedStatus ? 'connected' : 'disconnected'}`, 
        description: `Integration is now ${newConnectedStatus ? 'active' : 'disabled'}.` 
      });
    } catch (e) {
      // Revert on failure
      setIntegrations((prev) => prev.map((i) => i.id === integration.id ? { ...i, connected: !newConnectedStatus } : i));
      toast({ title: "Error", description: "Failed to update integration status", variant: "destructive" });
    }
  };

  const openConfig = (i: Integration) => {
    setConfiguring(i);
    setConfigForm(i.config || {});
  };

  const saveConfig = async () => {
    if (!configuring) return;
    
    try {
      const res = await fetch(`${API_BASE}/integrations/items/${configuring.id}/`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ config: configForm, connected: true })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setIntegrations((prev) => prev.map((i) => i.id === configuring.id ? updated : i));
        setConfiguring(null);
        toast({ title: "Configuration saved", description: `${configuring.name} settings updated.` });
      } else {
        toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error saving configuration", variant: "destructive" });
    }
  };

  const addIntegration = async () => {
    if (!addForm.name.trim()) return;
    
    const newIntegration = {
      name: addForm.name,
      description: addForm.description,
      category: addForm.category || "Custom",
      connected: false,
      icon: "🔌",
      config: {}
    };

    try {
      const res = await fetch(`${API_BASE}/integrations/items/`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newIntegration)
      });
      
      if (res.ok) {
        const added = await res.json();
        setIntegrations((prev) => [...prev, added]);
        setShowAdd(false);
        setAddForm({ name: "", description: "", category: "" });
        toast({ title: "Success", description: "Integration added successfully." });
      } else {
        toast({ title: "Error", description: "Failed to add integration", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error adding integration", variant: "destructive" });
    }
  };

  const deleteIntegration = async (id: string | number | undefined) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/integrations/items/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok || res.status === 404) {
        setIntegrations((prev) => prev.filter((i) => i.id !== id));
        toast({ title: "Deleted", description: "Integration removed." });
      } else {
        toast({ title: "Error", description: "Failed to delete integration", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error deleting integration", variant: "destructive" });
    }
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading integrations...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" /> Integrations
          </h1>
          <p className="text-muted-foreground mt-1">Connect your favorite tools and services · {connectedCount} active</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Custom
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="shadow-card hover:shadow-md transition-all group">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl h-10 w-10 flex items-center justify-center rounded-lg bg-muted shrink-0">{integration.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                    {integration.connected ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{integration.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">{integration.category}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openConfig(integration)}>
                    <Settings className="h-3 w-3 mr-1" /> Configure
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteIntegration(integration.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Switch checked={integration.connected} onCheckedChange={() => toggleConnection(integration)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config Dialog */}
      <Dialog open={!!configuring} onOpenChange={(o) => !o && setConfiguring(null)}>
        <DialogContent className="sm:max-w-md">
          {configuring && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-xl">{configuring.icon}</span> {configuring.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">API Key / Token</Label>
                  <Input value={configForm.apiKey || ""} onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })} placeholder="Enter API key" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sync Interval</Label>
                  <Input value={configForm.syncInterval || "15 min"} onChange={(e) => setConfigForm({ ...configForm, syncInterval: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Webhook URL</Label>
                  <Input value={configForm.webhook || ""} onChange={(e) => setConfigForm({ ...configForm, webhook: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button className="gradient-primary text-primary-foreground" onClick={saveConfig}>Save & Connect</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Custom Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Custom Integration</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Category</Label><Input value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} placeholder="e.g., CRM, Dev Tools" /></div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={addIntegration}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
