import { useState, useEffect } from "react";
import { CheckSquare, CalendarDays, MessageSquare, Clock, ArrowRight, Users, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getMyDayDashboard, submitApprovalAction } from "@/api/tasks";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  P1: "bg-destructive/10 text-destructive border-destructive/20",
  P2: "bg-warning/10 text-warning border-warning/20",
  P3: "bg-info/10 text-info border-info/20",
  P4: "bg-muted text-muted-foreground border-border",
};

export default function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dashboardData = await getMyDayDashboard();
      setData(dashboardData);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while fetching dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { currentUser, summaryStats, todayTasks, upcomingMeetings, teamActivity, pendingApprovals, quickLinks } = data;

  const statCards = [
    { label: "Tasks Due Today", value: summaryStats.tasksDue, icon: CheckSquare, color: "text-primary", bg: "bg-primary/10" },
    { label: "Leave Balance", value: `${summaryStats.leaveBalance} days`, icon: CalendarDays, color: "text-success", bg: "bg-success/10" },
    { label: "Unread Messages", value: summaryStats.unreadMessages, icon: MessageSquare, color: "text-accent", bg: "bg-accent/10" },
    { label: "Pending Approvals", value: summaryStats.pendingApprovals, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  ];

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  
  const handleApprovalAction = async (id: string, action: 'approve' | 'decline') => {
    const rawId = id.toString().replace('hr_', '');
    try {
      await submitApprovalAction(rawId, action);
      toast.success(`Request ${action}d successfully`);
      fetchDashboardData();
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="rounded-xl gradient-primary p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {greeting}, {currentUser?.name?.split(" ")[0]}! <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="mt-1 text-primary-foreground/80 text-sm">{dateStr}</p>
          </div>
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI Assistant ready</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card border-0 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Tasks Today */}
        <Card className="lg:col-span-2 shadow-card border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                My Tasks Today
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks?.length > 0 ? todayTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-secondary/50 transition-colors group"
              >
                <div className="h-4 w-4 rounded border-2 border-muted-foreground/30 group-hover:border-primary transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.project || 'General'} {task.dueTime ? `· ${task.dueTime}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority] || priorityColors.P3}`}>
                    {task.priority || 'P3'}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${task.status === 'done' ? 'bg-success/10 text-success border-success/20' : task.status === 'in-progress' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                    {task.status === 'in-progress' ? 'In Progress' : task.status === 'done' ? 'Done' : task.status === 'blocked' ? 'Blocked' : 'To Do'}
                  </Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No pending tasks for today.</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings?.length > 0 ? upcomingMeetings.map((meeting: any) => (
              <div key={meeting.id} className="rounded-lg bg-secondary/50 p-3 space-y-1.5">
                <p className="text-sm font-medium">{meeting.title}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(meeting.meeting_time || meeting.time).toLocaleString([], {hour: '2-digit', minute:'2-digit'})} · {meeting.duration}</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {meeting.attendees?.length || meeting.attendees || 0}
                  </span>
                </div>
                {meeting.type === "recurring" && (
                  <Badge variant="secondary" className="text-[10px]">Recurring</Badge>
                )}
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
            )}
          </CardContent>
        </Card>

        {/* Team Activity */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamActivity?.length > 0 ? teamActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                    {activity.user_name?.[0] || activity.initials || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_name || activity.user}</span>{" "}
                    <span className="text-muted-foreground">{activity.action}</span>{" "}
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(activity.created_at || activity.time).toLocaleTimeString()}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovals?.length > 0 ? pendingApprovals.map((approval: any) => (
              <div key={approval.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{approval.approval_type || approval.type}</Badge>
                  <span className="text-xs text-muted-foreground">{approval.requester_name || approval.requester}</span>
                </div>
                <p className="text-sm">{approval.details || approval.detail}</p>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handleApprovalAction(approval.id, 'approve')}>Approve</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => handleApprovalAction(approval.id, 'decline')}>Decline</Button>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No pending approvals.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            {quickLinks?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link: any) => (
                  <Button
                    key={link.id || link.label}
                    variant="outline"
                    className="h-auto flex-col gap-1.5 py-4 text-xs font-medium hover:bg-primary/5 hover:border-primary/20 transition-colors"
                    onClick={() => link.url && (window.location.href = link.url)}
                  >
                    {link.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No quick links configured.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
