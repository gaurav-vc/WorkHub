import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAIAssistantPage = location.pathname === "/ai/assistant";
  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(location.pathname);

  if (isAuthPage) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 relative">{children}</main>
        
        {/* Global AI Chatbot Floating Button */}
        {!isAIAssistantPage && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle">
            <Button
              onClick={() => navigate("/ai/assistant")}
              className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:scale-105 transition-all p-0 flex items-center justify-center border-[3px] border-white/20"
              title="Open AI Assistant"
            >
              <Bot className="h-6 w-6 text-white" />
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
              <Sparkles className="absolute -top-3 -left-2 h-4 w-4 text-yellow-400 animate-pulse delay-150" />
            </Button>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
