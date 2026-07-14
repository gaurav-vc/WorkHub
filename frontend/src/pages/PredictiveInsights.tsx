import { useState, useEffect } from "react";
import {
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Users,
  Clock,
  Target,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { getInsightsStats } from "@/api/automation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const severityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-info/10 text-info border-info/20",
};

export default function PredictiveInsights() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const json = await getInsightsStats();
        setData(json);
      } catch (err) {
        console.error("Failed to load insights", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchInsights();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading predictive insights...</p>
      </div>
    );
  }

  if (!data) return <p>Failed to load data</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" /> Predictive Insights
        </h1>
        <p className="text-muted-foreground mt-1">AI-powered dashboards for resource forecasting and risk detection</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Team Utilization", value: data.teamUtilization || "0%", icon: <Users className="h-4 w-4" />, trend: "Live" },
          { label: "On-Time Delivery", value: data.onTimeDelivery || "0%", icon: <Target className="h-4 w-4" />, trend: "Live" },
          { label: "Avg Task Duration", value: data.avgTaskDuration || "0d", icon: <Clock className="h-4 w-4" />, trend: "Live" },
          { label: "Risk Items", value: data.risk_count?.toString() || "0", icon: <AlertTriangle className="h-4 w-4" />, trend: "Live" },
        ].map((stat, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                {stat.icon}
                <span className="text-xs">{stat.label}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground mb-1">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Forecasting */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Resource Utilization by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.resourceData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip cursor={{fill: 'transparent'}} />
                {data.departmentNames && data.departmentNames.map((dName: string, idx: number) => {
                  const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--success))"];
                  return (
                    <Bar key={dName} dataKey={dName} name={dName} fill={colors[idx % colors.length]} radius={[2, 2, 0, 0]} />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Completion Trend */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Task Completion: Planned vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.taskCompletionData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="planned" name="Planned" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Indicators */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Risk Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {(!data.riskIndicators || data.riskIndicators.length === 0) && (
               <p className="text-sm text-muted-foreground text-center mt-10">No active risks detected.</p>
            )}
            {data.riskIndicators && data.riskIndicators.map((risk: any) => (
              <div key={risk.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border">
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${risk.severity === "high" ? "text-destructive" : risk.severity === "medium" ? "text-warning" : "text-info"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{risk.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{risk.description}</p>
                  <div className="flex gap-2 mt-1.5">
                    <Badge variant="outline" className={`${severityColors[risk.severity] || severityColors.low} text-[10px]`}>{risk.severity}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{risk.department}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Headcount by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={data.pieData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {(data.pieData || []).map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {(data.pieData || []).map((d: any) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-foreground truncate" title={d.name}>{d.name}</span>
                    <span className="text-muted-foreground ml-auto">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
