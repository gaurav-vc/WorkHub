import React, { useState, useEffect } from "react";
import { Star, Users, BarChart, Clock, Globe, BookOpen, ShieldCheck, PlayCircle, Award, CheckCircle2, FileText, ChevronDown, Plus, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import CourseVideoPlayer from "./CourseVideoPlayer";
import FinalAssessment from "./FinalAssessment";

import { API_BASE } from "@/config";

export default function CoursePreview() {
  const { id: courseId } = useParams();
  const { token, portalType, role, username } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{url: string, id: number} | null>(null);
  const [progressMap, setProgressMap] = useState<Record<number, boolean>>({});
  const [showFinalAssessment, setShowFinalAssessment] = useState(false);
  
  // Simulated logged-in employee name
  const employeeName = username || "Current User";

  const fetchProgress = async () => {
    try {
      const progRes = await fetch(`${API_BASE}/learning_center/video_progress/?employee_name=${encodeURIComponent(employeeName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (progRes.ok) {
        const progData = await progRes.json();
        const pMap: Record<number, boolean> = {};
        progData.forEach((p: any) => pMap[p.course_point] = p.is_completed);
        setProgressMap(pMap);
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`${API_BASE}/learning_center/courses/${courseId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setCourse(data);
          
          // Fetch access status
          const reqRes = await fetch(`${API_BASE}/learning_center/access_requests/?course=${courseId}&employee_name=${employeeName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (reqRes.ok) {
            const reqData = await reqRes.json();
            if (reqData.length > 0) {
              setAccessStatus(reqData[0].status);
            }
          }
          await fetchProgress();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId, token, employeeName]);

  const handleRequestAccess = async () => {
    setRequesting(true);
    try {
      const res = await fetch(`${API_BASE}/learning_center/access_requests/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course: courseId,
          employee_name: employeeName,
          status: 'Pending'
        })
      });
      if (res.ok) {
        setAccessStatus('Pending');
        toast.success("Access request sent to admin!");
      }
    } catch (err) {
      toast.error("Failed to request access");
    } finally {
      setRequesting(false);
    }
  };

  const hasAccess = portalType === 'site_admin' || portalType === 'super_user' || role === 'admin' || accessStatus === 'Approved';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500">Loading course details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white">
        <p className="text-slate-500">Course not found.</p>
      </div>
    );
  }

  // Parse lists from text blocks
  const parseList = (text: string) => text ? text.split('\n').filter(i => i.trim() !== '') : [];

  const highlights = parseList(course.highlights);
  const learningOutcomes = parseList(course.learning_outcomes);
  const targetAudience = parseList(course.target_audience);
  const requirements = parseList(course.requirements);

  const flatPoints = course.topics ? course.topics.flatMap((t: any) => t.points) : [];
  const getIsLocked = (pointId: number) => {
    // Admin bypass
    if (portalType === 'site_admin' || portalType === 'super_user' || role === 'admin') return false;
    
    const idx = flatPoints.findIndex((p: any) => p.id === pointId);
    if (idx <= 0) return false; // First video is always unlocked
    const prevPoint = flatPoints[idx - 1];
    return !progressMap[prevPoint.id];
  };

  const isAllCompleted = flatPoints.length > 0 && flatPoints.every((p: any) => progressMap[p.id]);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url; 
  };

  const handleAssessmentPassed = () => {
    toast.success("Assessment Passed! Certificate unlocked.", { icon: <Award className="h-5 w-5 text-emerald-500" /> });
    // In a full system, you would unlock the certificate in the UI here.
  };

  if (showFinalAssessment) {
    return (
      <FinalAssessment 
        courseId={course.id} 
        employeeName={employeeName} 
        onClose={() => setShowFinalAssessment(false)} 
        onPassed={handleAssessmentPassed}
      />
    );
  }

  return (
     <div className="flex flex-col h-full w-full p-6 bg-white overflow-y-auto">
        {/* Header */}
        <div className="mb-6 space-y-3 pb-4 border-b border-slate-100">
           <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
           {course.image && (
             <img src={course.image} alt={course.title} className="w-full h-64 object-cover rounded-lg my-4" />
           )}
           <p className="text-slate-500 text-lg font-medium">{course.highlights ? highlights[0] : "Explore this amazing course!"}</p>
           <div className="flex items-center gap-5 text-sm text-slate-600 flex-wrap pt-1">
             <span className="flex items-center font-semibold text-slate-700">
               <Star className="h-4 w-4 mr-1 text-amber-500 fill-amber-500"/> {course.rating}/5.0
             </span>
             <span className="flex items-center">
               <Users className="h-4 w-4 mr-1.5 text-red-400"/> {course.reviews_count * 10} Enrolled
             </span>
             <span className="flex items-center">
               <BarChart className="h-4 w-4 mr-1.5 text-emerald-500"/> {course.course_level || "All levels"}
             </span>
             <span className="flex items-center">
               <Clock className="h-4 w-4 mr-1.5 text-red-400"/> Last updated {new Date(course.updated_at).toLocaleDateString()}
             </span>
             <span className="flex items-center">
               <Globe className="h-4 w-4 mr-1.5 text-slate-700"/> {course.language}
             </span>
           </div>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-8">
           {/* Left Main Content */}
           <div className="flex-1">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 rounded-none p-0 mb-6 gap-2 flex-wrap h-auto">
                  <TabsTrigger 
                    value="description" 
                    className="data-[state=active]:bg-[#7893c4] data-[state=active]:text-white rounded-t-md px-6 py-2.5 text-slate-500 bg-white border border-slate-200 border-b-0 font-medium hover:bg-slate-50"
                  >
                    Description
                  </TabsTrigger>
                  <TabsTrigger 
                    value="curriculum" 
                    className="data-[state=active]:bg-[#7893c4] data-[state=active]:text-white rounded-t-md px-6 py-2.5 text-slate-500 bg-white border border-slate-200 border-b-0 font-medium hover:bg-slate-50"
                  >
                    Curriculum
                  </TabsTrigger>
                  <TabsTrigger 
                    value="instructor" 
                    className="data-[state=active]:bg-[#7893c4] data-[state=active]:text-white rounded-t-md px-6 py-2.5 text-slate-500 bg-white border border-slate-200 border-b-0 font-medium hover:bg-slate-50"
                  >
                    Employee
                  </TabsTrigger>
                  <TabsTrigger 
                    value="faqs" 
                    className="data-[state=active]:bg-[#7893c4] data-[state=active]:text-white rounded-t-md px-6 py-2.5 text-slate-500 bg-white border border-slate-200 border-b-0 font-medium hover:bg-slate-50"
                  >
                    FAQs
                  </TabsTrigger>
                </TabsList>
                
                {/* 1. Description Tab */}
                <TabsContent value="description" className="m-0 border border-slate-200 rounded-b-md rounded-tr-md p-6 bg-white shadow-sm">
                  <div className="space-y-6 text-slate-600 text-sm">
                    <div className="space-y-1">
                      <p>Duration: {course.course_duration || "Self-Paced"}</p>
                      <p>Format: Online</p>
                    </div>

                    {highlights.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-slate-800 text-base mb-2">Course Highlights:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {highlights.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}

                    {learningOutcomes.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-slate-800 text-base mb-2">Key Learning Outcomes:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {learningOutcomes.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}

                    {targetAudience.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-slate-800 text-base mb-2">Target Audience:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {targetAudience.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* 2. Curriculum Tab */}
                <TabsContent value="curriculum" className="m-0 border border-slate-200 rounded-b-md rounded-tr-md overflow-hidden bg-white shadow-sm relative">
                  {!hasAccess && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                      <Lock className="h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Curriculum is Locked</h3>
                      <p className="text-slate-600 mb-6 max-w-md">You need to request permission from the admin to access the curriculum and video content for this course.</p>
                      
                      {accessStatus === 'Pending' ? (
                        <Button disabled className="bg-amber-500 text-white">Request Pending</Button>
                      ) : accessStatus === 'Rejected' ? (
                        <Button disabled className="bg-red-500 text-white">Access Rejected</Button>
                      ) : (
                        <Button onClick={handleRequestAccess} disabled={requesting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                          {requesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Request Access
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-50 border-b border-slate-200 p-3 text-center">
                    <h2 className="text-base font-semibold text-slate-700">Course content</h2>
                  </div>
                  
                  {course.topics && course.topics.length > 0 ? course.topics.map((topic: any) => (
                    <div key={topic.id}>
                      <div className="bg-slate-200/50 p-2 text-center text-sm font-medium text-slate-600 border-t border-slate-200">
                        {topic.title}
                      </div>
                      <div className="p-4 flex flex-wrap gap-4 bg-slate-50/50">
                        {topic.points && topic.points.map((point: any) => {
                          const isLocked = getIsLocked(point.id);
                          const isCompleted = progressMap[point.id];

                          return (
                            <div key={point.id} className={`bg-white border ${isCompleted ? 'border-emerald-300 shadow-emerald-100' : 'border-slate-200'} rounded-md p-3 w-40 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all ${isLocked ? 'opacity-70 grayscale-[30%]' : 'hover:shadow-md'}`}>
                              <div className="flex items-start gap-2">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                ) : isLocked ? (
                                  <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                ) : (
                                  <PlayCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                                )}
                                <span className={`text-xs font-medium ${isLocked ? 'text-slate-400' : 'text-slate-700'}`}>{point.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 text-right mt-2">{point.time || "-"}</div>
                              
                              {point.video_link && (
                                isLocked ? (
                                  <div className="text-[10px] text-slate-400 text-right mt-1 font-medium flex justify-end items-center gap-1">
                                    <Lock className="h-3 w-3" /> Locked
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setPlayingVideo({url: point.video_link, id: point.id})}
                                    className="text-[10px] text-indigo-600 text-right hover:underline font-semibold mt-1 focus:outline-none"
                                  >
                                    {isCompleted ? 'Watch Again' : 'Watch Video'}
                                  </button>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-500">No curriculum provided.</div>
                  )}

                  {/* Final Assessment Section */}
                  <div className="mt-8 border-t border-slate-200 pt-8 flex flex-col items-center text-center pb-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border border-indigo-100">
                      <Award className="h-8 w-8 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Final Assessment</h3>
                    <p className="text-slate-500 mb-4 max-w-md">Complete all course videos and quizzes to unlock the final assessment. Passing the assessment will grant you the course certificate.</p>
                    
                    {(isAllCompleted || hasAccess) && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4 mb-6 max-w-lg text-left">
                        <strong className="block mb-2 text-amber-900">⚠️ Assessment Rules:</strong>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>You will have <strong>30 minutes</strong> to complete the exam.</li>
                          <li>Each question has a strict <strong>60-second timer</strong>.</li>
                          <li>The assessment must be taken in <strong>Full-Screen mode</strong>.</li>
                          <li>Switching tabs or exiting full-screen will result in warnings, and eventually automatic failure.</li>
                        </ul>
                      </div>
                    )}

                    <Button 
                      disabled={!isAllCompleted && !hasAccess}
                      onClick={() => setShowFinalAssessment(true)}
                      className={`px-8 py-6 text-lg font-bold rounded-xl transition-all ${isAllCompleted || hasAccess ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                    >
                      {isAllCompleted || hasAccess ? 'Start Final Assessment' : 'Locked (Finish Curriculum First)'}
                    </Button>
                  </div>
                </TabsContent>

                {/* 3. Instructor Tab */}
                <TabsContent value="instructor" className="m-0 border border-slate-200 rounded-b-md rounded-tr-md p-6 bg-white shadow-sm">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      <img src={`https://ui-avatars.com/api/?name=${course.employee_name || 'Admin'}&background=random`} alt={course.employee_name} className="w-full h-full object-cover"/>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg">{course.employee_name || "Admin"}</h3>
                      <div className="space-y-1 text-sm text-slate-600 mt-1">
                        <div className="flex items-center gap-2"><Star className="h-3 w-3 text-amber-500 fill-amber-500"/> {course.rating}/5.0</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {course.employee_name} is the designated creator/instructor for this course.
                  </p>
                </TabsContent>

                {/* 5. FAQs Tab */}
                <TabsContent value="faqs" className="m-0 border border-slate-200 rounded-b-md rounded-tr-md p-6 bg-white shadow-sm">
                  <div className="space-y-3">
                    {course.faqs && course.faqs.length > 0 ? course.faqs.map((faq: any) => (
                      <div key={faq.id} className="border border-slate-200 rounded-md p-4 flex flex-col gap-2 transition-colors">
                        <div className="flex justify-between items-center cursor-pointer">
                          <span className="text-sm font-semibold text-slate-700">{faq.question}</span>
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-600 mt-2 pl-2 border-l-2 border-slate-200">{faq.answer}</p>
                      </div>
                    )) : (
                      <div className="text-center text-slate-500">No FAQs provided.</div>
                    )}
                  </div>
                </TabsContent>

              </Tabs>
           </div>
           
           {/* Right Sidebar Content */}
           <div className="w-full xl:w-[340px] flex-shrink-0 space-y-6">
             {/* Info Box */}
             <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
               <h3 className="text-slate-500 font-medium mb-3">This course includes</h3>
               <p className="text-2xl font-bold text-slate-800 mb-5">{course.price_level || "Free"}</p>
               <div className="space-y-4 text-xs font-medium text-slate-600">
                 <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                   <span className="flex items-center gap-3"><BookOpen className="h-4 w-4 text-slate-400"/> Lectures</span>
                   <span className="text-slate-500 font-normal">{course.total_lectures || "0"}</span>
                 </div>
                 <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                   <span className="flex items-center gap-3"><Clock className="h-4 w-4 text-slate-400"/> Duration</span>
                   <span className="text-slate-500 font-normal">{course.course_duration || "Self-Paced"}</span>
                 </div>
                 <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                   <span className="flex items-center gap-3"><BarChart className="h-4 w-4 text-slate-400"/> Skills</span>
                   <span className="text-slate-500 font-normal">All User</span>
                 </div>
                 <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                   <span className="flex items-center gap-3"><Globe className="h-4 w-4 text-slate-400"/> Language</span>
                   <span className="text-slate-500 font-normal">{course.language}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="flex items-center gap-3"><Award className="h-4 w-4 text-slate-400"/> Certificate</span>
                   <span className="text-slate-500 font-normal">Yes</span>
                 </div>
               </div>
             </div>
             
             {/* Requirements Box */}
             {requirements.length > 0 && (
               <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm">
                 <h3 className="text-slate-800 font-semibold mb-5 text-center">Requirements</h3>
                 <ol className="list-decimal pl-4 space-y-3 text-[13px] text-slate-500">
                   {requirements.map((item: string, i: number) => (
                     <li key={i}>{item}</li>
                   ))}
                 </ol>
               </div>
             )}
           </div>
        </div>

        {/* Inline Video Player Modal */}
        <Dialog open={!!playingVideo} onOpenChange={(open) => {
          if (!open) {
            setPlayingVideo(null);
            fetchProgress(); // Refetch progress to unlock next point
          }
        }}>
          <DialogContent className="max-w-[100vw] w-screen h-[100dvh] m-0 p-0 overflow-hidden bg-black border-none rounded-none flex flex-col [&>button]:text-white [&>button]:right-6 [&>button]:top-6 [&>button]:h-8 [&>button]:w-8 [&>button>svg]:h-8 [&>button>svg]:w-8">
            {playingVideo && (
              <CourseVideoPlayer 
                videoUrl={playingVideo.url} 
                coursePointId={playingVideo.id} 
                employeeName={employeeName} 
                onClose={() => {
                  setPlayingVideo(null);
                  fetchProgress();
                }} 
              />
            )}
          </DialogContent>
        </Dialog>
     </div>
  );
}
