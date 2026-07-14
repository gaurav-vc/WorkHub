import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Video, Mic, Loader2, Save, FileText, CheckSquare, 
  ChevronRight, CalendarDays, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { API_BASE } from "@/config";

export default function AIMeeting() {
  const { token } = useAuth();
  
  const [meetings, setMeetings] = useState<any[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<any>(null);
  
  const [transcript, setTranscript] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // 1. Fetch Existing Meetings from Legacy API
  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${API_BASE}/calendar/events/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out "tasks" that are mapped to events
        const actualMeetings = data.filter((m: any) => !m.is_task);
        setMeetings(actualMeetings);
        if (actualMeetings.length > 0 && !currentMeeting) {
          selectMeeting(actualMeetings[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load meetings", err);
    }
  };

  useEffect(() => {
    if (token) fetchMeetings();
  }, [token]);

  // 2. Meeting Switcher
  const selectMeeting = (meeting: any) => {
    setCurrentMeeting(meeting);
    setTranscript("");
  };

  // 3. AI Gateway Integration (Hits ai_agents API)
  const invokeAIGateway = async (action: string) => {
    if (!transcript.trim()) {
      toast.warning("Please paste a meeting transcript first!");
      return;
    }
    if (!currentMeeting) {
      toast.warning("Please select a meeting from the sidebar!");
      return;
    }
    
    setIsAiProcessing(true);
    toast.info(`AI is analyzing transcript...`);
    
    try {
      const res = await fetch(`${API_BASE}/ai_agents/agents/invoke/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          agent: "meeting",
          action: action,
          document_content: transcript
        })
      });

      if (!res.ok) throw new Error("AI Gateway failed");
      const data = await res.json();
      
      // Append AI result to the meeting's description
      const prefix = action === 'summarize_meeting' ? '**AI Executive Summary:**\n' : '**AI Action Items:**\n';
      const newDescription = `${currentMeeting.description || ""}\n\n${prefix}${data.response}`;
      
      await saveMeetingDescription(newDescription);
      
      // Update local state
      const updatedMeeting = { ...currentMeeting, description: newDescription };
      setCurrentMeeting(updatedMeeting);
      setMeetings(meetings.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
      
      toast.success("Insights saved to meeting notes!");
      setTranscript("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to AI Gateway");
    } finally {
      setIsAiProcessing(false);
    }
  };

  // 4. Save to Legacy Calendar API
  const saveMeetingDescription = async (newDesc: string) => {
    try {
      await fetch(`${API_BASE}/calendar/events/${currentMeeting.id}/update/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ description: newDesc })
      });
    } catch (err) {
      console.error("Autosave failed", err);
      toast.error("Failed to update meeting description in calendar.");
    }
  };

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 bg-slate-50/50">
      {/* Sidebar: Meetings List */}
      <div className="hidden md:flex flex-col w-72 shrink-0 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-purple-600" />
            My Meetings
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {meetings.map(meeting => (
              <div 
                key={meeting.id}
                onClick={() => selectMeeting(meeting)}
                className={`p-3 text-sm rounded-md cursor-pointer border transition-colors ${
                  currentMeeting?.id === meeting.id ? "bg-purple-600/10 border-purple-200 text-purple-900" : "bg-white border-transparent hover:border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="font-medium truncate">{meeting.title}</div>
                <div className="text-[10px] opacity-70 mt-1 flex items-center justify-between">
                  <span>{new Date(meeting.meeting_time).toLocaleDateString()}</span>
                  <span>{meeting.duration}</span>
                </div>
              </div>
            ))}
            {meetings.length === 0 && (
              <div className="text-sm text-slate-500 text-center p-4">No meetings found.</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Editor */}
      <Card className="flex-1 flex flex-col shadow-sm border border-slate-200 bg-white overflow-hidden">
        
        {/* Editor Toolbar */}
        <div className="p-4 border-b border-border bg-slate-50/50">
          <h2 className="font-bold text-xl text-slate-800">
            {currentMeeting ? currentMeeting.title : "Select a meeting"}
          </h2>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
            {currentMeeting && (
              <>
                <span><strong className="text-slate-700">Time:</strong> {new Date(currentMeeting.meeting_time).toLocaleString()}</span>
                <span><strong className="text-slate-700">Type:</strong> {currentMeeting.meeting_type}</span>
                <span><strong className="text-slate-700">Attendees:</strong> {currentMeeting.attendees}</span>
              </>
            )}
          </div>
        </div>

        {/* Notes/Summary Display */}
        <div className="flex-1 overflow-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x border-b">
          
          {/* Legacy Description View */}
          <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0 bg-slate-50/30">
            <div className="p-3 bg-slate-100/80 border-b text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-3 w-3" /> Meeting Notes & AI Insights
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap font-sans">
                {currentMeeting?.description || <span className="text-slate-400 italic">No notes or insights attached yet. Paste a transcript and generate insights!</span>}
              </div>
            </ScrollArea>
          </div>

          {/* Transcript Input Area */}
          <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0 bg-white">
            <div className="p-3 bg-purple-50/50 border-b border-purple-100 text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-2">
              <Mic className="h-3 w-3" /> Paste Transcript
            </div>
            <textarea
              className="flex-1 w-full p-4 resize-none outline-none text-sm text-slate-700 placeholder-slate-400 bg-transparent"
              placeholder="Paste raw meeting transcript or rough notes here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={isAiProcessing || !currentMeeting}
            />
          </div>
        </div>

        {/* AI Action Bar */}
        <div className="px-4 py-3 bg-white flex items-center justify-between gap-2 overflow-x-auto">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 shrink-0">
            <Sparkles className="h-3 w-3 mr-1" /> AI Meeting Tools
          </Badge>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-purple-50 hover:text-purple-700" onClick={() => invokeAIGateway('summarize_meeting')} disabled={isAiProcessing || !transcript.trim() || !currentMeeting}>
              <FileText className="h-3 w-3 mr-1.5" /> Generate Summary
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-purple-50 hover:text-purple-700" onClick={() => invokeAIGateway('extract_action_items')} disabled={isAiProcessing || !transcript.trim() || !currentMeeting}>
              <CheckSquare className="h-3 w-3 mr-1.5" /> Extract Action Items
            </Button>
          </div>
          
          {isAiProcessing && <div className="flex items-center text-xs text-purple-600 font-medium ml-auto shrink-0"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing Transcript...</div>}
        </div>

      </Card>
    </div>
  );
}
