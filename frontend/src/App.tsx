import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TaskProvider } from "@/context/TaskContext";
import Dashboard from "@/pages/Dashboard";
import MyDay from "@/pages/MyDay";
import CalendarMeetings from "@/pages/CalendarMeetings";
import TeamChat from "@/pages/TeamChat";
import KnowledgeBase from "@/pages/KnowledgeBase";
import CustomBoards from "@/pages/CustomBoards";
import HRRequests from "@/pages/HRRequests";
import EmployeeDirectory from "@/pages/EmployeeDirectory";
import AIAssistant from "@/pages/AIAssistant";
import Projects from "@/pages/Projects";
import ProjectDetails from "@/pages/ProjectDetails";
import Timeline from "@/pages/Timeline";
import DocsNotes from "@/pages/DocsNotes";
import RecognitionBirthdays from "@/pages/RecognitionBirthdays";
import CompanyPolicies from "@/pages/CompanyPolicies";
import WorkflowAutomation from "@/pages/WorkflowAutomation";
import PredictiveInsights from "@/pages/PredictiveInsights";
import ResourcePlanning from "@/pages/ResourcePlanning";
import TemplateMarketplace from "@/pages/TemplateMarketplace";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";

// HR & Employees additions
import Attendance from "@/pages/Attendance";
import { CompanyPulse } from "@/pages/CompanyPulse";
import PendingApprovals from "@/pages/PendingApprovals";

// Learning & Training additions
import LearningCenter from "@/pages/LearningCenter";
import MyCertificates from "@/pages/MyCertificates";
import CoursePreview from "@/pages/CoursePreview";

// Collaboration additions
import MOMList from "@/pages/MOMList";
import CreateMOM from "@/pages/CreateMOM";
import MOMDetails from "@/pages/MOMDetails";

// AI & Automation additions
import AIAgents from "@/pages/AIAgents";

// Admin additions
import Setup from "@/pages/Setup";
import Branding from "@/pages/Branding";
import Integrations from "@/pages/Integrations";

// Super Admin additions
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import { OrganizationManagement } from "@/pages/OrganizationManagement";
import SitesList from "@/pages/SitesList";
import AddSite from "@/pages/AddSite";
import OrganizationBillingDetails from "@/pages/OrganizationBillingDetails";
import Billing from "@/pages/Billing";

export const APP_ROUTES = [
  // My Work
  { id: "dashboard", path: "/", title: "Dashboard", category: "My Work" },
  { id: "tasks-my-day", path: "/tasks/my-day", title: "My Day", category: "My Work" },
  { id: "tasks-calendar", path: "/tasks/calendar", title: "Calendar", category: "My Work" },
  { id: "tasks-projects", path: "/tasks/projects", title: "Projects", category: "My Work" },
  { id: "tasks-timeline", path: "/tasks/timeline", title: "Timeline", category: "My Work" },
  { id: "tasks-resources", path: "/tasks/resources", title: "Resources", category: "My Work" },
  { id: "tasks-templates", path: "/tasks/templates", title: "Templates", category: "My Work" },
  { id: "mom-list", path: "/collaboration/moms", title: "MOM", category: "My Work" },

  // Collaboration
  { id: "team-chat", path: "/collaboration/chat", title: "Team Chat", category: "Collaboration" },
  { id: "docs-notes", path: "/collaboration/docs", title: "Docs & Notes", category: "Collaboration" },
  { id: "knowledge-base", path: "/collaboration/wiki", title: "Knowledge Base", category: "Collaboration" },
  { id: "custom-boards", path: "/collaboration/boards", title: "My Boards", category: "Collaboration" },

  // Learning Center
  { id: "learning-center", path: "/learning", title: "Learning Center", category: "Learning Center" },

  // HR Services
  { id: "hr-requests", path: "/hr/requests", title: "HR Requests", category: "HR Services" },
  { id: "employee-directory", path: "/hr/directory", title: "Directory", category: "HR Services" },
  { id: "recognition", path: "/hr/recognition", title: "Recognition", category: "HR Services" },
  { id: "company-policies", path: "/hr/policies", title: "Policies", category: "HR Services" },
  { id: "attendance", path: "/hr/attendance", title: "Attendance", category: "HR Services" },
  { id: "company-pulse", path: "/hr/company-pulse", title: "Company Pulse", category: "HR Services" },

  // AI & Automation
  { id: "workflow-automation", path: "/ai/workflows", title: "Workflows", category: "AI & Automation" },
  { id: "predictive-insights", path: "/ai/insights", title: "Insights", category: "AI & Automation" },
  { id: "ai-agents", path: "/ai/agents", title: "AI Agents", category: "AI & Automation" },

  // Site Admin
  { id: "admin-setup", path: "/admin/setup", title: "Setup", category: "Site Admin" },
  { id: "admin-branding", path: "/admin/branding", title: "Branding", category: "Site Admin" },
  { id: "admin-integrations", path: "/admin/integrations", title: "Integrations", category: "Site Admin" },
];

import { AuthProvider } from "@/context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TaskProvider>
            <AppLayout>
              <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Task & Project Management */}
              <Route path="/tasks/my-day" element={<MyDay />} />
              <Route path="/tasks/calendar" element={<CalendarMeetings />} />
              <Route path="/tasks/projects" element={<Projects />} />
              <Route path="/tasks/projects/:id" element={<ProjectDetails />} />
              <Route path="/tasks/timeline" element={<Timeline />} />
              <Route path="/tasks/resources" element={<ResourcePlanning />} />
              <Route path="/tasks/templates" element={<TemplateMarketplace />} />
              
              {/* Collaboration */}
              <Route path="/collaboration/chat" element={<TeamChat />} />
              <Route path="/collaboration/docs" element={<DocsNotes />} />
              <Route path="/collaboration/wiki" element={<KnowledgeBase />} />
              <Route path="/collaboration/boards" element={<CustomBoards />} />
              <Route path="/collaboration/moms" element={<MOMList />} />
              <Route path="/collaboration/moms/create" element={<CreateMOM />} />
              <Route path="/collaboration/moms/:id" element={<MOMDetails />} />
              
              {/* HR Services */}
              <Route path="/hr/requests" element={<HRRequests />} />
              <Route path="/hr/directory" element={<EmployeeDirectory />} />
              <Route path="/hr/recognition" element={<RecognitionBirthdays />} />
              <Route path="/hr/policies" element={<CompanyPolicies />} />
              <Route path="/hr/attendance" element={<Attendance />} />
              <Route path="/hr/company-pulse" element={<CompanyPulse />} />
              <Route path="/hr/approvals" element={<PendingApprovals />} />
              
              {/* Learning & Training */}
              <Route path="/learning" element={<LearningCenter />} />
              <Route path="/learning/certificates" element={<MyCertificates />} />
              <Route path="/learning/course/:id" element={<CoursePreview />} />
              
              {/* AI & Automation */}
              <Route path="/ai/assistant" element={<AIAssistant />} />
              <Route path="/ai/workflows" element={<WorkflowAutomation />} />
              <Route path="/ai/insights" element={<PredictiveInsights />} />
              <Route path="/ai/agents" element={<AIAgents />} />
              
              {/* Admin */}
              <Route path="/admin/setup" element={<Setup />} />
              <Route path="/admin/branding" element={<Branding />} />
              <Route path="/admin/integrations" element={<Integrations />} />
              
              {/* Super Admin */}
              <Route path="/superadmin" element={<SuperAdminDashboard />} />
              <Route path="/admin/organizations" element={<OrganizationManagement />} />
              <Route path="/admin/sites" element={<SitesList />} />
              <Route path="/admin/sites/add" element={<AddSite />} />
              <Route path="/admin/billing" element={<Billing />} />
              <Route path="/admin/organizations/:id/billing" element={<OrganizationBillingDetails />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AppLayout>
          </TaskProvider>
          </AuthProvider>
        </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
