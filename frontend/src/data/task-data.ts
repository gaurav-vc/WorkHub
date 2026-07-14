import { Task, TeamMember, Notification, ProjectTemplate } from "@/types/tasks";

export const teamMembers: TeamMember[] = [
  { id: "tm1", name: "Sarah Johnson", initials: "SJ", role: "Product Manager", department: "Product", capacity: 8, capacityUnit: "hours/day" },
  { id: "tm2", name: "Alex Chen", initials: "AC", role: "Senior Engineer", department: "Engineering", capacity: 8, capacityUnit: "hours/day" },
  { id: "tm3", name: "Maria Lopez", initials: "ML", role: "UX Designer", department: "Design", capacity: 7, capacityUnit: "hours/day" },
  { id: "tm4", name: "James Wilson", initials: "JW", role: "Frontend Dev", department: "Engineering", capacity: 8, capacityUnit: "hours/day" },
  { id: "tm5", name: "Priya Sharma", initials: "PS", role: "QA Engineer", department: "Engineering", capacity: 6, capacityUnit: "hours/day" },
  { id: "tm6", name: "David Kim", initials: "DK", role: "Sales Lead", department: "Sales", capacity: 8, capacityUnit: "hours/day" },
  { id: "tm7", name: "Lisa Park", initials: "LP", role: "Marketing Manager", department: "Marketing", capacity: 7, capacityUnit: "hours/day" },
  { id: "tm8", name: "Tom Baker", initials: "TB", role: "Tech Writer", department: "Engineering", capacity: 6, capacityUnit: "hours/day" },
  { id: "tm9", name: "Anna Martinez", initials: "AM", role: "HR Specialist", department: "HR", capacity: 8, capacityUnit: "hours/day" },
  { id: "tm10", name: "Robert Lee", initials: "RL", role: "Data Analyst", department: "Product", capacity: 8, capacityUnit: "hours/day" },
];

export const allTasks: Task[] = [
  {
    id: "task-1", title: "Review Q1 roadmap priorities", description: "Go through the Q1 roadmap and reprioritize based on stakeholder feedback from the last review.", taskType: "self", priority: "P1", status: "in-progress", project: "Strategy", assignees: [{ name: "Sarah Johnson", initials: "SJ" }], createdBy: { name: "Sarah Johnson", initials: "SJ" }, createdDate: "Mar 20, 2026", dueDate: "Mar 26, 2026", dueTime: "9:00 AM", startDate: "Mar 24, 2026", estimatedEffort: 4, effortUnit: "hours", actualEffort: 2, isUrgent: true, repeat: { enabled: false, type: "daily" }, dependencies: [], checklist: [
      { id: "cl1", text: "Review engineering backlog", completed: true },
      { id: "cl2", text: "Gather stakeholder input", completed: true },
      { id: "cl3", text: "Update priority matrix", completed: false },
      { id: "cl4", text: "Send summary to leadership", completed: false },
    ], subtasks: [
      { id: "st1", title: "Compile feature requests", assignee: "Sarah Johnson", dueDate: "Mar 25, 2026", status: "done" },
      { id: "st2", title: "Create priority scorecard", assignee: "Robert Lee", dueDate: "Mar 26, 2026", status: "in-progress" },
    ], comments: [
      { id: "c1", user: "Alex Chen", initials: "AC", text: "I've added the tech debt items to the backlog. Please factor those in.", time: "2h ago" },
      { id: "c2", user: "Sarah Johnson", initials: "SJ", text: "@Alex Chen thanks, I'll include them in the priority matrix.", time: "1h ago", mentions: ["Alex Chen"] },
    ], chat: [
      { id: "ch1", user: "Sarah Johnson", initials: "SJ", text: "Starting the roadmap review now", time: "9:00 AM" },
      { id: "ch2", user: "Robert Lee", initials: "RL", text: "I've shared the analytics report for reference", time: "9:15 AM" },
    ], attachments: [
      { id: "a1", name: "Q1_Roadmap_v2.pdf", type: "pdf", size: "2.4 MB", uploadedBy: "Sarah Johnson", uploadedAt: "Mar 24, 2026" },
    ], tags: ["roadmap", "strategy"],
  },
  {
    id: "task-2", title: "Prepare sprint planning deck", description: "Create presentation for the upcoming sprint planning meeting.", taskType: "self", priority: "P2", status: "todo", project: "Engineering", assignees: [{ name: "Sarah Johnson", initials: "SJ" }], createdBy: { name: "Sarah Johnson", initials: "SJ" }, createdDate: "Mar 22, 2026", dueDate: "Mar 26, 2026", dueTime: "11:00 AM", startDate: "Mar 25, 2026", estimatedEffort: 3, effortUnit: "hours", actualEffort: 0, isUrgent: false, repeat: { enabled: true, type: "weekly" }, dependencies: ["task-1"], checklist: [
      { id: "cl5", text: "Pull velocity metrics", completed: false },
      { id: "cl6", text: "List sprint goals", completed: false },
      { id: "cl7", text: "Add capacity chart", completed: false },
    ], subtasks: [], comments: [], chat: [], attachments: [], tags: ["sprint"],
  },
  {
    id: "task-3", title: "Design system token update", description: "Update the design token library with new spacing and color values.", taskType: "assign", priority: "P2", status: "in-progress", project: "Design", assignees: [{ name: "Maria Lopez", initials: "ML" }], createdBy: { name: "Sarah Johnson", initials: "SJ" }, createdDate: "Mar 18, 2026", dueDate: "Mar 28, 2026", dueTime: "5:00 PM", startDate: "Mar 20, 2026", estimatedEffort: 16, effortUnit: "hours", actualEffort: 10, isUrgent: false, repeat: { enabled: false, type: "daily" }, dependencies: [], checklist: [
      { id: "cl8", text: "Audit current tokens", completed: true },
      { id: "cl9", text: "Define new spacing scale", completed: true },
      { id: "cl10", text: "Update Figma library", completed: false },
      { id: "cl11", text: "Generate code tokens", completed: false },
    ], subtasks: [
      { id: "st3", title: "Color palette revision", assignee: "Maria Lopez", dueDate: "Mar 26, 2026", status: "done" },
      { id: "st4", title: "Typography scale", assignee: "Maria Lopez", dueDate: "Mar 27, 2026", status: "in-progress" },
      { id: "st5", title: "Component variants", assignee: "Tom Baker", dueDate: "Mar 28, 2026", status: "todo" },
    ], comments: [
      { id: "c3", user: "Tom Baker", initials: "TB", text: "Should we also update the shadow tokens?", time: "1d ago" },
    ], chat: [], attachments: [], tags: ["design-system"],
  },
  {
    id: "task-4", title: "API integration tests", description: "Write comprehensive integration tests for the new auth API endpoints.", taskType: "assign", priority: "P1", status: "in-progress", project: "Engineering", assignees: [{ name: "Alex Chen", initials: "AC" }, { name: "James Wilson", initials: "JW" }], createdBy: { name: "Alex Chen", initials: "AC" }, createdDate: "Mar 19, 2026", dueDate: "Mar 27, 2026", dueTime: "6:00 PM", startDate: "Mar 22, 2026", estimatedEffort: 24, effortUnit: "hours", actualEffort: 14, isUrgent: true, repeat: { enabled: false, type: "daily" }, dependencies: [], checklist: [
      { id: "cl12", text: "Auth endpoint tests", completed: true },
      { id: "cl13", text: "Token refresh tests", completed: true },
      { id: "cl14", text: "Rate limiting tests", completed: false },
      { id: "cl15", text: "Error handling tests", completed: false },
      { id: "cl16", text: "Performance benchmarks", completed: false },
    ], subtasks: [
      { id: "st6", title: "Setup test environment", assignee: "Alex Chen", dueDate: "Mar 22, 2026", status: "done" },
      { id: "st7", title: "Write unit tests", assignee: "James Wilson", dueDate: "Mar 25, 2026", status: "done" },
      { id: "st8", title: "Integration test suite", assignee: "Alex Chen", dueDate: "Mar 27, 2026", status: "in-progress" },
    ], comments: [], chat: [
      { id: "ch3", user: "Alex Chen", initials: "AC", text: "Test coverage is at 78% now", time: "10:30 AM" },
      { id: "ch4", user: "James Wilson", initials: "JW", text: "I'll handle the rate limiting tests this afternoon", time: "11:00 AM" },
    ], attachments: [
      { id: "a2", name: "test-report-mar25.xlsx", type: "excel", size: "450 KB", uploadedBy: "Alex Chen", uploadedAt: "Mar 25, 2026" },
    ], tags: ["testing", "api"],
  },
  {
    id: "task-5", title: "Customer feedback analysis", description: "Analyze Q4 customer feedback surveys and prepare insights report.", taskType: "assign", priority: "P3", status: "todo", project: "Product", assignees: [{ name: "David Kim", initials: "DK" }, { name: "Robert Lee", initials: "RL" }], createdBy: { name: "Sarah Johnson", initials: "SJ" }, createdDate: "Mar 21, 2026", dueDate: "Mar 30, 2026", dueTime: "3:00 PM", startDate: "Mar 26, 2026", estimatedEffort: 12, effortUnit: "hours", actualEffort: 0, isUrgent: false, repeat: { enabled: true, type: "monthly" }, dependencies: [], checklist: [
      { id: "cl17", text: "Export survey data", completed: false },
      { id: "cl18", text: "Categorize responses", completed: false },
      { id: "cl19", text: "Create visualization charts", completed: false },
      { id: "cl20", text: "Draft insights report", completed: false },
    ], subtasks: [], comments: [], chat: [], attachments: [], tags: ["customer", "research"],
  },
  {
    id: "task-6", title: "Onboarding flow redesign", description: "Redesign the new employee onboarding experience for Q2.", taskType: "assign", priority: "P2", status: "todo", project: "HR", assignees: [{ name: "Anna Martinez", initials: "AM" }, { name: "Maria Lopez", initials: "ML" }], createdBy: { name: "Anna Martinez", initials: "AM" }, createdDate: "Mar 23, 2026", dueDate: "Apr 5, 2026", dueTime: "5:00 PM", startDate: "Mar 28, 2026", estimatedEffort: 3, effortUnit: "days", actualEffort: 0, isUrgent: false, repeat: { enabled: false, type: "daily" }, dependencies: ["task-3"], checklist: [], subtasks: [
      { id: "st9", title: "Audit current flow", assignee: "Anna Martinez", dueDate: "Mar 29, 2026", status: "todo" },
      { id: "st10", title: "Design new screens", assignee: "Maria Lopez", dueDate: "Apr 2, 2026", status: "todo" },
      { id: "st11", title: "Implement changes", assignee: "James Wilson", dueDate: "Apr 5, 2026", status: "todo" },
    ], comments: [], chat: [], attachments: [], tags: ["onboarding", "hr"],
  },
  {
    id: "task-7", title: "Marketing campaign launch", description: "Launch Q2 digital marketing campaign across all channels.", taskType: "assign", priority: "P1", status: "todo", project: "Marketing", assignees: [{ name: "Lisa Park", initials: "LP" }], createdBy: { name: "Lisa Park", initials: "LP" }, createdDate: "Mar 24, 2026", dueDate: "Apr 1, 2026", dueTime: "9:00 AM", startDate: "Mar 27, 2026", estimatedEffort: 2, effortUnit: "days", actualEffort: 0, isUrgent: false, repeat: { enabled: false, type: "daily" }, dependencies: [], checklist: [
      { id: "cl21", text: "Finalize ad creatives", completed: false },
      { id: "cl22", text: "Set up tracking pixels", completed: false },
      { id: "cl23", text: "Schedule social posts", completed: false },
      { id: "cl24", text: "Launch email sequence", completed: false },
    ], subtasks: [], comments: [], chat: [], attachments: [], tags: ["marketing", "campaign"],
  },
  {
    id: "task-8", title: "Security audit report", description: "Complete the quarterly security audit and compile findings.", taskType: "assign", priority: "P1", status: "blocked", project: "Engineering", assignees: [{ name: "Priya Sharma", initials: "PS" }], createdBy: { name: "Alex Chen", initials: "AC" }, createdDate: "Mar 20, 2026", dueDate: "Mar 28, 2026", dueTime: "5:00 PM", startDate: "Mar 24, 2026", estimatedEffort: 20, effortUnit: "hours", actualEffort: 6, isUrgent: true, repeat: { enabled: true, type: "custom", interval: 3, unit: "months", infinite: true }, dependencies: ["task-4"], checklist: [
      { id: "cl25", text: "Run vulnerability scan", completed: true },
      { id: "cl26", text: "Review access logs", completed: false },
      { id: "cl27", text: "Test penetration points", completed: false },
      { id: "cl28", text: "Compile report", completed: false },
    ], subtasks: [], comments: [
      { id: "c4", user: "Priya Sharma", initials: "PS", text: "Blocked waiting for API test completion (task-4). Can't run full security scan until tests pass.", time: "4h ago" },
    ], chat: [], attachments: [], tags: ["security", "audit"],
  },
];

export const notifications: Notification[] = [
  { id: "n1", type: "task-assigned", title: "New Task Assigned", message: "Alex Chen assigned you 'API integration tests'", time: "5 min ago", read: false, link: "/tasks/my-day" },
  { id: "n2", type: "comment", title: "New Comment", message: "Alex Chen commented on 'Review Q1 roadmap priorities'", time: "1h ago", read: false, link: "/tasks/my-day" },
  { id: "n3", type: "mention", title: "You were mentioned", message: "Sarah Johnson mentioned you in a comment on 'API tests'", time: "2h ago", read: false, link: "/tasks/my-day" },
  { id: "n4", type: "urgent", title: "Urgent Task", message: "'Security audit report' is due in 2 days", time: "3h ago", read: false, link: "/tasks/my-day" },
  { id: "n5", type: "dependency-complete", title: "Dependency Completed", message: "'Requirements Gathering' is done — 'UI/UX Design' can start", time: "5h ago", read: true },
  { id: "n6", type: "task-updated", title: "Task Updated", message: "Maria Lopez moved 'Design system token update' to In Progress", time: "1d ago", read: true },
  { id: "n7", type: "comment", title: "New Comment", message: "Tom Baker commented on 'Design system token update'", time: "1d ago", read: true },
  { id: "n8", type: "task-assigned", title: "New Task Assigned", message: "You were assigned 'Customer feedback analysis'", time: "2d ago", read: true },
];

const templateCategories = [
  "Team Management", "Productivity", "Business", "Education", "Project Management",
  "Engineering", "Design", "Creative", "Finance", "Marketing", "Support", "Personal",
];

function generateTemplates(): ProjectTemplate[] {
  const templates: ProjectTemplate[] = [];
  const templateData: Array<{ name: string; description: string; category: string; tasks: number; icon: string; popular?: boolean }> = [
    // Team Management
    { name: "Team Standup Tracker", description: "Daily standup notes, blockers, and action items", category: "Team Management", tasks: 15, icon: "users" },
    { name: "Sprint Retrospective", description: "What went well, improvements, and action items", category: "Team Management", tasks: 12, icon: "refresh-cw" },
    { name: "Team OKR Planning", description: "Set and track team objectives and key results", category: "Team Management", tasks: 20, icon: "target" },
    { name: "1-on-1 Meeting Tracker", description: "Track talking points and follow-ups for 1-on-1s", category: "Team Management", tasks: 8, icon: "message-circle" },
    { name: "Team Capacity Planner", description: "Track team availability and workload", category: "Team Management", tasks: 10, icon: "bar-chart" },
    { name: "Cross-Team Collaboration", description: "Coordinate work across multiple teams", category: "Team Management", tasks: 18, icon: "git-merge" },
    { name: "Remote Team Hub", description: "Central hub for distributed teams", category: "Team Management", tasks: 14, icon: "globe" },
    { name: "New Team Setup", description: "Everything needed to set up a new team", category: "Team Management", tasks: 22, icon: "plus-circle" },
    // Productivity
    { name: "Weekly Planner", description: "Plan and organize your week effectively", category: "Productivity", tasks: 10, icon: "calendar", popular: true },
    { name: "Habit Tracker", description: "Build and track daily habits", category: "Productivity", tasks: 7, icon: "check-circle" },
    { name: "Goal Setting Framework", description: "SMART goals with milestones and tracking", category: "Productivity", tasks: 15, icon: "target", popular: true },
    { name: "Time Boxing Template", description: "Schedule tasks in focused time blocks", category: "Productivity", tasks: 8, icon: "clock" },
    { name: "Eisenhower Matrix", description: "Prioritize tasks by urgency and importance", category: "Productivity", tasks: 12, icon: "grid" },
    { name: "Pomodoro Workflow", description: "Track focused work sessions and breaks", category: "Productivity", tasks: 6, icon: "timer" },
    { name: "Daily Journal", description: "Structured daily reflection and planning", category: "Productivity", tasks: 5, icon: "book" },
    { name: "Focus Time Tracker", description: "Track deep work sessions and productivity", category: "Productivity", tasks: 8, icon: "zap" },
    // Business
    { name: "Business Plan Template", description: "Comprehensive business plan structure", category: "Business", tasks: 30, icon: "briefcase" },
    { name: "Startup Launch Checklist", description: "Everything to launch a startup", category: "Business", tasks: 45, icon: "rocket", popular: true },
    { name: "Quarterly Business Review", description: "QBR preparation and tracking", category: "Business", tasks: 20, icon: "pie-chart" },
    { name: "Partnership Agreement", description: "Track partnership deal stages", category: "Business", tasks: 16, icon: "handshake" },
    { name: "Investor Relations", description: "Manage investor communications", category: "Business", tasks: 18, icon: "trending-up" },
    { name: "Risk Assessment", description: "Identify and track business risks", category: "Business", tasks: 14, icon: "alert-triangle" },
    { name: "Competitive Analysis", description: "Track competitor landscape", category: "Business", tasks: 12, icon: "search" },
    { name: "Annual Planning", description: "Company-wide annual planning framework", category: "Business", tasks: 25, icon: "calendar" },
    // Education
    { name: "Course Curriculum", description: "Plan and organize course content", category: "Education", tasks: 20, icon: "book-open" },
    { name: "Student Onboarding", description: "Welcome and orient new students", category: "Education", tasks: 12, icon: "graduation-cap" },
    { name: "Research Project", description: "Structure academic research workflows", category: "Education", tasks: 18, icon: "microscope" },
    { name: "Training Program", description: "Design employee training programs", category: "Education", tasks: 22, icon: "award", popular: true },
    { name: "Workshop Planner", description: "Plan and execute workshops", category: "Education", tasks: 15, icon: "presentation" },
    { name: "Study Group Organizer", description: "Coordinate study group activities", category: "Education", tasks: 10, icon: "users" },
    // Project Management
    { name: "Agile Sprint Board", description: "Standard sprint workflow with backlog", category: "Project Management", tasks: 25, icon: "kanban", popular: true },
    { name: "Waterfall Project Plan", description: "Sequential phase-based project plan", category: "Project Management", tasks: 35, icon: "list" },
    { name: "Product Launch", description: "End-to-end product launch checklist", category: "Project Management", tasks: 40, icon: "rocket", popular: true },
    { name: "Website Redesign", description: "Complete website redesign project", category: "Project Management", tasks: 32, icon: "layout" },
    { name: "Mobile App Development", description: "Full mobile app dev lifecycle", category: "Project Management", tasks: 45, icon: "smartphone" },
    { name: "Event Planning", description: "Plan and execute corporate events", category: "Project Management", tasks: 28, icon: "calendar" },
    { name: "Office Relocation", description: "Manage office move logistics", category: "Project Management", tasks: 35, icon: "map-pin" },
    { name: "Software Migration", description: "Plan and execute system migrations", category: "Project Management", tasks: 30, icon: "server" },
    { name: "Bug Tracking Board", description: "Track and prioritize bug fixes", category: "Project Management", tasks: 15, icon: "bug" },
    { name: "Release Management", description: "Coordinate software releases", category: "Project Management", tasks: 20, icon: "package" },
    // Engineering
    { name: "CI/CD Pipeline Setup", description: "Configure continuous integration workflow", category: "Engineering", tasks: 18, icon: "git-branch" },
    { name: "Code Review Process", description: "Standardize code review workflow", category: "Engineering", tasks: 12, icon: "code" },
    { name: "System Architecture Review", description: "Document and review system architecture", category: "Engineering", tasks: 15, icon: "cpu" },
    { name: "Database Migration", description: "Plan and execute database migrations", category: "Engineering", tasks: 20, icon: "database" },
    { name: "API Development", description: "Design and build REST/GraphQL APIs", category: "Engineering", tasks: 22, icon: "server" },
    { name: "Performance Optimization", description: "Identify and fix performance issues", category: "Engineering", tasks: 16, icon: "zap" },
    { name: "Security Hardening", description: "Security audit and hardening checklist", category: "Engineering", tasks: 25, icon: "shield" },
    { name: "Tech Debt Reduction", description: "Track and reduce technical debt", category: "Engineering", tasks: 18, icon: "tool" },
    // Design
    { name: "Design Sprint", description: "5-day design sprint framework", category: "Design", tasks: 25, icon: "pen-tool", popular: true },
    { name: "UI Component Library", description: "Build and maintain component library", category: "Design", tasks: 30, icon: "layers" },
    { name: "Brand Identity", description: "Create brand identity guidelines", category: "Design", tasks: 20, icon: "palette" },
    { name: "User Research Plan", description: "Plan and conduct user research", category: "Design", tasks: 15, icon: "search" },
    { name: "Accessibility Audit", description: "WCAG compliance review", category: "Design", tasks: 18, icon: "eye" },
    { name: "Design System Setup", description: "Create comprehensive design system", category: "Design", tasks: 35, icon: "grid" },
    // Creative
    { name: "Content Calendar", description: "Plan and schedule content creation", category: "Creative", tasks: 20, icon: "calendar", popular: true },
    { name: "Video Production", description: "End-to-end video production workflow", category: "Creative", tasks: 22, icon: "video" },
    { name: "Podcast Launch", description: "Launch and manage a podcast", category: "Creative", tasks: 18, icon: "mic" },
    { name: "Social Media Strategy", description: "Plan social media campaigns", category: "Creative", tasks: 16, icon: "share-2" },
    { name: "Photo Shoot Planning", description: "Organize and execute photo shoots", category: "Creative", tasks: 14, icon: "camera" },
    { name: "Newsletter Template", description: "Recurring newsletter workflow", category: "Creative", tasks: 10, icon: "mail" },
    // Finance
    { name: "Budget Planning", description: "Annual/quarterly budget planning", category: "Finance", tasks: 20, icon: "dollar-sign" },
    { name: "Expense Tracking", description: "Track and categorize expenses", category: "Finance", tasks: 10, icon: "credit-card" },
    { name: "Financial Audit Prep", description: "Prepare for financial audits", category: "Finance", tasks: 25, icon: "file-text" },
    { name: "Invoice Management", description: "Track invoices and payments", category: "Finance", tasks: 12, icon: "receipt" },
    { name: "Revenue Forecasting", description: "Build revenue projections", category: "Finance", tasks: 15, icon: "trending-up" },
    { name: "Tax Season Checklist", description: "Prepare for tax filing", category: "Finance", tasks: 18, icon: "clipboard" },
    // Marketing
    { name: "SEO Audit", description: "Comprehensive SEO review checklist", category: "Marketing", tasks: 22, icon: "search" },
    { name: "Email Campaign", description: "Plan and execute email campaigns", category: "Marketing", tasks: 15, icon: "mail", popular: true },
    { name: "Product Marketing Launch", description: "Go-to-market strategy execution", category: "Marketing", tasks: 30, icon: "megaphone" },
    { name: "A/B Testing Framework", description: "Design and track A/B tests", category: "Marketing", tasks: 12, icon: "split" },
    { name: "Brand Campaign", description: "Full brand awareness campaign", category: "Marketing", tasks: 25, icon: "globe" },
    { name: "Lead Generation", description: "Lead gen strategy and tracking", category: "Marketing", tasks: 18, icon: "target" },
    // Support
    { name: "Customer Onboarding", description: "New customer onboarding workflow", category: "Support", tasks: 15, icon: "user-plus", popular: true },
    { name: "Bug Report Triage", description: "Triage and prioritize bug reports", category: "Support", tasks: 10, icon: "bug" },
    { name: "Knowledge Base Setup", description: "Create help documentation", category: "Support", tasks: 20, icon: "book" },
    { name: "SLA Tracking", description: "Monitor service level agreements", category: "Support", tasks: 12, icon: "clock" },
    { name: "Incident Response", description: "Incident management playbook", category: "Support", tasks: 16, icon: "alert-circle" },
    { name: "Customer Feedback Loop", description: "Collect and act on feedback", category: "Support", tasks: 14, icon: "message-square" },
    // Personal
    { name: "Life Goals Tracker", description: "Track personal life goals", category: "Personal", tasks: 10, icon: "star" },
    { name: "Moving Checklist", description: "Everything for a smooth move", category: "Personal", tasks: 25, icon: "home" },
    { name: "Wedding Planner", description: "Plan your perfect wedding", category: "Personal", tasks: 40, icon: "heart" },
    { name: "Travel Planner", description: "Plan trips and vacations", category: "Personal", tasks: 15, icon: "map" },
    { name: "Home Renovation", description: "Track home improvement projects", category: "Personal", tasks: 20, icon: "tool" },
    { name: "Side Project Tracker", description: "Manage personal side projects", category: "Personal", tasks: 12, icon: "code" },
  ];

  templateData.forEach((t, i) => {
    templates.push({ id: `tmpl-${i + 1}`, ...t });
  });

  // Generate remaining to reach ~100 templates (the rest are variations)
  const extraNames = [
    "Lean Canvas", "SWOT Analysis", "Kanban Board", "Scrum Board", "Product Roadmap",
    "Feature Prioritization", "Customer Journey Map", "Stakeholder Map", "RFP Response",
    "Vendor Evaluation", "Employee Engagement", "Exit Interview", "Skills Matrix",
    "Mentor Program", "Diversity & Inclusion", "Company Culture Plan", "Benefits Review",
    "Compliance Checklist", "Data Privacy Audit", "Cloud Migration", "DevOps Pipeline",
    "Microservices Architecture", "Load Testing Plan", "UX Heuristic Review",
    "Wireframe Kit", "Prototype Testing", "Color System", "Icon Library",
    "Motion Design Specs", "Blog Editorial Calendar", "Webinar Planning",
    "Influencer Outreach", "PR Campaign", "Crisis Communication",
    "Sales Playbook", "Account Management", "Territory Planning", "Proposal Template",
    "Contract Review", "Procurement Checklist",
  ];
  extraNames.forEach((name, i) => {
    const catIndex = i % templateCategories.length;
    templates.push({
      id: `tmpl-extra-${i + 1}`,
      name,
      description: `Ready-to-use ${name.toLowerCase()} template with pre-configured tasks`,
      category: templateCategories[catIndex],
      tasks: 10 + Math.floor(Math.random() * 30),
      icon: "file-text",
    });
  });

  return templates;
}

export const projectTemplates = generateTemplates();
