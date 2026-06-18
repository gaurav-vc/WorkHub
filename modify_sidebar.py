import re

with open(r"c:\Users\MC VIP\OneDrive\Documents\project\frontend\src\pages\CalendarMeetings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add activeSidebarBookingTab
state_to_add = '  const [activeBookingTab, setActiveBookingTab] = useState<"task" | "event" | "meeting">("task");\n  const [activeSidebarBookingTab, setActiveSidebarBookingTab] = useState<"event" | "meeting" | "task">("event");'
content = content.replace('  const [activeBookingTab, setActiveBookingTab] = useState<"task" | "event" | "meeting">("task");', state_to_add)


sidebar_start_marker = r'\{\/\* COMPREHENSIVE SIDEBAR: ADD EVENT SYSTEM \*\/\}'
sidebar_end_marker = r'\{\/\* Unified Calendar Day Click Booking Modal \*\/\}'

match = re.search(f"({sidebar_start_marker}.*?)(\n\\s*{sidebar_end_marker})", content, re.DOTALL)
if not match:
    print("Could not find sidebar section.")
    exit(1)

sidebar_content = match.group(1)

# Modify sidebar_content to introduce tabs
header_pattern = r'<CardHeader.*?<\/CardHeader>'
new_header = """<CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-blue-600" /> Book
                </CardTitle>
                <div className="flex bg-slate-200 p-0.5 rounded-md border border-slate-300 w-fit">
                  <button 
                    type="button" 
                    onClick={() => setActiveSidebarBookingTab("event")}
                    className={cn("px-2 py-1 rounded text-[10px] font-bold transition-all", activeSidebarBookingTab === "event" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    Event
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveSidebarBookingTab("meeting")}
                    className={cn("px-2 py-1 rounded text-[10px] font-bold transition-all", activeSidebarBookingTab === "meeting" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    Meeting
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveSidebarBookingTab("task")}
                    className={cn("px-2 py-1 rounded text-[10px] font-bold transition-all", activeSidebarBookingTab === "task" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    Task
                  </button>
                </div>
              </div>
            </CardHeader>"""

sidebar_content = re.sub(header_pattern, new_header, sidebar_content, flags=re.DOTALL)

# Wrap the existing form in {activeSidebarBookingTab === "event" && ( ... )}
form_pattern = r'(<form onSubmit=\{handleCreateEvent\}.*?<\/form>)'
def wrap_event_form(m):
    return f"{{activeSidebarBookingTab === 'event' && (\n{m.group(1)}\n              )}}"

sidebar_content = re.sub(form_pattern, wrap_event_form, sidebar_content, flags=re.DOTALL)

# Now append Meeting and Task forms inside CardContent just after the Event form
task_form_light = """
              {activeSidebarBookingTab === 'task' && (
                <form onSubmit={handleCreateTaskBooking} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task Topic</label>
                    <Input required placeholder="Task title..." value={taskTopic} onChange={e => setTaskTopic(e.target.value)} className="h-9 text-xs bg-white border-slate-200 shadow-sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className="w-full justify-start text-left font-normal h-9 px-2 text-[11px] bg-white border-slate-200 shadow-sm overflow-hidden whitespace-nowrap">
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{taskDate ? format(new Date(taskDate + 'T12:00:00'), "PP") : "Select"}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarUI mode="single" selected={taskDate ? new Date(taskDate + 'T12:00:00') : undefined} onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              setTaskDate(`${yyyy}-${mm}-${dd}`);
                            }
                          }} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</label>
                      <Select value={taskTime} onValueChange={setTaskTime}>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 shadow-sm font-medium"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea placeholder="Description..." value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="w-full min-h-[80px] text-xs p-2 rounded-md bg-white border border-slate-200 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assign To</label>
                    <Select value={taskAssigneeId} onValueChange={setTaskAssigneeId}>
                      <SelectTrigger className="h-9 text-xs bg-white border-slate-200 shadow-sm"><SelectValue placeholder="Assign To" /></SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white h-10 mt-4 shadow-sm rounded-lg transition-all active:scale-[0.98]">
                    Create Task
                  </Button>
                </form>
              )}
"""

meeting_form_light = """
              {activeSidebarBookingTab === 'meeting' && (
                <form onSubmit={handleCreateMeeting} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meeting Topic</label>
                    <Input required placeholder="E.g., Sync up" value={meetingTopic} onChange={e => setMeetingTopic(e.target.value)} className="h-9 text-xs bg-white border-slate-200 shadow-sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className="w-full justify-start text-left font-normal h-9 px-2 text-[11px] bg-white border-slate-200 shadow-sm overflow-hidden whitespace-nowrap">
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{meetingDate ? format(new Date(meetingDate + 'T12:00:00'), "PP") : "Select"}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarUI mode="single" selected={meetingDate ? new Date(meetingDate + 'T12:00:00') : undefined} onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              setMeetingDate(`${yyyy}-${mm}-${dd}`);
                            }
                          }} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</label>
                      <Select value={meetingTime} onValueChange={setMeetingTime}>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 shadow-sm font-medium"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">{timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea placeholder="Description..." value={meetingDesc} onChange={e => setMeetingDesc(e.target.value)} className="w-full min-h-[60px] text-xs p-2 rounded-md bg-white border border-slate-200 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meeting Link</label>
                    <Input placeholder="https://..." value={meetingLink} onChange={e => setMeetingLink(e.target.value)} className="h-9 text-xs bg-white border-slate-200 shadow-sm" />
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-md p-2 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recurring Meeting</label>
                      <Switch checked={meetingRepeat} onCheckedChange={setMeetingRepeat} className="scale-75 origin-right" />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white h-10 mt-4 shadow-sm rounded-lg transition-all active:scale-[0.98]">
                    Schedule Meeting
                  </Button>
                </form>
              )}
"""

# Inject new forms before `</CardContent>`
sidebar_content = sidebar_content.replace('</CardContent>', task_form_light + meeting_form_light + '            </CardContent>')

new_content = content.replace(match.group(1), sidebar_content)

with open(r"c:\Users\MC VIP\OneDrive\Documents\project\frontend\src\pages\CalendarMeetings.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Modification complete.")
