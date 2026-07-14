import { useState, useEffect } from "react";
import {
  Hash,
  Send,
  Smile,
  Paperclip,
  MessageCircle,
  Search,
  Plus,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getChatChannels, getAllUsersChannels, getChatMessages, sendChatMessage, createChannel, addMemberToChannel } from "@/api/collaboration";
import { toast } from "sonner";

export default function TeamChat() {
  const { token } = useAuth();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showChannels, setShowChannels] = useState(true);
  const [channelSearch, setChannelSearch] = useState("");

  const [chatChannels, setChatChannels] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({});
  
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");

  const [showAddMember, setShowAddMember] = useState(false);
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>("");

  const fetchChannels = async () => {
    if (token) {
      try {
        const data = await getChatChannels();
        const channels = data.results || data;
        setChatChannels(channels);
        if (channels.length > 0 && !activeChannel) {
          setActiveChannel(channels[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchChannels();
    
    if (token) {
      getAllUsersChannels()
        .then(setGlobalUsers)
        .catch(console.error);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !activeChannel) return;
    
    const fetchMessages = async () => {
      try {
        const data = await getChatMessages(activeChannel.toString());
        setChatMessages(prev => ({ ...prev, [activeChannel]: data.results || data }));
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds for real-time feel
    return () => clearInterval(interval);
  }, [token, activeChannel]);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChannel) return;
    try {
      await sendChatMessage(activeChannel.toString(), message.trim());
      setMessage("");
      // Optimistically fetch messages immediately
      const msgs = await getChatMessages(activeChannel.toString());
      setChatMessages(prev => ({ ...prev, [activeChannel]: msgs.results || msgs }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      await createChannel(newChannelName.trim(), "public"); // default to public for now
      setShowCreateChannel(false);
      setNewChannelName("");
      setNewChannelDesc("");
      fetchChannels();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserToAdd || !activeChannel) return;
    try {
      await addMemberToChannel(activeChannel.toString(), selectedUserToAdd);
      setShowAddMember(false);
      setSelectedUserToAdd("");
      toast.success("Member added!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add member");
    }
  };

  const channel = chatChannels.find((c) => c.id === activeChannel) || { name: "Loading...", description: "" };
  const messages = activeChannel ? (chatMessages[activeChannel] || []) : [];

  return (
    <div className="h-[calc(100vh-8rem)] flex animate-fade-in">
      {/* Channel List */}
      <div className={cn(
        "w-64 shrink-0 border-r border-border bg-card flex flex-col rounded-l-lg",
        showChannels ? "block" : "hidden md:block"
      )}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-sm text-foreground">Channels</h2>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowCreateChannel(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search channels..." 
              className="pl-8 h-8 text-xs" 
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {chatChannels.filter(c => (c?.name || "").toLowerCase().includes(channelSearch.toLowerCase())).map((ch) => (
              <button
                key={ch.id}
                onClick={() => { setActiveChannel(ch.id); setShowChannels(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors text-left",
                  activeChannel === ch.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{ch.name}</span>
                {ch.unread > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 text-[10px] gradient-primary text-primary-foreground border-0">
                    {ch.unread}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-card rounded-r-lg">
        {/* Channel Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <button className="md:hidden" onClick={() => setShowChannels(true)}>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </button>
          <Hash className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{channel.name}</h3>
            <p className="text-[11px] text-muted-foreground">{channel.description}</p>
          </div>
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground h-7" onClick={() => setShowAddMember(true)}>
            <Users className="h-3.5 w-3.5" />
            <span>Add Member</span>
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3 group">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {msg.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">{msg.user}</span>
                    <span className="text-[11px] text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">{msg.content || msg.message}</p>
                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.reactions.map((r, i) => (
                        <button
                          key={i}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs hover:bg-muted/80 transition-colors border border-border"
                        >
                          <span>{r.emoji}</span>
                          <span className="text-muted-foreground">{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Thread indicator */}
                  {msg.replies && msg.replies > 0 && (
                    <button className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline">
                      <MessageCircle className="h-3 w-3" />
                      {msg.replies} replies
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder={`Message #${channel.name}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
              <Smile className="h-4 w-4" />
            </Button>
            <Button onClick={handleSendMessage} size="icon" className="h-8 w-8 shrink-0 gradient-primary text-primary-foreground">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Create Channel Modal */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Channel Name</label>
              <Input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="e.g. general" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} placeholder="Optional description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateChannel(false)}>Cancel</Button>
            <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Member to #{channel.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUserToAdd} onValueChange={setSelectedUserToAdd}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member..." />
                </SelectTrigger>
                <SelectContent>
                  {globalUsers.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={!selectedUserToAdd}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
