import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Users,
  MessageSquare,
  FileText,
  BookOpen,
  Kanban,
  ClipboardList,
  UserCircle,
  Award,
  Shield,
  Bot,
  Workflow,
  BarChart3,
  Settings,
  Palette,
  Plug,
  ChevronLeft,
  Sparkles,
  Clock,
  Activity,
  CheckCircle,
  GraduationCap
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { PortalType } from "@/lib/auth-utils";

const getNavGroups = (portalType: PortalType) => {
  if (portalType === 'super_user') {
    return [
      {
        label: "Super Admin",
        items: [
          { title: "Dashboard", url: "/superadmin", icon: LayoutDashboard },
          { title: "Organizations", url: "/admin/organizations", icon: Kanban },
          { title: "Sites", url: "/admin/sites", icon: Plug },
          { title: "Billing", url: "/admin/billing", icon: FileText }
        ],
      }
    ];
  }

  const employeeGroups = [
    {
      label: "My Work",
      items: [
        { title: "Dashboard", url: "/", icon: LayoutDashboard },
        { title: "My Day", url: "/tasks/my-day", icon: CheckSquare },
        { title: "Calendar", url: "/tasks/calendar", icon: CalendarDays },
        { title: "Projects", url: "/tasks/projects", icon: Kanban },
        { title: "Timeline", url: "/tasks/timeline", icon: BarChart3 },
        { title: "Resources", url: "/tasks/resources", icon: Users },
        { title: "Templates", url: "/tasks/templates", icon: ClipboardList },
        { title: "MOM", url: "/collaboration/moms", icon: FileText },
      ],
    },
    {
      label: "Collaboration",
      items: [
        { title: "Team Chat", url: "/collaboration/chat", icon: MessageSquare },
        { title: "Docs & Notes", url: "/collaboration/docs", icon: FileText },
        { title: "Knowledge Base", url: "/collaboration/wiki", icon: BookOpen },
        { title: "My Boards", url: "/collaboration/boards", icon: Kanban },
        { title: "Learning Center", url: "/learning", icon: GraduationCap },
      ],
    },
    {
      label: "HR Services",
      items: [
        { title: "HR Requests", url: "/hr/requests", icon: ClipboardList },
        { title: "Directory", url: "/hr/directory", icon: UserCircle },
        { title: "Recognition", url: "/hr/recognition", icon: Award },
        { title: "Policies", url: "/hr/policies", icon: Shield },
        { title: "Attendance", url: "/hr/attendance", icon: Clock },
        { title: "Company Pulse", url: "/hr/company-pulse", icon: Activity },
      ],
    },
    {
      label: "AI & Automation",
      items: [
        { title: "Workflows", url: "/ai/workflows", icon: Workflow },
        { title: "Insights", url: "/ai/insights", icon: BarChart3 },
        { title: "AI Agents", url: "/ai/agents", icon: Bot },
      ],
    }
  ];

  if (portalType === 'site_admin') {
    return [
      ...employeeGroups,
      {
        label: "Site Admin",
        items: [
          { title: "Setup", url: "/admin/setup", icon: Settings },
          { title: "Branding", url: "/admin/branding", icon: Palette },
          { title: "Integrations", url: "/admin/integrations", icon: Plug },
        ],
      }
    ];
  }

  return employeeGroups;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { portalType } = useAuth();

  const navGroups = getNavGroups(portalType);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-sidebar-accent-foreground">WorkHub</span>
              <span className="text-[11px] text-sidebar-foreground/60">
                {portalType === 'super_user' ? 'Super Admin Portal' : portalType === 'site_admin' ? 'Site Admin Portal' : 'Employee Portal'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                      >
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className={cn(
                            "rounded-md transition-colors",
                            isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
                          )}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-xs text-sidebar-foreground/60">v1.0 — Phase 1</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
