import { useState, useEffect } from "react";
import { Search, Plus, ChevronDown, CheckSquare, Calendar as CalendarIcon, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useAuth } from "@/context/AuthContext";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { useTaskContext } from "@/context/TaskContext";

export function TopBar() {
  const { username, role, logout } = useAuth();
  const navigate = useNavigate();
  const { tasks, addTask } = useTaskContext();
  
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  // Get initials from username
  const initials = username ? username.substring(0, 2).toUpperCase() : "U";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowSearch((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 gap-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="hidden sm:flex items-center relative max-w-sm">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search anything…"
            readOnly
            onClick={() => setShowSearch(true)}
            className="pl-9 h-9 w-64 bg-secondary/50 border-0 focus-visible:ring-1 cursor-pointer"
          />
          <kbd className="absolute right-2.5 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 rounded-lg shadow-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowCreateTask(true)} className="cursor-pointer">
              <CheckSquare className="mr-2 h-4 w-4 text-primary" />
              <span>New Task</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/tasks/calendar")} className="cursor-pointer">
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              <span>New Meeting</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/tasks/projects")} className="cursor-pointer">
              <Briefcase className="mr-2 h-4 w-4 text-primary" />
              <span>New Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationPanel />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 pl-2 border-l cursor-pointer hover:bg-muted/50 p-1.5 rounded-lg transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-medium leading-tight">{username || "User"}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{role || "Member"}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Global Modals */}
      <CommandDialog open={showSearch} onOpenChange={setShowSearch}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => { setShowSearch(false); navigate("/tasks/my-day"); }}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>My Tasks</span>
            </CommandItem>
            <CommandItem onSelect={() => { setShowSearch(false); navigate("/tasks/calendar"); }}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>Calendar</span>
            </CommandItem>
            <CommandItem onSelect={() => { setShowSearch(false); navigate("/tasks/projects"); }}>
              <Briefcase className="mr-2 h-4 w-4" />
              <span>Projects</span>
            </CommandItem>
          </CommandGroup>
          {tasks && tasks.length > 0 && (
            <CommandGroup heading="Recent Tasks">
              {tasks.slice(0, 5).map(t => (
                <CommandItem key={t.id} onSelect={() => { setShowSearch(false); navigate("/tasks/my-day"); }}>
                  <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <CreateTaskModal 
        open={showCreateTask} 
        onOpenChange={setShowCreateTask}
        onSubmit={async (t) => { 
          await addTask(t); 
          setShowCreateTask(false); 
        }}
      />
    </header>
  );
}
