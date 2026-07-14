import { useState, useMemo, useRef } from "react";
import {
  GanttChart,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTaskContext } from "@/context/TaskContext";

const totalDays = 30; // 30 day view
const dayLabels = Array.from({ length: totalDays }, (_, i) => `Day ${i + 1}`);

// Helper to convert date strings to day indices (0 to 29) relative to today
const getDayIndex = (dateString: string | undefined, defaultIndex: number): number => {
  if (!dateString) return defaultIndex;
  const target = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(totalDays - 1, diffDays + 15)); // Center around day 15
};

export default function Timeline() {
  const { tasks, updateTask, deleteTask } = useTaskContext();
  const [dragTask, setDragTask] = useState<{ id: string; startX: number; originalStart: number; dayShift: number } | null>(null);
  const dragDayShiftRef = useRef(0);

  // Map TaskContext tasks to Gantt format
  const ganttTasks = useMemo(() => {
    return tasks.map(t => {
      const startDay = getDayIndex(t.startDate, 5);
      const endDay = getDayIndex(t.dueDate, startDay + 3);
      const duration = Math.max(1, endDay - startDay);
      return {
        id: t.id,
        title: t.title,
        assignee: (t.assignees || [])[0] || { name: "Unassigned", initials: "??" },
        startDay,
        duration,
        color: t.priority === "P1" ? "bg-destructive" : t.priority === "P2" ? "bg-warning" : "bg-primary",
        dependency: (t.dependencies || [])[0],
        status: t.status,
      };
    });
  }, [tasks]);

  const statusColors: Record<string, string> = {
    "todo": "bg-muted text-muted-foreground",
    "in-progress": "bg-primary/10 text-primary",
    "done": "bg-success/10 text-success",
    "blocked": "bg-destructive/10 text-destructive",
  };

  const handleBarMouseDown = (e: React.MouseEvent, task: any) => {
    e.preventDefault();
    dragDayShiftRef.current = 0;
    setDragTask({ id: task.id, startX: e.clientX, originalStart: task.startDay, dayShift: 0 });
    
    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - e.clientX;
      const dayShift = Math.round(dx / 50);
      dragDayShiftRef.current = dayShift;
      setDragTask(prev => prev ? { ...prev, dayShift } : null);
    };
    
    const handleMouseUp = () => {
      const dayShift = dragDayShiftRef.current;
      if (dayShift !== 0) {
        const newStartDay = Math.max(0, Math.min(totalDays - task.duration, task.startDay + dayShift));
        
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);
        baseDate.setDate(baseDate.getDate() - 15);
        
        const newStartDate = new Date(baseDate);
        newStartDate.setDate(baseDate.getDate() + newStartDay);
        
        const newDueDate = new Date(newStartDate);
        newDueDate.setDate(newStartDate.getDate() + task.duration);
        
        const formatDate = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        updateTask(task.id, { 
          startDate: formatDate(newStartDate), 
          dueDate: formatDate(newDueDate) 
        });
      }
      setDragTask(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <GanttChart className="h-6 w-6 text-primary" /> Timeline / Gantt
          </h1>
          <p className="text-muted-foreground mt-1">Visualize project timelines with live data from TaskContext</p>
        </div>
      </div>

      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Day Headers */}
              <div className="flex border-b border-border">
                <div className="w-64 shrink-0 border-r border-border px-3 py-2 text-xs font-semibold text-muted-foreground">Task</div>
                <div className="flex-1 flex">
                  {dayLabels.map((d, i) => (
                    <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground py-2 border-r border-border">{d}</div>
                  ))}
                </div>
              </div>

              {/* Task Rows */}
              {ganttTasks.map((task) => (
                <div key={task.id} className="flex border-b border-border hover:bg-muted/30 transition-colors group">
                  <div className="w-64 shrink-0 border-r border-border px-3 py-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">{task.assignee.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                      <Badge variant="outline" className={`${statusColors[task.status] || statusColors["todo"]} text-[9px] mt-0.5`}>{task.status}</Badge>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => deleteTask(task.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="flex-1 relative" style={{ height: "40px" }}>
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {dayLabels.map((_, i) => (
                        <div key={i} className="flex-1 border-r border-border" />
                      ))}
                    </div>
                    {/* Task bar */}
                    <div
                      className={`absolute top-1.5 h-6 rounded-md ${task.color} cursor-grab active:cursor-grabbing transition-[left] flex items-center px-2`}
                      style={{
                        left: `${((dragTask?.id === task.id ? Math.max(0, Math.min(totalDays - task.duration, task.startDay + dragTask.dayShift)) : task.startDay) / totalDays) * 100}%`,
                        width: `${(task.duration / totalDays) * 100}%`,
                      }}
                      onMouseDown={(e) => handleBarMouseDown(e, task)}
                    >
                      <span className="text-[9px] text-white font-semibold truncate">{task.title}</span>
                    </div>
                    {/* Dependency arrow */}
                    {task.dependency && (() => {
                      const dep = ganttTasks.find((t) => t.id === task.dependency);
                      if (!dep) return null;
                      const depEnd = ((dep.startDay + dep.duration) / totalDays) * 100;
                      const taskStart = (task.startDay / totalDays) * 100;
                      if (depEnd > taskStart) return null;
                      return (
                        <div className="absolute top-4 h-0.5 bg-muted-foreground/30" style={{ left: `${depEnd}%`, width: `${taskStart - depEnd}%` }} />
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
