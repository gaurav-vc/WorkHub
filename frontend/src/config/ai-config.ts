export const aiAgents = [
  { id: "task", name: "Task Manager", description: "Helps organize your daily to-dos and schedule." },
  { id: "hr", name: "HR Assistant", description: "Answers questions about leave, policies, and approvals." },
  { id: "knowledge", name: "Knowledge Base", description: "Searches documentation and engineering standards." },
  { id: "sales", name: "Sales Copilot", description: "Provides insights on leads and pipeline updates." },
];

export const aiSuggestedPrompts: Record<string, string[]> = {
  task: ["What are my tasks for today?", "Do I have any meetings coming up?", "Prioritize my workload."],
  hr: ["What is my current leave balance?", "Do I have pending approvals?", "Summarize the remote work policy."],
  knowledge: ["Find the API documentation.", "What are our coding standards?", "How do I deploy?"],
  sales: ["Show me my new leads.", "Draft a follow-up email for a client.", "What deals are closing soon?"],
};
