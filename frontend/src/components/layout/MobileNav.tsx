import { useState } from "react";
import { LayoutDashboard, CalendarDays, MessageSquare, Menu, Bot } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navGroups } from "./AppSidebar";
import { useAuth } from "@/context/AuthContext";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { accessRoutes, role, portalType } = useAuth();

  const hasAccess = (url: string) => {
    if (portalType === 'super_user' || role === 'admin' || accessRoutes.length === 0) return true;
    let accessObj = accessRoutes.find((r: any) => r.siteName === url);
    if (!accessObj) {
      accessObj = accessRoutes.find((r: any) => r.siteName !== '/' && url.startsWith(r.siteName));
    }
    if (accessObj) {
      return accessObj.permissions?.view ?? false;
    }
    return true;
  };

  const mainLinks = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Calendar", url: "/tasks/calendar", icon: CalendarDays },
    { title: "Chat", url: "/collaboration/chat", icon: MessageSquare },
    { title: "AI", url: "/ai/assistant", icon: Bot },
  ].filter(link => hasAccess(link.url));

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center justify-around h-16 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {mainLinks.map((link) => {
        const isActive = location.pathname === link.url;
        return (
          <NavLink
            key={link.title}
            to={link.url}
            end={link.url === "/"}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
              isActive ? "text-primary" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <link.icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
            <span className="text-[10px] font-medium">{link.title}</span>
          </NavLink>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center w-16 h-full gap-1 text-slate-500 hover:text-slate-900 transition-colors">
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 overflow-y-auto flex flex-col bg-slate-50">
          <SheetHeader className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 text-left">
            <SheetTitle className="text-lg font-bold">Navigation</SheetTitle>
          </SheetHeader>
          <div className="p-4 flex flex-col gap-6">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter(item => hasAccess(item.url));
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label} className="flex flex-col gap-2">
                  <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-2">
                    {group.label}
                  </h4>
                  <div className="flex flex-col gap-1">
                    {visibleItems.map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <NavLink
                          key={item.title}
                          to={item.url}
                          end={item.url === "/"}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-primary/10 text-primary" 
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
