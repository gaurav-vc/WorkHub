import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { 
  Calendar, 
  LayoutDashboard, 
  FolderKanban, 
  UserSquare2, 
  Settings, 
  MessageSquare,
  BookOpen,
  Blocks,
  Network
} from "lucide-react";

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/tasks/my-day"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>My Day</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/tasks/projects"))}>
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>Projects</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate("/tasks/timeline"))}>
            <Network className="mr-2 h-4 w-4" />
            <span>Timeline</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/collaboration/boards"))}>
            <Blocks className="mr-2 h-4 w-4" />
            <span>Custom Boards</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/tasks/calendar"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Calendar & Meetings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/hr/directory"))}>
            <UserSquare2 className="mr-2 h-4 w-4" />
            <span>Employee Directory</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/collaboration/chat"))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Team Chat</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/collaboration/wiki"))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Knowledge Base</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Admin Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
