import { useState, useMemo, useEffect } from "react";
import {
  Users, BarChart3, AlertTriangle, Calendar, Clock, ChevronLeft, ChevronRight, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTaskContext } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";

export default function ResourcePlanning() {
  const { token } = useAuth();
  const { tasks } = useTaskContext();
  const [view, setView] = useState("dashboard");
  const [filter, setFilter] = useState<"all" | "optimal" | "overloaded">("all");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/calendar/events/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
            const fetched = data.results || data;
            if (Array.isArray(fetched)) setEvents(fetched);
        }).catch(console.error);

      fetch(`${API_BASE}/auth/employees/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          // ensure it matches teamMembers interface if needed or map fields
          const members = (data.results || data).map((m: any) => {
            const memberName = m.full_name || m.username || m.name || "Unknown";
            return {
              ...m,
              name: memberName,
              initials: m.initials || memberName.substring(0, 2).toUpperCase(),
              capacity: m.capacity || 8,
              capacityUnit: m.capacityUnit || "hours/day"
            };
          });
          setTeamMembers(members);
        })
        .catch(console.error);
    }
  }, [token]);

  const resourceData = useMemo(() => {
    return teamMembers.map(member => {
      const assignedTasks = tasks.filter(t =>
        t.assignees.some(a => (a.id === member.id || a.initials === member.initials)) && t.status !== "done"
      );
      const totalEffortHours = assignedTasks.reduce((sum, t) => {
        const hours = t.effortUnit === "days" ? t.estimatedEffort * 8 : t.estimatedEffort;
        return sum + hours;
      }, 0);
      const weeklyCapacity = member.capacityUnit === "hours/day" ? member.capacity * 5 : member.capacity;
      const utilization = weeklyCapacity > 0 ? Math.min(Math.round((totalEffortHours / weeklyCapacity) * 100), 150) : 0;
      const status: "underutilized" | "optimal" | "overloaded" =
        utilization < 50 ? "underutilized" : utilization <= 100 ? "optimal" : "overloaded";

      return { ...member, assignedTasks, totalEffortHours, weeklyCapacity, utilization, status };
    });
  }, [tasks, teamMembers]);

  const filteredResourceData = useMemo(() => {
    if (filter === "all") return resourceData;
    return resourceData.filter(r => r.status === filter);
  }, [resourceData, filter]);

  const conflicts = useMemo(() => {
    const results: Array<{ resource: string; initials: string; tasks: string[]; message: string }> = [];
    resourceData.forEach(r => {
      if (r.status === "overloaded") {
        results.push({
          resource: r.name, initials: r.initials,
          tasks: r.assignedTasks.map(t => t.title),
          message: `${r.name} is at ${r.utilization}% capacity — overallocated by ${r.totalEffortHours - r.weeklyCapacity}h this week`,
        });
      }
      // Check overlapping urgent tasks
      const urgentTasks = r.assignedTasks.filter(t => t.isUrgent);
      if (urgentTasks.length > 1) {
        results.push({
          resource: r.name, initials: r.initials,
          tasks: urgentTasks.map(t => t.title),
          message: `${r.name} has ${urgentTasks.length} urgent tasks assigned simultaneously`,
        });
      }
    });
    return results;
  }, [resourceData]);

  const statusColors = {
    underutilized: "text-info bg-info/10",
    optimal: "text-success bg-success/10",
    overloaded: "text-destructive bg-destructive/10",
  };

  // Get this week's Mon-Fri dates
  const weekDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []);

  const formattedDays = weekDates.map(d => `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-7 w-7 text-primary" />
          </div>
          Resource Planning & Workload
        </h1>
        <p className="text-muted-foreground text-sm md:ml-14">Track team workload, capacity constraints, and resolve resource conflicts dynamically.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`shadow-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary group ${filter === "all" && view !== "conflicts" ? "ring-2 ring-primary ring-offset-1" : ""}`} onClick={() => { setView("dashboard"); setFilter("all"); }}>
          <CardContent className="p-4 text-center flex flex-col items-center justify-center">
            <p className="text-3xl font-display font-bold text-foreground group-hover:scale-110 transition-transform">{teamMembers.length}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Team Members</p>
          </CardContent>
        </Card>
        <Card className={`shadow-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-success group ${filter === "optimal" && view !== "conflicts" ? "ring-2 ring-success ring-offset-1" : ""}`} onClick={() => { setView("dashboard"); setFilter("optimal"); }}>
          <CardContent className="p-4 text-center flex flex-col items-center justify-center">
            <p className="text-3xl font-display font-bold text-success group-hover:scale-110 transition-transform">{resourceData.filter(r => r.status === "optimal").length}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Optimal Load</p>
          </CardContent>
        </Card>
        <Card className={`shadow-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-destructive group ${filter === "overloaded" && view !== "conflicts" ? "ring-2 ring-destructive ring-offset-1" : ""}`} onClick={() => { setView("dashboard"); setFilter("overloaded"); }}>
          <CardContent className="p-4 text-center flex flex-col items-center justify-center">
            <p className="text-3xl font-display font-bold text-destructive group-hover:scale-110 transition-transform">{resourceData.filter(r => r.status === "overloaded").length}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Overloaded</p>
          </CardContent>
        </Card>
        <Card className={`shadow-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-warning group ${view === "conflicts" ? "ring-2 ring-warning ring-offset-1" : ""}`} onClick={() => { setView("conflicts"); }}>
          <CardContent className="p-4 text-center flex flex-col items-center justify-center">
            <p className="text-3xl font-display font-bold text-warning group-hover:scale-110 transition-transform">{conflicts.length}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Conflicts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="dashboard">Workload Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Capacity Calendar</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        {/* Workload Dashboard */}
        <TabsContent value="dashboard" className="mt-4 space-y-3">
          {filteredResourceData.length === 0 && (
            <div className="p-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              No resources match this filter.
            </div>
          )}
          {filteredResourceData.map(r => (
            <Card key={r.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{r.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.role} · {r.department}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${statusColors[r.status]} text-[10px] capitalize`}>{r.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="flex-1">
                        <Progress value={Math.min(r.utilization, 100)} className={`h-2 ${r.status === "overloaded" ? "[&>div]:bg-destructive" : r.status === "optimal" ? "[&>div]:bg-success" : "[&>div]:bg-info"}`} />
                      </div>
                      <span className="text-xs font-semibold w-12 text-right">{r.utilization}%</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{r.assignedTasks.length} tasks</span>
                      <span>{r.totalEffortHours}h assigned</span>
                      <span>{r.weeklyCapacity}h/week capacity</span>
                    </div>
                  </div>
                </div>
                {/* Assigned tasks list */}
                {r.assignedTasks.length > 0 && (
                  <Accordion type="single" collapsible className="mt-3 border-t">
                    <AccordionItem value="tasks" className="border-none">
                      <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline text-muted-foreground hover:text-foreground">
                        View Assigned Tasks ({r.assignedTasks.length})
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 pb-2">
                        {r.assignedTasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-xs">
                            <div className={`h-1.5 w-1.5 rounded-full ${t.isUrgent ? "bg-destructive" : "bg-primary"}`} />
                            <span className="flex-1 truncate">{t.title}</span>
                            <Badge variant="outline" className="text-[9px]">{t.priority}</Badge>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Capacity Calendar */}
        <TabsContent value="calendar" className="mt-4">
          <Card className="shadow-card overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="flex border-b">
                    <div className="w-48 shrink-0 border-r px-3 py-2 text-xs font-semibold text-muted-foreground">Resource</div>
                    {formattedDays.map(d => (
                      <div key={d} className="flex-1 text-center text-xs font-semibold text-muted-foreground py-2 border-r">{d}</div>
                    ))}
                  </div>
                  {filteredResourceData.map(r => (
                    <div key={r.id} className="flex border-b hover:bg-muted/30">
                      <div className="w-48 shrink-0 border-r px-3 py-2 flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] bg-primary/10 text-primary">{r.initials}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.capacity}h/day</p>
                        </div>
                      </div>
                      {weekDates.map((dayDate, di) => {
                        const dailyTasks = r.assignedTasks.filter(t => {
                          let start = t.startDate ? new Date(t.startDate) : new Date();
                          let end = t.dueDate ? new Date(t.dueDate) : new Date();
                          start.setHours(0,0,0,0);
                          end.setHours(23,59,59,999);
                          return dayDate >= start && dayDate <= end;
                        });
                        
                        const getTaskDailyHours = (t: any) => {
                          let start = t.startDate ? new Date(t.startDate) : new Date();
                          let end = t.dueDate ? new Date(t.dueDate) : new Date();
                          start.setHours(0,0,0,0);
                          end.setHours(0,0,0,0);
                          const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                          const totalHours = t.effortUnit === "days" ? t.estimatedEffort * 8 : t.estimatedEffort;
                          return totalHours / totalDays;
                        };
                        
                        const dailyHours = dailyTasks.reduce((s, t) => s + getTaskDailyHours(t), 0);
                        const dailyUtil = r.capacity > 0 ? Math.round((dailyHours / r.capacity) * 100) : 0;
                        const dailyMeetings = events.filter(e => {
                          const evStart = e.start_time ? new Date(e.start_time) : null;
                          if (!evStart) return false;
                          const isSameDay = evStart.getFullYear() === dayDate.getFullYear() && evStart.getMonth() === dayDate.getMonth() && evStart.getDate() === dayDate.getDate();
                          const isAttending = Array.isArray(e.attendees) && e.attendees.some((a: any) => a.initials === r.initials || a.name === r.name);
                          return isSameDay && isAttending;
                        });

                        return (
                          <div key={di} className="flex-1 border-r p-1.5 relative group transition-colors hover:bg-muted/10">
                            {dailyTasks.map(t => (
                              <div key={t.id} className={`text-[9px] px-1.5 py-1 rounded mb-1 truncate border shadow-sm ${t.isUrgent ? "bg-destructive/10 text-destructive border-destructive/20 font-semibold" : "bg-primary/5 text-primary border-primary/20"}`} title={t.title}>
                                📝 {t.title}
                              </div>
                            ))}
                            {dailyMeetings.map(m => {
                              const timeStr = m.start_time ? new Date(m.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                              return (
                                <div key={`m-${m.id}`} className="text-[9px] px-1.5 py-1 rounded mb-1 truncate border shadow-sm bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" title={m.title}>
                                  🗓️ {timeStr} {m.title}
                                </div>
                              );
                            })}
                            {dailyTasks.length === 0 && dailyMeetings.length === 0 && <div className="text-[9px] text-muted-foreground/40 text-center py-3 select-none">—</div>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts */}
        <TabsContent value="conflicts" className="mt-4 space-y-3">
          {conflicts.length === 0 ? (
            <Card className="shadow-card border-success/20">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-success" />
                </div>
                <p className="text-lg font-semibold text-foreground">No conflicts detected</p>
                <p className="text-sm text-muted-foreground mt-1">All resources are operating within healthy capacity limits.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card border-destructive/20 overflow-hidden">
              <Accordion type="single" collapsible className="w-full">
                {conflicts.map((c, i) => (
                  <AccordionItem value={`conflict-${i}`} key={i} className="border-b last:border-b-0 border-destructive/10">
                    <AccordionTrigger className="hover:no-underline px-6 py-4 hover:bg-destructive/5 transition-colors">
                      <div className="flex items-center gap-4 text-left">
                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-destructive">Conflict for {c.resource}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{c.message}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2 bg-destructive/5 border-t border-destructive/10">
                      <div className="pl-14">
                        <p className="text-sm font-semibold mb-3 text-foreground">Involved Tasks & Priorities:</p>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {c.tasks.map((t, ti) => (
                            <Badge key={ti} variant="secondary" className="px-2 py-1 text-xs bg-background border-destructive/20 shadow-sm">{t}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" size="sm" className="h-9">Reassign Tasks</Button>
                          <Button variant="outline" size="sm" className="h-9">Adjust Deadlines</Button>
                          <Button variant="ghost" size="sm" className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive">Acknowledge</Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
