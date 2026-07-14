import { useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Video,
  MapPin,
  RotateCcw,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: string;
  type: "meeting" | "task" | "reminder" | "block" | "event";
  attendees?: Array<{ name: string; initials: string }>;
  location?: string;
  recurring?: boolean;
  color: string;
  start_time?: string;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

export default function CalendarMeetings() {
  const { token } = useAuth();
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});

  // Dialog state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [attendeeInput, setAttendeeInput] = useState("");
  const [employees, setEmployees] = useState<{ id: number, name: string, email: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    type: "meeting",
    date: "",
    startTime: "10:00",
    endTime: "11:00",
    description: "",
    platform: "Zoom",
    meetingLink: "",
    recurring: false,
    recurrence_type: "daily",
    recurrence_end_date: "",
    internal_attendees: [] as number[],
    attendees: [] as string[]
  });

  const fetchEvents = () => {
    if (token) {
      fetch(`${API_BASE}/calendar/events/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error("Failed to fetch events");
          return r.json();
        })
        .then(data => {
          const fetchedEvents = data.results || data;
          const grouped: Record<string, CalendarEvent[]> = {};

          if (Array.isArray(fetchedEvents)) {
            fetchedEvents.forEach((ev: any) => {
              const d = ev.start_time ? new Date(ev.start_time) : new Date();
              const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; // proper date grouping

              if (!grouped[dateKey]) grouped[dateKey] = [];
              grouped[dateKey].push({
                id: ev.id?.toString() || `e${Math.random()}`,
                title: ev.title || "Untitled",
                time: ev.start_time ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "10:00 AM",
                duration: ev.duration || "1h",
                type: ev.type || "meeting",
                attendees: ev.attendees || [],
                location: ev.location,
                recurring: ev.recurring,
                color: ev.color || "bg-primary",
                start_time: ev.start_time
              });
            });
          }
          setEvents(grouped);
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to load events");
        });
    }
  };

  useEffect(() => {
    fetchEvents();
    if (token) {
      fetch(`${API_BASE}/calendar/employees/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error("Failed to fetch employees");
          return r.json();
        })
        .then(data => setEmployees(data))
        .catch(err => {
          console.error(err);
          toast.error("Failed to load employees");
        });
    }
  }, [token]);

  const handleAddEvent = async () => {
    if (!form.title.trim()) {
      toast.error("Topic is required");
      return;
    }

    const startD = form.date ? new Date(form.date) : (selectedDate || new Date());
    if (form.startTime) {
      const [h, m] = form.startTime.split(':');
      startD.setHours(parseInt(h, 10));
      startD.setMinutes(parseInt(m, 10));
      startD.setSeconds(0);
    }

    const colorMap: any = {
      meeting: "bg-primary",
      task: "bg-warning",
      event: "bg-info",
      reminder: "bg-accent"
    };

    const payload = {
      title: form.title,
      type: form.type,
      start_time: startD.toISOString(),
      duration: `${form.startTime} - ${form.endTime}`,
      location: form.meetingLink || "TBD",
      color: colorMap[form.type] || "bg-primary",
      description: form.description,
      platform: form.platform,
      meeting_link: form.meetingLink,
      recurring: form.recurring,
      recurrence_type: form.recurring ? form.recurrence_type : "none",
      recurrence_end_date: form.recurring ? form.recurrence_end_date : null,
      internal_attendee_ids: form.internal_attendees,
      external_emails: form.attendees.join(","),
      attendees: form.attendees.map(email => ({ name: email, initials: email.substring(0, 2).toUpperCase() }))
    };

    try {
      const res = await fetch(`${API_BASE}/calendar/events/create/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(`${form.type.charAt(0).toUpperCase() + form.type.slice(1)} created successfully`);
        setShowAddEvent(false);
        setForm({ title: "", type: "meeting", date: "", startTime: "10:00", endTime: "11:00", description: "", platform: "Zoom", meetingLink: "", recurring: false, recurrence_type: "daily", recurrence_end_date: "", internal_attendees: [], attendees: [] });
        fetchEvents();
      } else {
        toast.error(`Failed to create ${form.type}`);
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const openAddEvent = (date: Date) => {
    setSelectedDate(date);
    // Format date as yyyy-mm-dd in local timezone instead of UTC
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    setForm({ ...form, type: "meeting", date: dateStr, startTime: "10:00", endTime: "11:00" });
    setShowAddEvent(true);
  };

  const handleAddAttendee = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && attendeeInput.trim()) {
      e.preventDefault();
      if (!form.attendees.includes(attendeeInput.trim())) {
        setForm({ ...form, attendees: [...form.attendees, attendeeInput.trim()] });
      }
      setAttendeeInput("");
    }
  };

  const removeAttendee = (email: string) => {
    setForm({ ...form, attendees: form.attendees.filter(a => a !== email) });
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayDate = today.getDate();

  // Week view: generate 7 days starting from Sunday of current week
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  // Month view
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const getEventStyles = (colorStr: string) => {
    if (!colorStr) return "bg-muted text-foreground";
    if (colorStr.includes('primary')) return "bg-primary/15 text-primary";
    if (colorStr.includes('warning')) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    if (colorStr.includes('info')) return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
    if (colorStr.includes('accent')) return "bg-purple-500/15 text-purple-700 dark:text-purple-400";
    return "bg-muted text-foreground";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Calendar
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">{monthName}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs h-6 px-2">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs h-6 px-2">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs h-6 px-2">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Changed Add Event button to just the + icon */}
          <Button size="icon" className="gradient-primary text-primary-foreground h-8 w-8 rounded-full" onClick={() => openAddEvent(new Date())}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <Card className="shadow-sm border-border overflow-hidden bg-card">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 text-center border-b border-border bg-muted/30">
              {weekDays.map((d) => (
                <div key={d} className="py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 text-left">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`e-${i}`} className="min-h-[110px] border-b border-r border-border bg-muted/10" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === todayDate && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
                const dayEvents = events[dateKey] || [];
                return (
                  <div
                    key={day}
                    onClick={() => openAddEvent(cellDate)}
                    className="min-h-[110px] border-b border-r border-border p-1.5 hover:bg-muted/30 transition-colors cursor-pointer group flex flex-col group"
                  >
                    <div className="flex justify-end w-full mb-1">
                      <span className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-all font-medium", 
                        isToday ? "bg-primary text-primary-foreground shadow-sm font-bold" : "text-muted-foreground group-hover:bg-muted"
                      )}>{day}</span>
                    </div>
                    <div className="space-y-1 w-full flex-1 overflow-y-auto custom-scrollbar pr-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div 
                          key={ev.id} 
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }} 
                          className={cn("text-[10px] px-2 py-1 rounded-md truncate text-left shadow-sm hover:shadow-md transition-shadow cursor-pointer font-medium leading-tight flex flex-col gap-0.5", getEventStyles(ev.color))}
                        >
                          <span className="truncate">{ev.title}</span>
                          <span className="text-[9px] opacity-80 font-normal">{ev.time}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground text-center font-medium py-0.5 hover:text-foreground transition-colors bg-muted rounded-md">+{dayEvents.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {view === "week" && (
        <Card className="shadow-sm border-border overflow-hidden bg-card">
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30">
              <div className="border-r border-border" />
              {weekDates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <div key={i} onClick={() => openAddEvent(d)} className={cn("text-center py-2.5 border-r border-border cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center", isToday && "bg-primary/5")}>
                    <div className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1", isToday ? "text-primary" : "text-muted-foreground")}>{weekDays[i]}</div>
                    <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium transition-colors", isToday ? "bg-primary text-primary-foreground shadow-md" : "text-foreground bg-muted")}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            {/* Time grid */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-auto custom-scrollbar bg-muted/10">
              {hours.map((hour) => (
                <div key={hour} className="contents group/row">
                  <div className="h-16 border-r border-b border-border flex items-start justify-end pr-2.5 pt-1.5 bg-card">
                    <span className="text-[10px] font-medium text-muted-foreground tracking-wide">{hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}</span>
                  </div>
                  {weekDates.map((d, di) => {
                    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                    const dayEvents = events[dayKey] || [];
                    const hourEvents = dayEvents.filter((ev) => {
                      const h = parseInt(ev.time);
                      const isPM = ev.time.includes("PM");
                      const eventHour = isPM && h !== 12 ? h + 12 : (h === 12 && !isPM ? 0 : h);
                      return eventHour === hour;
                    });

                    const cellDate = new Date(d);
                    cellDate.setHours(hour);
                    cellDate.setMinutes(0);

                    return (
                      <div key={`${hour}-${di}`} onClick={() => { setForm({ ...form, startTime: `${hour.toString().padStart(2, '0')}:00` }); openAddEvent(cellDate); }} className="h-16 border-r border-b border-border relative p-0.5 hover:bg-muted/30 cursor-pointer transition-colors bg-card/50">
                        {hourEvents.map((ev) => (
                          <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }} className={cn("text-[10px] px-2 py-1 rounded-md leading-tight absolute inset-x-0.5 shadow-sm hover:shadow-md transition-all z-10 cursor-pointer flex flex-col justify-center", getEventStyles(ev.color))}>
                            <p className="font-semibold truncate">{ev.title}</p>
                            <p className="opacity-80 text-[9px]">{ev.time}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {view === "day" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-border overflow-hidden bg-card">
              <CardHeader className="border-b border-border bg-muted/30 py-4">
                <CardTitle className="text-sm font-semibold flex justify-between items-center text-foreground">
                  <span className="text-primary">{currentDate.toLocaleDateString("en-US", { weekday: "long" })}</span>
                  <span className="text-muted-foreground">{currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-auto custom-scrollbar bg-muted/5">
                  {hours.map((hour) => {
                    const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
                    const dayEvents = events[dateKey] || [];
                    const hourEvents = dayEvents.filter((ev) => {
                      const h = parseInt(ev.time);
                      const isPM = ev.time.includes("PM");
                      const eventHour = isPM && h !== 12 ? h + 12 : (h === 12 && !isPM ? 0 : h);
                      return eventHour === hour;
                    });

                    const cellDate = new Date(currentDate);
                    cellDate.setHours(hour);
                    cellDate.setMinutes(0);

                    return (
                      <div key={hour} onClick={() => { setForm({ ...form, startTime: `${hour.toString().padStart(2, '0')}:00` }); openAddEvent(cellDate); }} className="grid grid-cols-[80px_1fr] border-b border-border min-h-[80px] hover:bg-muted/30 transition-colors cursor-pointer group">
                        <div className="border-r border-border p-3 text-right bg-card">
                          <span className="text-[11px] font-medium text-muted-foreground">{hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}</span>
                        </div>
                        <div className="relative p-2 bg-card/50">
                          {hourEvents.map((ev, i) => (
                            <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }} className={cn("text-xs p-2 rounded-md shadow-sm hover:shadow-md transition-all cursor-pointer mb-1 w-full sm:w-[80%] flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-border/50", getEventStyles(ev.color))} style={{ marginTop: i > 0 ? '4px' : '0' }}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold">{ev.title}</span>
                                <span className="text-[10px] opacity-80 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {ev.time} - {ev.duration}</span>
                              </div>
                              {ev.attendees && ev.attendees.length > 0 && (
                                <div className="flex -space-x-1.5 hidden sm:flex">
                                  {ev.attendees.slice(0, 3).map((att, i) => (
                                    <Avatar key={i} className="h-5 w-5 border-2 border-background ring-1 ring-border/20">
                                      <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-medium">{att.initials}</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Day sidebar */}
          <div className="space-y-4">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Video className="h-4 w-4 text-accent" /> Today's Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(events[`${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`] || []).map((m) => (
                  <div key={m.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(m); }} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className={`h-8 w-1 rounded-full ${m.color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.time} · {m.duration}</p>
                    </div>
                    {m.type === "meeting" && <Button size="sm" variant="outline" className="text-xs h-7 shrink-0">Join</Button>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add Event Toggle/Dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-border bg-card shadow-2xl">
          {/* Header Segmented Control */}
          <div className="pt-6 pb-2 px-6 flex justify-between items-center bg-muted/50 border-b border-border">
            <div className="w-full flex justify-center mt-2">
              <div className="bg-muted p-1 rounded-full flex items-center shadow-inner w-[320px] border border-border">
                {(["Task", "Event", "Meeting"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, type: t.toLowerCase() as any })}
                    className={cn(
                      "flex-1 py-1.5 text-sm font-semibold rounded-full transition-all text-center",
                      form.type === t.toLowerCase()
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="px-6 py-4 space-y-4 text-foreground">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs font-bold tracking-wide capitalize">{form.type} Topic</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-muted text-foreground border-0 h-9 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs font-bold tracking-wide">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="bg-muted text-foreground border-0 h-9 rounded-md dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs font-bold tracking-wide capitalize">{form.type} Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-muted text-foreground border-0 h-9 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs font-bold tracking-wide">Time</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value, endTime: `${(parseInt(e.target.value.split(':')[0]) + 1).toString().padStart(2, '0')}:${e.target.value.split(':')[1]}` })}
                    className="bg-muted text-foreground border-0 h-9 rounded-md px-2 dark:[color-scheme:dark] w-full"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="bg-muted text-foreground border-0 h-9 rounded-md px-2 dark:[color-scheme:dark] w-full"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <Label className="text-muted-foreground text-xs font-bold tracking-wide">Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger className="bg-muted text-foreground border-0 h-9 rounded-md">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zoom">Zoom</SelectItem>
                    <SelectItem value="Google Meet">Google Meet</SelectItem>
                    <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                    <SelectItem value="Webex">Webex</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 relative">
                <Label className="text-muted-foreground text-xs font-bold tracking-wide capitalize">{form.type} Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={form.meetingLink}
                    onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                    className="bg-muted text-foreground border-0 h-9 rounded-md flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-primary hover:text-primary/80"
                    onClick={() => {
                      let base = "";
                      if (form.platform === "Zoom") base = "https://zoom.us/j/";
                      else if (form.platform === "Google Meet") base = "https://meet.google.com/";
                      else if (form.platform === "Microsoft Teams") base = "https://teams.microsoft.com/l/meetup-join/";
                      else base = "https://example.com/meet/";
                      setForm({ ...form, meetingLink: base + Math.floor(Math.random() * 1000000000) })
                    }}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs font-bold tracking-wide">Internal Employees</Label>
              <Select
                onValueChange={(v) => {
                  const id = parseInt(v);
                  if (!form.internal_attendees.includes(id)) {
                    setForm({ ...form, internal_attendees: [...form.internal_attendees, id] });
                  }
                }}
              >
                <SelectTrigger className="bg-muted text-foreground border-0 h-9 rounded-md">
                  <SelectValue placeholder="Add internal employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.internal_attendees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.internal_attendees.map(id => {
                    const emp = employees.find(e => e.id === id);
                    return emp ? (
                      <Badge key={id} variant="secondary" className="bg-muted text-foreground border-0 text-xs gap-1">
                        {emp.name}
                        <button onClick={() => setForm({ ...form, internal_attendees: form.internal_attendees.filter(i => i !== id) })} className="text-muted-foreground hover:text-foreground ml-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {form.type === "event" && (
              <>
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-muted-foreground text-xs font-bold tracking-wide">Add Other Emails</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={attendeeInput}
                        onChange={(e) => setAttendeeInput(e.target.value)}
                        onKeyDown={handleAddAttendee}
                        className="bg-muted text-foreground border-0 h-9 rounded-md flex-1"
                      />
                      <button onClick={() => handleAddAttendee({ key: 'Enter', preventDefault: () => { } } as any)} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </button>
                    </div>
                  </div>
                  <div className="col-span-1 space-y-1 flex flex-col items-start bg-muted p-2 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <Switch
                        checked={form.recurring}
                        onCheckedChange={(c) => setForm({ ...form, recurring: c })}
                      />
                      <Label className="text-muted-foreground text-xs font-bold tracking-wide">Recurring</Label>
                    </div>
                    {form.recurring && (
                      <div className="w-full space-y-2 mt-1">
                        <Select value={form.recurrence_type} onValueChange={(v) => setForm({ ...form, recurrence_type: v })}>
                          <SelectTrigger className="bg-background text-foreground border-0 h-7 text-xs rounded">
                            <SelectValue placeholder="Daily" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={form.recurrence_end_date}
                          onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })}
                          className="bg-background text-foreground border-0 h-7 text-xs rounded dark:[color-scheme:dark]"
                          placeholder="End Date"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {form.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.attendees.map(email => (
                      <Badge key={email} variant="secondary" className="bg-muted text-foreground border-0 text-xs gap-1">
                        {email}
                        <button onClick={() => removeAttendee(email)} className="text-muted-foreground hover:text-foreground ml-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}

            <Button
              onClick={handleAddEvent}
              className="w-full mt-6 gradient-primary text-primary-foreground font-semibold h-10 shadow-md transition-colors"
            >
              Create {form.type.charAt(0).toUpperCase() + form.type.slice(1)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-3 w-3 rounded-full ${selectedEvent?.color}`} />
              <Badge variant="outline" className="capitalize text-xs">{selectedEvent?.type}</Badge>
            </div>
            <DialogTitle className="text-xl">{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>{selectedEvent?.time} · {selectedEvent?.duration}</span>
            </div>
            {selectedEvent?.location && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {selectedEvent.location.startsWith('http') ? (
                  <a href={selectedEvent.location} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                    {selectedEvent.location}
                  </a>
                ) : (
                  <span>{selectedEvent.location}</span>
                )}
              </div>
            )}
            {selectedEvent?.recurring && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <RotateCcw className="h-4 w-4 text-primary" />
                <span>Recurring Event</span>
              </div>
            )}
            
            {selectedEvent?.attendees && selectedEvent.attendees.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-border">
                <p className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Attendees ({selectedEvent.attendees.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.attendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-1">
                      <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-primary/20 text-primary">{a.initials}</AvatarFallback></Avatar>
                      <span className="text-xs">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>Close</Button>
            {selectedEvent?.type === "meeting" && selectedEvent?.location?.startsWith('http') && (
              <Button onClick={() => window.open(selectedEvent.location, "_blank")}>Join Meeting</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
