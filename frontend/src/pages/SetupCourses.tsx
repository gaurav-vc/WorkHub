import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Eye, CheckCircle, XCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AddCourseModal from "./AddCourseModal";
import VideoSettingsModal from "./VideoSettingsModal";

import { getCourses, getAccessRequests, updateAccessRequest } from "@/api/learning";

export default function SetupCourses() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVideoSettingsOpen, setIsVideoSettingsOpen] = useState(false);
  const [editCourseData, setEditCourseData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all-requests");
  const [viewMode, setViewMode] = useState<'requests' | 'courses'>('requests');

  const fetchCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    try {
      const data = await getAccessRequests();
      setAccessRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCourses();
      await fetchRequests();
      setLoading(false);
    };
    loadData();
  }, [token]);

  const updateRequestStatus = async (id: number, status: string) => {
    try {
      await updateAccessRequest(id.toString(), status);
      toast.success(`Request ${status.toLowerCase()} successfully`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="flex items-center text-emerald-600"><span className="h-3 w-3 rounded-full bg-emerald-500 mr-2"></span> Approved</span>;
      case 'Pending':
        return <span className="flex items-center text-amber-500"><span className="h-3 w-3 rounded-full bg-amber-400 mr-2"></span> Pending</span>;
      case 'Rejected':
        return <span className="flex items-center text-red-500"><span className="h-3 w-3 rounded-full bg-red-500 mr-2"></span> Rejected</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const renderRequestsTable = (status: string | 'all') => {
    const filtered = status === 'all' 
      ? accessRequests 
      : accessRequests.filter(req => req.status === status);
    
    if (filtered.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500">
          No {status.toLowerCase()} requests found.
        </div>
      );
    }

    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-200/50 text-slate-600 border-b border-slate-200">
              <th className="py-4 px-6 font-medium w-32">Action</th>
              <th className="py-4 px-6 font-medium">Employee Name</th>
              <th className="py-4 px-6 font-medium">Course Title</th>
              <th className="py-4 px-6 font-medium">Date Requested</th>
              <th className="py-4 px-6 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => (
              <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6">
                  {req.status === 'Pending' ? (
                    <div className="flex items-center gap-3">
                      <button 
                        className="text-emerald-500 hover:text-emerald-700 transition-colors tooltip-trigger"
                        title="Approve"
                        onClick={() => updateRequestStatus(req.id, 'Approved')}
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button 
                        className="text-red-500 hover:text-red-700 transition-colors tooltip-trigger"
                        title="Reject"
                        onClick={() => updateRequestStatus(req.id, 'Rejected')}
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Done</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                      <img src={`https://ui-avatars.com/api/?name=${req.employee_name}&background=random`} alt={req.employee_name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-slate-600 font-medium">{req.employee_name}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <p className="font-semibold text-slate-700">{req.course_title}</p>
                </td>
                <td className="py-4 px-6 text-slate-500">
                  {new Date(req.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-6">
                  {getStatusBadge(req.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCoursesTable = () => {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-200/50 text-slate-600 border-b border-slate-200">
              <th className="py-4 px-6 font-medium w-32">Action</th>
              <th className="py-4 px-6 font-medium">Course Title</th>
              <th className="py-4 px-6 font-medium">Employee Name</th>
              <th className="py-4 px-6 font-medium">Date Created</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3 text-slate-500">
                    <button 
                      className="hover:text-slate-800 transition-colors tooltip-trigger"
                      title="Edit Course"
                      onClick={() => {
                        setEditCourseData(course);
                        setIsAddModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      className="hover:text-slate-800 transition-colors tooltip-trigger"
                      title="Preview Course"
                      onClick={() => navigate(`/collaboration/learning/preview/${course.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <img src={course.image || `https://ui-avatars.com/api/?name=${course.title}&background=random`} alt={course.title} className="w-10 h-10 rounded-md object-cover" />
                    <p className="font-semibold text-slate-700">{course.title}</p>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                      <img src={`https://ui-avatars.com/api/?name=${course.employee_name || 'Admin'}&background=random`} alt={course.employee_name || 'Admin'} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-slate-600 font-medium">{course.employee_name || 'Admin'}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-slate-500">
                  {new Date(course.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">No courses available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {viewMode === 'requests' ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Course Management</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Manage courses and review access requests</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input placeholder="Search..." className="pl-9 h-9 pr-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary w-[200px]" />
              </div>
              <Button size="sm" className="h-9 text-sm" onClick={() => { setEditCourseData(null); setIsAddModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Course
              </Button>
              <Button size="sm" variant="outline" className="h-9 text-sm" onClick={() => setViewMode('courses')}>
                <Edit className="h-4 w-4 mr-1.5" /> Manage Courses
              </Button>
              <Button size="sm" variant="outline" className="h-9 text-sm" onClick={() => setIsVideoSettingsOpen(true)}>
                <Settings2 className="h-4 w-4 mr-1.5" /> Settings
              </Button>
            </div>
          </div>

          {/* Sub Tabs */}
          <div className="border-b border-border mb-4">
            <TabsList className="bg-transparent p-0 h-auto gap-4 justify-start">
              {[['all-requests', 'All Requests'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
                <TabsTrigger
                  key={val}
                  value={val}
                  className="relative px-1 py-2.5 text-sm font-medium rounded-none border-b-2 border-transparent bg-transparent text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary hover:text-foreground transition-all"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Box Area */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-white border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-700">
                Access Requests
              </h2>
            </div>
            
            <TabsContent value="all-requests" className="m-0 border-0 p-0">
              {renderRequestsTable('all')}
            </TabsContent>
            
            <TabsContent value="pending" className="m-0 border-0 p-0">
              {renderRequestsTable('Pending')}
            </TabsContent>
            
            <TabsContent value="approved" className="m-0 border-0 p-0">
              {renderRequestsTable('Approved')}
            </TabsContent>
            
            <TabsContent value="rejected" className="m-0 border-0 p-0">
              {renderRequestsTable('Rejected')}
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <div className="w-full">
          {/* Toolbar for Courses Mode */}
          <div className="flex gap-3 mt-4 md:mt-0 mb-6 border-b border-slate-200 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search courses..." className="pl-9 w-[250px] bg-white border-slate-200" />
            </div>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => { setEditCourseData(null); setIsAddModalOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Courses
            </Button>
            <Button 
              variant="outline"
              className="border-slate-300 text-slate-700"
              onClick={() => setViewMode('requests')}
            >
              Back to Requests
            </Button>
            <Button 
              variant="outline"
              className="border-slate-300 text-slate-700 ml-auto"
              onClick={() => setIsVideoSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4 mr-2" /> Video Settings
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-white border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-700">Course Library</h2>
            </div>
            {renderCoursesTable()}
          </div>
        </div>
      )}
      
      <AddCourseModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchCourses}
        initialData={editCourseData}
      />

      <VideoSettingsModal 
        isOpen={isVideoSettingsOpen} 
        onClose={() => setIsVideoSettingsOpen(false)} 
      />
    </div>
  );
}
