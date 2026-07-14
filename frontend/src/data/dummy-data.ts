export const currentUser = {
  id: "u1",
  name: "Sarah Johnson",
  email: "sarah.johnson@company.com",
  role: "Product Manager",
  department: "Product",
  avatar: "",
  initials: "SJ",
};

export const todayTasks = [
  { id: "t1", title: "Review Q1 roadmap priorities", priority: "P1", dueTime: "9:00 AM", status: "in-progress", project: "Strategy" },
  { id: "t2", title: "Prepare sprint planning deck", priority: "P2", dueTime: "11:00 AM", status: "todo", project: "Engineering" },
  { id: "t3", title: "1:1 with design lead", priority: "P2", dueTime: "2:00 PM", status: "todo", project: "Design" },
  { id: "t4", title: "Update feature specs for v2.3", priority: "P3", dueTime: "4:00 PM", status: "todo", project: "Product" },
  { id: "t5", title: "Send stakeholder update email", priority: "P1", dueTime: "5:00 PM", status: "todo", project: "Strategy" },
];

export const upcomingMeetings = [
  { id: "m1", title: "Sprint Planning", time: "10:00 AM", duration: "1h", attendees: 8, type: "recurring" },
  { id: "m2", title: "Design Review", time: "2:00 PM", duration: "45m", attendees: 5, type: "one-time" },
  { id: "m3", title: "Stakeholder Sync", time: "4:30 PM", duration: "30m", attendees: 3, type: "recurring" },
];

export const teamActivity = [
  { id: "a1", user: "Alex Chen", action: "completed", target: "API integration tests", time: "10 min ago", initials: "AC" },
  { id: "a2", user: "Maria Lopez", action: "commented on", target: "Dashboard redesign", time: "25 min ago", initials: "ML" },
  { id: "a3", user: "James Wilson", action: "created", target: "Bug: Login redirect loop", time: "1h ago", initials: "JW" },
  { id: "a4", user: "Priya Sharma", action: "approved", target: "Leave request - Dec 24-26", time: "2h ago", initials: "PS" },
];

export const pendingApprovals = [
  { id: "ap1", type: "Leave", requester: "Tom Baker", detail: "Annual leave: Dec 20-24", status: "pending" },
  { id: "ap2", type: "Expense", requester: "Lisa Park", detail: "Conference registration - $450", status: "pending" },
  { id: "ap3", type: "Travel", requester: "David Kim", detail: "Client visit - NYC, Jan 10-12", status: "pending" },
];

export const summaryStats = {
  tasksDue: 5,
  leaveBalance: 14,
  unreadMessages: 12,
  pendingApprovals: 3,
};

export const quickLinks = [
  { label: "Submit Leave", href: "/hr/leave", icon: "calendar" },
  { label: "Expense Report", href: "/hr/expenses", icon: "receipt" },
  { label: "Company Wiki", href: "/collaboration/wiki", icon: "book" },
  { label: "Team Directory", href: "/hr/directory", icon: "users" },
];

// --- HR Requests dummy data ---
export const hrRequests = [
  { id: "hr1", type: "Leave", title: "Annual Leave", detail: "Dec 20 - Dec 24, 2025", status: "approved", date: "Dec 10, 2025" },
  { id: "hr2", type: "Leave", title: "Sick Leave", detail: "Jan 5, 2026", status: "pending", date: "Jan 4, 2026" },
  { id: "hr3", type: "Travel", title: "Client Visit - NYC", detail: "Jan 10-12, 2026 • Flight + Hotel", status: "pending", date: "Dec 28, 2025" },
  { id: "hr4", type: "Expense", title: "Conference Registration", detail: "React Summit 2026 - $450", status: "rejected", date: "Dec 15, 2025" },
  { id: "hr5", type: "Expense", title: "Team Lunch", detail: "Dec 18, 2025 - $120", status: "approved", date: "Dec 18, 2025" },
  { id: "hr6", type: "Travel", title: "Training Workshop - SF", detail: "Feb 5-7, 2026 • Flight + Hotel", status: "approved", date: "Jan 15, 2026" },
];

// --- Team Chat dummy data ---
export const chatChannels = [
  { id: "ch1", name: "general", unread: 3, description: "Company-wide announcements" },
  { id: "ch2", name: "engineering", unread: 7, description: "Engineering team discussions" },
  { id: "ch3", name: "design", unread: 0, description: "Design team updates" },
  { id: "ch4", name: "product", unread: 1, description: "Product team planning" },
  { id: "ch5", name: "random", unread: 0, description: "Water cooler chat" },
  { id: "ch6", name: "sales", unread: 2, description: "Sales team pipeline" },
];

export const chatMessages: Record<string, Array<{
  id: string; user: string; initials: string; message: string; time: string; reactions?: Array<{ emoji: string; count: number }>; replies?: number;
}>> = {
  ch1: [
    { id: "msg1", user: "CEO Office", initials: "CO", message: "🎉 Q4 results are in — we exceeded targets by 15%! Great work everyone.", time: "9:00 AM", reactions: [{ emoji: "🎉", count: 24 }, { emoji: "🚀", count: 12 }], replies: 8 },
    { id: "msg2", user: "HR Team", initials: "HR", message: "Reminder: Annual reviews start next week. Please complete your self-assessments by Friday.", time: "9:45 AM", reactions: [{ emoji: "👍", count: 6 }] },
    { id: "msg3", user: "Sarah Johnson", initials: "SJ", message: "The new office layout looks amazing! Kudos to the facilities team.", time: "10:30 AM", reactions: [{ emoji: "❤️", count: 9 }], replies: 3 },
    { id: "msg4", user: "IT Support", initials: "IT", message: "Scheduled maintenance this Saturday 2-4 AM EST. Expect brief downtime.", time: "11:15 AM" },
  ],
  ch2: [
    { id: "msg5", user: "Alex Chen", initials: "AC", message: "Just merged the new auth flow. Can someone review the PR? #1234", time: "8:30 AM", reactions: [{ emoji: "👀", count: 3 }], replies: 5 },
    { id: "msg6", user: "James Wilson", initials: "JW", message: "Found a regression in the payment module — looks like the Stripe webhook handler is timing out.", time: "9:00 AM", replies: 12 },
    { id: "msg7", user: "Priya Sharma", initials: "PS", message: "I've deployed the fix to staging. Can we get QA eyes on it today?", time: "10:00 AM", reactions: [{ emoji: "✅", count: 2 }] },
    { id: "msg8", user: "Alex Chen", initials: "AC", message: "Performance audit results are ready: 95 Lighthouse score on the dashboard! 🏎️", time: "11:30 AM", reactions: [{ emoji: "🔥", count: 8 }, { emoji: "🏎️", count: 4 }] },
  ],
  ch3: [
    { id: "msg9", user: "Maria Lopez", initials: "ML", message: "New design system tokens uploaded to Figma. Please review the spacing scale.", time: "9:30 AM", replies: 2 },
    { id: "msg10", user: "Tom Baker", initials: "TB", message: "Love the new illustrations! Can we use them on the marketing site too?", time: "10:15 AM", reactions: [{ emoji: "😍", count: 5 }] },
  ],
  ch4: [
    { id: "msg11", user: "Sarah Johnson", initials: "SJ", message: "Let's finalize the v2.3 feature list today. I've updated the spec doc.", time: "8:00 AM", replies: 4 },
    { id: "msg12", user: "David Kim", initials: "DK", message: "Customer feedback summary is ready — top request is still bulk actions.", time: "9:30 AM", reactions: [{ emoji: "📊", count: 3 }] },
  ],
  ch5: [
    { id: "msg13", user: "Lisa Park", initials: "LP", message: "Anyone up for board games after work Friday? 🎲", time: "12:00 PM", reactions: [{ emoji: "🙋", count: 7 }], replies: 6 },
  ],
  ch6: [
    { id: "msg14", user: "David Kim", initials: "DK", message: "Closed the Acme Corp deal! $250K ARR 🎯", time: "3:00 PM", reactions: [{ emoji: "🎉", count: 15 }, { emoji: "💰", count: 8 }], replies: 10 },
    { id: "msg15", user: "Lisa Park", initials: "LP", message: "Q1 pipeline looks strong — 40% ahead of target.", time: "3:30 PM", reactions: [{ emoji: "📈", count: 6 }] },
  ],
};

// --- AI Assistant dummy data ---
export const aiAgents = [
  { id: "task", name: "Task Agent", icon: "check-square", description: "Auto-create tasks, scheduling, dependency resolution", color: "primary" as const },
  { id: "hr", name: "HR Agent", icon: "clipboard-list", description: "Policy queries, benefits, leave info", color: "success" as const },
  { id: "knowledge", name: "Knowledge Agent", icon: "book-open", description: "Search wiki, docs, company knowledge", color: "info" as const },
  { id: "sales", name: "Sales Agent", icon: "trending-up", description: "CRM sync, lead tracking, pipeline", color: "warning" as const },
];

export const aiSuggestedPrompts: Record<string, string[]> = {
  task: [
    "Create a task for Q1 planning review",
    "What's my workload this week?",
    "Reschedule all P3 tasks to next sprint",
    "Show dependencies for the v2.3 release",
  ],
  hr: [
    "How many leave days do I have left?",
    "What's the travel reimbursement policy?",
    "Show me the health benefits summary",
    "When is the next company holiday?",
  ],
  knowledge: [
    "Find docs about the onboarding process",
    "Search for API documentation",
    "What's our brand guidelines?",
    "Show release notes for v2.2",
  ],
  sales: [
    "Show pipeline summary for Q1",
    "List deals closing this month",
    "What's our win rate trend?",
    "Show top accounts by revenue",
  ],
};

export const aiConversationHistory: Array<{ role: "user" | "assistant"; message: string }> = [
  { role: "user", message: "What's my workload this week?" },
  { role: "assistant", message: "You have **5 tasks** due this week:\n\n• **P1** Review Q1 roadmap priorities (Today, 9 AM)\n• **P1** Send stakeholder update email (Today, 5 PM)\n• **P2** Prepare sprint planning deck (Today, 11 AM)\n• **P2** 1:1 with design lead (Today, 2 PM)\n• **P3** Update feature specs for v2.3 (Today, 4 PM)\n\nYour workload is at **78% capacity**. Would you like me to reschedule any lower-priority items?" },
];

// --- Calendar mini data ---
export const calendarEvents = [
  { date: 25, hasEvents: true, count: 3 },
  { date: 26, hasEvents: true, count: 1 },
  { date: 27, hasEvents: true, count: 2 },
  { date: 28, hasEvents: false, count: 0 },
];
