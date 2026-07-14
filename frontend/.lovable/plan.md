

# Employee Portal — Implementation Plan

## Design Direction
Corporate and polished foundation with modern, playful touches — think clean typography, professional color palette (deep navy/slate primary with vibrant accent colors), rounded cards, subtle shadows, and micro-interactions. Structured layouts with occasional warmth (icons, avatars, color-coded tags).

---

## Phase 1: App Shell & Navigation

### Sidebar + Top Bar Layout
- Collapsible sidebar with icon-only mini mode
- Grouped navigation: My Work, Collaboration, HR Services, AI & Automation, Admin
- Top bar with search, notifications bell, quick-add button, and user avatar/menu
- Mobile-responsive hamburger menu

### Dashboard Home
- Customizable widget grid: My Tasks Today, Upcoming Meetings, Team Activity, Pending Approvals, Quick Links
- Welcome banner with user name and date
- Summary cards (tasks due, leave balance, unread messages)

---

## Phase 2: Task & Project Management

### My Day View
- Today's tasks with drag-to-reorder, priority badges (P1-P4), due times
- Quick-add task inline
- Calendar preview sidebar showing today's meetings/events

### Task Detail Panel
- Slide-over panel with: title, description, assignee, priority, due date, subtasks checklist, dependencies, attachments, comments
- Recurring task toggle
- Status workflow (To Do → In Progress → Review → Done)

### Calendar & Meetings
- Monthly/weekly/daily calendar views
- Meeting cards with attendees, agenda, join link
- Invites tab with accept/decline actions

### Gantt / Timeline View
- Horizontal timeline with task bars, dependency arrows
- Drag to adjust dates, zoom in/out

### Workload View
- Team member rows showing capacity bars
- Color-coded by utilization (green/yellow/red)

### Project Dashboard
- Project cards with progress rings, status badges, team avatars
- Filters by department, status, date range

### Role-Based Visibility (dummy data)
- Employee view: personal + assigned work tasks
- Manager view: team work tasks aggregated
- Executive view: department-level dashboards
- Personal tasks always private

---

## Phase 3: Collaboration

### Team Chat
- Channel list sidebar, message thread area
- Message bubbles with timestamps, reactions, reply threads
- File/image sharing inline (dummy)

### Docs & Notes
- Rich text editor view for creating/editing docs
- Document list with search and folder organization

### Knowledge Base / Wiki
- Searchable article cards with categories/tags
- Article detail page with table of contents

### Custom Boards
- Kanban board with draggable columns and cards
- Board templates: Sales Pipeline, Project Tracker, Personal
- Card detail with custom fields, labels, due dates

### Board Uploads (UI only)
- Upload area for PDF/Excel with file preview
- Mapping UI to convert imported rows into board cards

---

## Phase 4: Employee Services

### HR Requests
- Request forms: Leave, Travel, Expense with status tracking
- My Requests list with filters (pending, approved, rejected)

### Employee Directory
- Searchable grid/list of employee cards (photo, name, role, department, contact)
- Profile detail page with digital business card export

### Recognition & Birthdays
- Birthday carousel for the month
- Kudos/recognition wall — post appreciation cards

### Policy Access
- Categorized policy documents list with search
- PDF viewer for policies

---

## Phase 5: AI & Automation (UI Shell)

### AI Sidebar
- Slide-out AI assistant panel accessible from any page
- Agent selector tabs: Task Agent, HR Agent, Knowledge Agent, Sales Agent
- Chat-style interface with suggested prompts
- All responses will be mock/placeholder (real AI integration deferred)

### Workflow Automation
- Visual workflow builder mockup with trigger → action cards
- Template gallery (auto-assign tasks, approval flows, notifications)

### Predictive Insights
- Dashboard cards showing risk indicators, bottleneck warnings
- Charts for resource forecasting (using Recharts)

---

## Phase 6: Settings & Admin

### Role-Based Permissions UI
- Roles table view (Admin, Manager, Employee)
- Permission matrix grid

### Branding / White-Label
- Settings page for logo upload, primary color picker, company name

### Integration Placeholders
- Integration cards for SAP, Salesforce, Oracle, Workday with "Connect" buttons (non-functional, for demo)
- SSO configuration form mockup

---

## Technical Approach
- All dummy data via local JSON/TypeScript constants — no backend required initially
- Modular page components per feature, shared layout wrapper
- Recharts for all charts/graphs
- shadcn/ui components throughout for consistency
- React Router for all navigation
- Mobile-first responsive with Tailwind breakpoints
- Accessible: focus states, ARIA labels, keyboard navigation

