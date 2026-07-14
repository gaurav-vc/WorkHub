import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/config";
import {
  Search,
  CalendarDays,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isBefore, isAfter, startOfDay } from "date-fns";

interface AttendanceRecord {
  date: string;
  is_present: boolean;
}

interface EmployeeAttendance {
  id: number;
  first_name: string;
  last_name: string;
  email_id: string;
  mobile: string;
  profile_photo: string | null;
  user_type: string;
  vibe_id: string;
  last_login: string;
  attendance_records: AttendanceRecord[];
}

interface Site {
  id: number;
  site_name: string;
}

export default function Attendance() {
  const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAttendance | null>(null);

  const { role, token, portalType } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchTerm, setSearchTerm] = useState("");
  const [department, setDepartment] = useState("All");

  // Admin/Manager tools
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({ employeeId: "", type: "sick", startDate: "", endDate: "", notes: "" });
  
  const isPrivileged = role === "admin" || role === "manager" || role === "hr" || role === "site_admin" || portalType === "site_admin";

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await fetch(`${API_BASE}/organization/sites/`, { headers: { Authorization: `Bearer ${token}` }});
        if (res.ok) {
          const data = await res.json();
          setSites(data);
        }
      } catch (error) {
        console.error("Failed to fetch sites:", error);
      }
    };
    if (isPrivileged) {
      fetchSites();
    }
  }, [isPrivileged, token]);

  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/hr/attendance/summary/`, { headers: { Authorization: `Bearer ${token}` }}
        );
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.results || []);
        }
      } catch (error) {
        console.error("Failed to fetch attendance records:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isPrivileged) {
      fetchAttendance();
    } else {
      setIsLoading(false);
    }
  }, [isPrivileged, token]);

  if (!isPrivileged && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  const filtered = employees.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || emp.email_id.toLowerCase().includes(search.toLowerCase());
  });

  const getTodayStatus = (records: AttendanceRecord[]) => {
    if (!records || records.length === 0) return null;
    // For demo purposes, we get the last record as the most recent/today's status
    const latestRecord = records[records.length - 1];
    return latestRecord;
  };

  const getInitials = (first: string, last: string) => {
    return `${first?.charAt(0) || ""}${last?.charAt(0) || ""}`.toUpperCase();
  };

  const filteredRecords = selectedEmployee?.attendance_records.filter((r) => {
    if (!startDate && !endDate) return true;
    const d = startOfDay(new Date(r.date));
    if (startDate && isBefore(d, startOfDay(startDate))) return false;
    if (endDate && isAfter(d, startOfDay(endDate))) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> Employee Attendance
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor employee check-ins and attendance logs synced with QR Code scans.
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg font-semibold">Attendance Overview</CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {sites.length > 0 && (
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="All Sites" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        {site.site_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Employee</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Latest Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => {
                  const todayStatus = getTodayStatus(emp.attendance_records);
                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border">
                            {emp.profile_photo ? (
                              <AvatarImage src={emp.profile_photo} alt={emp.first_name} className="object-cover" />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials(emp.first_name, emp.last_name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {emp.user_type.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{emp.email_id}</p>
                        <p className="text-xs text-muted-foreground">{emp.mobile}</p>
                      </TableCell>
                      <TableCell>
                        {todayStatus ? (
                          todayStatus.is_present ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 py-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Present
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1.5 py-1">
                              <XCircle className="h-3.5 w-3.5" /> Absent
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">No Data</Badge>
                        )}
                        {todayStatus && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(todayStatus.date).toLocaleDateString()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {emp.last_login ? new Date(emp.last_login).toLocaleDateString() : "Never"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-primary"
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          View Logs <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Employee Details Modal */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => {
        if (!open) {
          setSelectedEmployee(null);
          setStartDate(undefined);
          setEndDate(undefined);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border">
                {selectedEmployee?.profile_photo ? (
                  <AvatarImage src={selectedEmployee.profile_photo} alt={selectedEmployee.first_name} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {getInitials(selectedEmployee?.first_name || "", selectedEmployee?.last_name || "")}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                </h3>
                <p className="text-sm text-muted-foreground font-normal">Attendance History</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Days</p>
                <p className="text-xl font-bold">{filteredRecords.length}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 mb-1">Present</p>
                <p className="text-xl font-bold text-emerald-700">
                  {filteredRecords.filter((r) => r.is_present).length}
                </p>
              </div>
              <div className="bg-rose-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-rose-600 mb-1">Absent</p>
                <p className="text-xl font-bold text-rose-700">
                  {filteredRecords.filter((r) => !r.is_present).length}
                </p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600 mb-1">Attendance %</p>
                <p className="text-xl font-bold text-blue-700">
                  {filteredRecords.length
                    ? Math.round(
                      (filteredRecords.filter((r) => r.is_present).length /
                        filteredRecords.length) *
                      100
                    )
                    : 0}
                  %
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <h4 className="font-semibold text-sm">Detailed Log</h4>
              <div className="flex items-center gap-2">
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      {startDate ? format(startDate, "MMM d, yyyy") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => {
                        setStartDate(d);
                        setStartOpen(false);
                        setEndOpen(true);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-xs">to</span>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      {endDate ? format(endDate, "MMM d, yyyy") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => {
                        setEndDate(d);
                        setEndOpen(false);
                      }}
                      initialFocus
                      disabled={(date) => startDate ? isBefore(date, startDate) : false}
                    />
                  </PopoverContent>
                </Popover>
                {(startDate || endDate) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setStartDate(undefined); setEndDate(undefined); }} title="Clear Filter">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredRecords].reverse().map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {new Date(record.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.is_present ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Present
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20">
                            Absent
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                        No attendance records found for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
