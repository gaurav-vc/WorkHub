import { useEffect, useState } from "react";
import {
  PartyPopper,
  Cake,
  Heart,
  Star,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";

interface Kudos {
  id: string;
  from: string;
  fromInitials: string;
  to: string;
  toInitials: string;
  message: string;
  category: string;
  reactions: number;
  time: string;
}

interface Birthday {
  id: string;
  name: string;
  initials: string;
  department: string;
  date: string;
  day: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "Team Player": <Heart className="h-4 w-4 text-destructive" />,
  "Innovation": <Star className="h-4 w-4 text-warning" />,
  "Above & Beyond": <PartyPopper className="h-4 w-4 text-primary" />,
  "Mentorship": <Heart className="h-4 w-4 text-accent" />,
};



export default function RecognitionBirthdays() {
  const { token, username } = useAuth();
  const [kudos, setKudos] = useState<Kudos[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ to: "", message: "", category: "Team Player" });

  const fetchData = async () => {
    try {
      const kRes = await fetch(`${API_BASE}/recognition/kudos/`, { headers: { Authorization: `Bearer ${token}` } });
      if (kRes.ok) {
        const kData = await kRes.json();
        const mappedKudos = kData.map((k: any) => ({
          id: k.id.toString(),
          from: k.fromName,
          fromInitials: k.fromInitials,
          to: k.toName,
          toInitials: k.toInitials,
          message: k.message,
          category: k.category,
          reactions: k.reactions,
          time: k.time
        }));
        setKudos(mappedKudos);
      }
      const bRes = await fetch(`${API_BASE}/recognition/birthdays/`, { headers: { Authorization: `Bearer ${token}` } });
      if (bRes.ok) {
        setBirthdays(await bRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const sendKudos = async () => {
    if (!form.to.trim() || !form.message.trim()) return;
    
    const payload = {
      fromName: username || "User",
      fromInitials: username ? username.substring(0, 2).toUpperCase() : "U",
      toName: form.to,
      toInitials: form.to.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      message: form.message,
      category: form.category
    };

    try {
      const res = await fetch(`${API_BASE}/recognition/kudos/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_name: payload.fromName,
          from_initials: payload.fromInitials,
          to_name: payload.toName,
          to_initials: payload.toInitials,
          message: payload.message,
          category: payload.category
        })
      });
      if (res.ok) {
        toast.success("Kudos sent!");
        setShowCreate(false);
        setForm({ to: "", message: "", category: "Team Player" });
        fetchData();
      } else {
        toast.error("Failed to send kudos");
      }
    } catch (err) {
      toast.error("Error occurred");
    }
  };

  const reactToKudos = async (id: string) => {
    const kudo = kudos.find(k => k.id === id);
    if (!kudo) return;
    try {
      const res = await fetch(`${API_BASE}/recognition/kudos/${id}/`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reactions: kudo.reactions + 1 })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {}
  };

  const deleteKudos = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/recognition/kudos/${id}/`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {}
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <PartyPopper className="h-6 w-6 text-primary" /> Recognition & Birthdays
          </h1>
          <p className="text-muted-foreground mt-1">Celebrate achievements and team birthdays</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => setShowCreate(true)}>
          <Send className="h-4 w-4" /> Send Kudos
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kudos Wall */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Recognition Wall</h2>
          {kudos.map((k) => (
            <Card key={k.id} className="shadow-card group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="text-sm font-semibold gradient-primary text-primary-foreground">{k.fromInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{k.from}</span>
                      <span className="text-xs text-muted-foreground">recognized</span>
                      <span className="text-sm font-semibold text-primary">{k.to}</span>
                      <Badge variant="outline" className="text-[10px] gap-1">{categoryIcons[k.category]} {k.category}</Badge>
                    </div>
                    <p className="text-sm text-foreground mt-2 leading-relaxed">{k.message}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Button size="sm" variant="ghost" className="text-xs gap-1 h-7" onClick={() => reactToKudos(k.id)}>
                        ❤️ {k.reactions}
                      </Button>
                      <span className="text-[11px] text-muted-foreground">{k.time}</span>
                      <Button size="sm" variant="ghost" className="text-xs h-7 opacity-0 group-hover:opacity-100 ml-auto text-destructive" onClick={() => deleteKudos(k.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Birthday Sidebar */}
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cake className="h-4 w-4 text-accent" /> March Birthdays
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {birthdays.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-semibold gradient-primary text-primary-foreground">{b.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.department}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{b.date}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Send Recognition</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">Recipient</Label><Input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="Who do you want to recognize?" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Team Player">Team Player</SelectItem>
                  <SelectItem value="Innovation">Innovation</SelectItem>
                  <SelectItem value="Above & Beyond">Above & Beyond</SelectItem>
                  <SelectItem value="Mentorship">Mentorship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What did they do that's awesome?" rows={3} /></div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button className="gradient-primary text-primary-foreground" onClick={sendKudos}>Send Kudos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
