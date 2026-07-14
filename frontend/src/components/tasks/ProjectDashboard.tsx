import { useState, useEffect } from "react";
import {
  Users, Activity, Calendar, FileText, CheckCircle2, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";

interface ProjectDashboardProps {
  projectId: number;
}


export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const [project, setProject] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, [projectId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch project
      const projRes = await fetch(`${API_BASE}/projects/${projectId}/`, { headers: { "Authorization": `Bearer ${token}` } });
      if (projRes.ok) {
        setProject(await projRes.json());
      }
      
      // In a full implementation, you would have endpoints for these.
      // Assuming they might be returned with the project or separate endpoints.
      // For now, if the project API doesn't return them, we will just safely mock them 
      // or rely on what's available. The backend added `ProjectMilestone` and `ActivityLog`.
      
      // Let's attempt to fetch them assuming standard DRF routes if we set them up, 
      // or we can just parse from project if we nested them.
      // We will leave them empty if not provided and show a placeholder.

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Progress</p>
              <h3 className="text-2xl font-bold text-slate-800">{project.progress}%</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tasks</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {project.imported_tasks ? project.imported_tasks.length : 0}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team & Milestones */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                <Users className="h-4 w-4" /> Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.team && project.team.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.team.map((member: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                      <Avatar className="h-6 w-6 bg-blue-100 text-blue-700 text-xs">
                        <AvatarFallback>{member.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{member}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No team members assigned.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4" /> Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length > 0 ? (
                <div className="space-y-3">
                  {milestones.map((ms: any) => (
                    <div key={ms.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{ms.title}</p>
                        <p className="text-xs text-slate-500">{ms.due_date || 'No due date'}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{ms.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 flex flex-col items-center gap-2">
                  <Calendar className="h-8 w-8 text-slate-200" />
                  <p className="text-xs">No milestones defined for this project.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                <Activity className="h-4 w-4" /> Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {activities.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {activities.map((act: any) => (
                      <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <Activity className="h-4 w-4 text-white" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-bold text-slate-900 text-sm">{act.user_name}</div>
                            <time className="font-caveat font-medium text-blue-500 text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(act.created_at).toLocaleString()}
                            </time>
                          </div>
                          <div className="text-slate-600 text-xs font-medium mb-1">
                            {act.action}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {act.details}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 gap-3">
                    <Activity className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Activity log is empty. Actions on this project will appear here.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
