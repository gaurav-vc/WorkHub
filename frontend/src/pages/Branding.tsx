import { useState, useEffect } from "react";
import {
  Palette,
  Save,
  Upload,
  Globe,
  Type,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";

interface BrandSettings {
  id?: number;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  logo: string;
  favicon: string;
  font: string;
  customDomain: string;
  darkModeDefault: boolean;
  showWelcomeBanner: boolean;
  sidebarStyle: "full" | "compact";
}

const defaultSettings: BrandSettings = {
  companyName: "WorkHub",
  primaryColor: "#2563EB",
  accentColor: "#7C3AED",
  logo: "",
  favicon: "",
  font: "inter",
  customDomain: "",
  darkModeDefault: false,
  showWelcomeBanner: true,
  sidebarStyle: "full",
};

const colorPresets = [
  { name: "Ocean Blue", primary: "#2563EB", accent: "#7C3AED" },
  { name: "Forest Green", primary: "#059669", accent: "#0891B2" },
  { name: "Sunset Orange", primary: "#EA580C", accent: "#DC2626" },
  { name: "Royal Purple", primary: "#7C3AED", accent: "#DB2777" },
  { name: "Slate Gray", primary: "#475569", accent: "#2563EB" },
];

export default function Branding() {
  const [settings, setSettings] = useState<BrandSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/branding/settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setSettings(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load branding settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof BrandSettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    try {
      const isNew = !settings.id;
      const url = isNew 
        ? `${API_BASE}/branding/settings/` 
        : `${API_BASE}/branding/settings/${settings.id}/`;
        
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setHasChanges(false);
        toast({ title: "Branding saved", description: "Your branding settings have been updated successfully." });
      } else {
        toast({ title: "Error", description: "Failed to save branding settings", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Network error saving branding settings", variant: "destructive" });
    }
  };

  const applyPreset = (preset: typeof colorPresets[0]) => {
    setSettings((prev) => ({ ...prev, primaryColor: preset.primary, accentColor: preset.accent }));
    setHasChanges(true);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading branding settings...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" /> Branding
          </h1>
          <p className="text-muted-foreground mt-1">Customize your portal with logo, colors, and domain settings</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={saveSettings} disabled={!hasChanges}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Type className="h-4 w-4 text-primary" /> Company Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name</Label>
              <Input value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                  {settings.logo ? <img src={settings.logo} alt="Logo" className="h-12 w-12 object-contain" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => update("logo", "/placeholder.svg")}>
                    <Upload className="h-3.5 w-3.5 mr-1" /> Upload Logo
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG or SVG, max 2MB</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Font</Label>
              <Select value={settings.font} onValueChange={(v) => update("font", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inter">Inter</SelectItem>
                  <SelectItem value="jakarta">Plus Jakarta Sans</SelectItem>
                  <SelectItem value="roboto">Roboto</SelectItem>
                  <SelectItem value="poppins">Poppins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Colors</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-9 w-9 rounded cursor-pointer border border-border" />
                  <Input value={settings.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="h-9 w-9 rounded cursor-pointer border border-border" />
                  <Input value={settings.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="flex-1 font-mono text-xs" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Presets</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((preset) => (
                  <button key={preset.name} onClick={() => applyPreset(preset)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border hover:bg-muted/50 transition-colors text-xs">
                    <div className="flex gap-0.5">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                    </div>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Preview */}
            <div>
              <Label className="text-xs mb-2 block flex items-center gap-1"><Eye className="h-3 w-3" /> Preview</Label>
              <div className="p-4 rounded-lg border border-border" style={{ background: `linear-gradient(135deg, ${settings.primaryColor}10, ${settings.accentColor}10)` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: settings.primaryColor }} />
                  <span className="text-sm font-semibold text-foreground">{settings.companyName}</span>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 px-3 rounded-md text-white text-xs flex items-center" style={{ backgroundColor: settings.primaryColor }}>Primary</div>
                  <div className="h-6 px-3 rounded-md text-white text-xs flex items-center" style={{ backgroundColor: settings.accentColor }}>Accent</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain */}
        <Card className="shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Domain & Display</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Custom Domain</Label>
              <Input value={settings.customDomain} onChange={(e) => update("customDomain", e.target.value)} placeholder="portal.yourcompany.com" />
              <p className="text-[10px] text-muted-foreground">Configure CNAME to point to our servers</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Dark Mode Default</p>
                <p className="text-xs text-muted-foreground">Set dark mode as the default theme</p>
              </div>
              <Switch checked={settings.darkModeDefault} onCheckedChange={(v) => update("darkModeDefault", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Welcome Banner</p>
                <p className="text-xs text-muted-foreground">Show personalized welcome on dashboard</p>
              </div>
              <Switch checked={settings.showWelcomeBanner} onCheckedChange={(v) => update("showWelcomeBanner", v)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sidebar Style</Label>
              <Select value={settings.sidebarStyle} onValueChange={(v) => update("sidebarStyle", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Width</SelectItem>
                  <SelectItem value="compact">Compact (Icons Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="shadow-card border-destructive/20">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold text-destructive">Reset Branding</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Reset all branding settings to their defaults. This cannot be undone.</p>
            <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => { setSettings(defaultSettings); setHasChanges(true); }}>
              Reset to Defaults
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
