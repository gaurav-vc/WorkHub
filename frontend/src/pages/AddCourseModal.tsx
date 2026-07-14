import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash, Plus, UploadCloud, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

import { API_BASE } from "@/config";

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
}

export default function AddCourseModal({ isOpen, onClose, onSuccess, initialData }: AddCourseModalProps) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuizPoint, setActiveQuizPoint] = useState<{tId: number, pId: number} | null>(null);

  // Step 1 State
  const [title, setTitle] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [language, setLanguage] = useState("");
  const [courseLevel, setCourseLevel] = useState("");
  const [totalLectures, setTotalLectures] = useState("");
  const [courseDuration, setCourseDuration] = useState("");
  const [priceLevel, setPriceLevel] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Step 2 State
  const [highlights, setHighlights] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [requirements, setRequirements] = useState("");

  // Step 3 State
  const [topics, setTopics] = useState([
    { id: 1, title: "Introduction", points: [{ id: 1, name: "", videoLink: "", time: "", mini_quiz: [] }] }
  ]);

  // Step 4 State
  const [faqs, setFaqs] = useState([
    { id: 1, question: "How does Digital Marketing Work?", answer: "" }
  ]);

  const updatePoint = (topicId: number, pointId: number, field: string, value: any) => {
    setTopics(prev => prev.map(t => t.id === topicId ? {
      ...t,
      points: t.points.map(p => p.id === pointId ? { ...p, [field]: value } : p)
    } : t));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, topicId: number, pointId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info("Uploading video...", { id: `upload-${pointId}` });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/learning_center/uploaded_videos/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        updatePoint(topicId, pointId, "videoLink", data.file);
        toast.success("Video uploaded successfully!", { id: `upload-${pointId}` });
      } else {
        toast.error("Failed to upload video.", { id: `upload-${pointId}` });
      }
    } catch (err) {
      toast.error("An error occurred during upload.", { id: `upload-${pointId}` });
    }
  };

  useEffect(() => {
    if (isOpen && initialData) {
      setStep(1);
      setTitle(initialData.title || "");
      setEmployeeName(initialData.employee_name || "");
      setLanguage(initialData.language || "");
      setCourseLevel(initialData.course_level || "");
      setTotalLectures(initialData.total_lectures?.toString() || "");
      setCourseDuration(initialData.course_duration || "");
      setPriceLevel(initialData.price_level || "");
      setImagePreview(initialData.image || null);
      setImageFile(null);

      setHighlights(initialData.highlights || "");
      setLearningOutcomes(initialData.learning_outcomes || "");
      setTargetAudience(initialData.target_audience || "");
      setRequirements(initialData.requirements || "");

      if (initialData.topics && initialData.topics.length > 0) {
        setTopics(initialData.topics.map((t: any) => ({
          id: t.id || Date.now() + Math.random(),
          title: t.title,
          points: t.points.map((p: any) => ({
            id: p.id || Date.now() + Math.random(),
            name: p.name,
            videoLink: p.video_link,
            time: p.time,
            mini_quiz: p.mini_quiz || []
          }))
        })));
      } else {
        setTopics([{ id: 1, title: "Introduction", points: [{ id: 1, name: "", videoLink: "", time: "", mini_quiz: [] }] }]);
      }

      if (initialData.faqs && initialData.faqs.length > 0) {
        setFaqs(initialData.faqs.map((f: any) => ({
          id: f.id || Date.now() + Math.random(),
          question: f.question,
          answer: f.answer
        })));
      } else {
        setFaqs([{ id: 1, question: "How does Digital Marketing Work?", answer: "" }]);
      }
    } else if (isOpen && !initialData) {
      setStep(1);
      setTitle("");
      setEmployeeName("");
      setLanguage("English");
      setCourseLevel("");
      setTotalLectures("");
      setCourseDuration("");
      setPriceLevel("");
      setImageFile(null);
      setImagePreview(null);
      setHighlights("");
      setLearningOutcomes("");
      setTargetAudience("");
      setRequirements("");
      setTopics([{ id: 1, title: "Introduction", points: [{ id: 1, name: "", videoLink: "", time: "", mini_quiz: [] }] }]);
      setFaqs([{ id: 1, question: "How does Digital Marketing Work?", answer: "" }]);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('employee_name', employeeName);
      formData.append('language', language || "English");
      formData.append('course_level', courseLevel);
      formData.append('total_lectures', totalLectures || "0");
      formData.append('course_duration', courseDuration);
      formData.append('price_level', priceLevel);
      formData.append('status', 'Approved'); 
      
      formData.append('highlights', highlights);
      formData.append('learning_outcomes', learningOutcomes);
      formData.append('target_audience', targetAudience);
      formData.append('requirements', requirements);

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const formattedTopics = topics.map(t => ({
        title: t.title,
        points: t.points.map(p => ({ 
          name: p.name, 
          video_link: p.videoLink, 
          time: p.time,
          mini_quiz: p.mini_quiz || []
        }))
      }));
      formData.append('topics', JSON.stringify(formattedTopics));

      const formattedFaqs = faqs.map(f => ({ question: f.question, answer: f.answer }));
      formData.append('faqs', JSON.stringify(formattedFaqs));

      const method = initialData ? 'PATCH' : 'POST';
      const url = initialData 
        ? `${API_BASE}/learning_center/courses/${initialData.id}/` 
        : `${API_BASE}/learning_center/courses/`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.detail || errData.message || JSON.stringify(errData) || "Failed to save course";
        throw new Error(errMsg);
      }

      toast.success(initialData ? "Course updated successfully!" : "Course created successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save course.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepper = () => {
    const steps = [
      { num: 1, label: "Course Details" },
      { num: 2, label: "Description" },
      { num: 3, label: "Curriculum" },
      { num: 4, label: "FAQs" },
      { num: 5, label: "Assessment" },
    ];

    return (
      <div className="flex items-center justify-center w-full mb-8 relative">
        {steps.map((s, index) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  step === s.num
                    ? "bg-blue-500 text-white border-blue-500 shadow-md"
                    : step > s.num
                    ? "bg-white text-blue-500 border-blue-500"
                    : "bg-white text-slate-400 border-slate-300"
                }`}
              >
                {s.num}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  step >= s.num ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-2 -mt-6 transition-colors ${
                  step > s.num ? "bg-blue-500" : "bg-slate-300"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Course Title:</label>
          <Input placeholder="Enter course title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Employee Name:</label>
          <Input placeholder="Enter employee name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Language:</label>
          <Input placeholder="e.g. English" value={language} onChange={(e) => setLanguage(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Course Level:</label>
          <Input placeholder="e.g. Beginner, All levels" value={courseLevel} onChange={(e) => setCourseLevel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Total Lectures:</label>
          <Input placeholder="e.g. 15" type="number" value={totalLectures} onChange={(e) => setTotalLectures(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Course Duration:</label>
          <Input placeholder="e.g. 10 Hours, 6 Weeks" value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1 md:col-span-1">
          <label className="text-sm font-medium text-slate-500">Price Level:</label>
          <Input placeholder="e.g. Free, ₹ 3000" value={priceLevel} onChange={(e) => setPriceLevel(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1 mt-4">
        <label className="text-sm font-medium text-slate-500">Upload Course Image or Thumbnail:</label>
        <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50/50 relative overflow-hidden transition-colors">
          {imagePreview ? (
            <div className="flex flex-col items-center">
              <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded-md mb-3 shadow-sm border border-slate-200" />
              <Button variant="outline" size="sm" onClick={() => { setImagePreview(null); setImageFile(null); }}>Remove Image</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
              <Input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setImageFile(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <span className="text-slate-500 font-medium">Click or drag image here to upload</span>
              <span className="text-slate-400 text-xs mt-1">Recommended size: 1280x720 (16:9)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Course Highlights:</label>
          <Textarea className="h-24" placeholder="Enter highlights (one per line)" value={highlights} onChange={(e) => setHighlights(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Key Learning Outcomes:</label>
          <Textarea className="h-24" placeholder="Enter outcomes (one per line)" value={learningOutcomes} onChange={(e) => setLearningOutcomes(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Target Audience:</label>
          <Textarea className="h-24" placeholder="Who is this course for? (one per line)" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-500">Requirements:</label>
          <Textarea className="h-24" placeholder="Prerequisites (one per line)" value={requirements} onChange={(e) => setRequirements(e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in max-h-[500px] overflow-y-auto pr-2 pb-10">
      <div className="flex justify-end sticky top-0 bg-white z-10 py-2 border-b border-slate-100 mb-4">
        <Button 
          variant="outline" 
          className="border-slate-300 shadow-sm"
          onClick={() => setTopics([...topics, { id: Date.now(), title: "New Topic", points: [{ id: Date.now(), name: "", videoLink: "", time: "", mini_quiz: [] }] }])}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Topic
        </Button>
      </div>

      {topics.map((topic, tIndex) => (
        <div key={topic.id} className="space-y-4 border border-slate-200 p-5 rounded-lg bg-slate-50/50 shadow-sm">
          <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-4 w-4 bg-slate-400 rounded-sm ml-2"></div>
              <Input 
                value={topic.title}
                onChange={(e) => {
                  const newTopics = [...topics];
                  newTopics[tIndex].title = e.target.value;
                  setTopics(newTopics);
                }}
                className="font-semibold text-lg bg-transparent border-none focus-visible:ring-0 px-0 h-auto"
                placeholder="Topic Title"
              />
            </div>
            {topics.length > 1 && (
              <button 
                className="text-red-400 hover:text-red-600 transition-colors px-3"
                onClick={() => setTopics(topics.filter(t => t.id !== topic.id))}
              >
                <Trash className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="space-y-3 pl-4 border-l-2 border-slate-200 ml-4">
            {topic.points.map((point) => (
              <div key={point.id} className="flex flex-col gap-3 bg-white p-4 border border-slate-200 rounded-md shadow-sm relative group">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-3">
                    <Input 
                      placeholder="Point Title (e.g., Introduction to SEO)" 
                      value={point.name}
                      onChange={(e) => updatePoint(topic.id, point.id, "name", e.target.value)}
                      className="bg-slate-50 border-slate-200"
                    />
                    <div className="flex gap-3">
                      <div className="flex-1 flex gap-2">
                        <Input 
                          placeholder="Video Link (YouTube or URL)" 
                          value={point.videoLink}
                          onChange={(e) => updatePoint(topic.id, point.id, "videoLink", e.target.value)}
                          className="bg-slate-50 border-slate-200"
                        />
                        <div className="relative">
                          <input 
                            type="file"
                            accept="video/mp4,video/x-m4v,video/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="Upload MP4"
                            onChange={(e) => handleVideoUpload(e, topic.id, point.id)}
                          />
                          <Button type="button" variant="outline" className="border-slate-300 text-slate-700 pointer-events-none">
                            <Video className="h-4 w-4 mr-2 text-indigo-500" /> Upload
                          </Button>
                        </div>
                      </div>
                      <Input 
                        placeholder="Time (e.g., 5m 30s)" 
                        value={point.time}
                        onChange={(e) => updatePoint(topic.id, point.id, "time", e.target.value)}
                        className="w-32 bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>
                  <button 
                    className="text-red-400 hover:text-red-600 transition-colors p-2"
                    onClick={() => {
                      setTopics(prev => prev.map(t => t.id === topic.id ? {
                        ...t,
                        points: t.points.filter(p => p.id !== point.id)
                      } : t));
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-2 w-max text-indigo-600 border-indigo-200"
                  onClick={() => setActiveQuizPoint({tId: topic.id, pId: point.id})}
                >
                  Manage Mini-Quiz
                </Button>
              </div>
            ))}

            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="border-slate-300 bg-white shadow-sm"
                onClick={() => {
                  const newTopics = [...topics];
                  newTopics[tIndex].points.push({ id: Date.now(), name: "", videoLink: "", time: "", mini_quiz: [] });
                  setTopics(newTopics);
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Point
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4 animate-fade-in max-h-[500px] overflow-y-auto pr-2 pb-10">
      <div className="flex justify-end sticky top-0 bg-white z-10 py-2 border-b border-slate-100 mb-4">
        <Button 
          variant="outline" 
          className="border-slate-300 shadow-sm"
          onClick={() => setFaqs([...faqs, { id: Date.now(), question: "", answer: "" }])}
        >
          <Plus className="h-4 w-4 mr-2" /> Add FAQs
        </Button>
      </div>
      
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={faq.id} className="border border-slate-200 rounded-md p-5 bg-white relative shadow-sm group">
            <div className="absolute top-4 right-4 flex gap-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                className="hover:text-red-500 transition-colors"
                onClick={() => setFaqs(faqs.filter(f => f.id !== faq.id))}
              >
                <Trash className="h-5 w-5" />
              </button>
            </div>
            
            <div className="pr-10 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Question</label>
                <Input 
                  placeholder="Enter your question here..."
                  className="font-bold text-slate-800 text-lg border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-slate-50"
                  value={faq.question}
                  onChange={(e) => {
                    const newFaqs = [...faqs];
                    newFaqs[index].question = e.target.value;
                    setFaqs(newFaqs);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Answer</label>
                <Textarea 
                  placeholder="Enter the answer..."
                  className="text-slate-600 leading-relaxed min-h-[100px] border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-slate-50 resize-y"
                  value={faq.answer}
                  onChange={(e) => {
                    const newFaqs = [...faqs];
                    newFaqs[index].answer = e.target.value;
                    setFaqs(newFaqs);
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialData?.id) return;
    
    toast.info("Uploading question bank...");
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', initialData.id.toString());
    
    try {
      const res = await fetch(`${API_BASE}/learning_center/question_bank/bulk_upload/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        toast.success("Question bank updated successfully!");
      } else {
        const errData = await res.json();
        toast.error(`Upload failed: ${errData.error || 'Unknown error'}`);
      }
    } catch (e) {
      toast.error("Failed to upload question bank.");
    }
  };

  const renderStep5 = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">Final Assessment Question Bank</h3>
          <p className="text-sm text-blue-600/80 mb-4">
            Upload a CSV containing questions for the final course assessment. 
            The system will randomly select questions from this bank for each employee's exam.
          </p>
          
          {!initialData ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm font-medium">
              You must save this course first before you can upload the Question Bank. Click "Submit Course" below, then edit it to upload questions.
            </div>
          ) : (
            <div className="space-y-4">
              <a 
                href={`data:text/csv;charset=utf-8,question_text,option_a,option_b,option_c,option_d,correct_option%0A"What is 2+2?","1","2","3","4","D"`} 
                download="question_bank_template.csv"
                className="text-sm text-indigo-600 font-semibold hover:underline"
              >
                Download CSV Template
              </a>
              
              <div className="relative">
                <input 
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="w-full border-slate-300 border-dashed py-8 bg-slate-50 hover:bg-slate-100">
                  <UploadCloud className="h-6 w-6 mr-2 text-indigo-500" />
                  <span className="text-slate-600 font-medium">Click to upload Question Bank CSV</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderMiniQuizDialog = () => {
    if (!activeQuizPoint) return null;
    const topic = topics.find(t => t.id === activeQuizPoint.tId);
    const point = topic?.points.find(p => p.id === activeQuizPoint.pId);
    if (!point) return null;

    const qs = point.mini_quiz || [];
    // Ensure 5 questions
    if (qs.length < 5) {
      const needed = 5 - qs.length;
      for (let i = 0; i < needed; i++) {
        qs.push({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "A" });
      }
      // Set the default state invisibly (handled on save)
      point.mini_quiz = qs; 
    }

    const updateQ = (idx: number, field: string, val: string) => {
      const newQs = [...qs];
      newQs[idx] = { ...newQs[idx], [field]: val };
      updatePoint(activeQuizPoint.tId, activeQuizPoint.pId, "mini_quiz", newQs);
    };

    return (
      <Dialog open={!!activeQuizPoint} onOpenChange={() => setActiveQuizPoint(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Mini-Quiz (5 Questions)</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {qs.slice(0, 5).map((q: any, i: number) => (
              <div key={i} className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm space-y-3">
                <h4 className="font-bold text-slate-700">Question {i + 1}</h4>
                <Input placeholder="Question Text" value={q.question_text || ""} onChange={(e) => updateQ(i, 'question_text', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Option A" value={q.option_a || ""} onChange={(e) => updateQ(i, 'option_a', e.target.value)} />
                  <Input placeholder="Option B" value={q.option_b || ""} onChange={(e) => updateQ(i, 'option_b', e.target.value)} />
                  <Input placeholder="Option C" value={q.option_c || ""} onChange={(e) => updateQ(i, 'option_c', e.target.value)} />
                  <Input placeholder="Option D" value={q.option_d || ""} onChange={(e) => updateQ(i, 'option_d', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mr-2">Correct Option:</label>
                  <select 
                    className="border border-slate-200 rounded p-1 text-sm bg-slate-50"
                    value={q.correct_option || "A"} 
                    onChange={(e) => updateQ(i, 'correct_option', e.target.value)}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            ))}
            <Button className="w-full bg-indigo-600 text-white" onClick={() => setActiveQuizPoint(null)}>Save & Close Quiz</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white">
        <DialogHeader className="bg-slate-50 p-4 border-b border-slate-200 text-center relative">
          <DialogTitle className="text-xl font-semibold text-slate-700">
            {initialData ? "Edit Course Details" : step === 1 && "Create Course"}
            {!initialData && step === 2 && "Create Description"}
            {!initialData && step === 3 && "Course Curriculum"}
            {!initialData && step === 4 && "Course FAQs"}
            {!initialData && step === 5 && "Final Assessment"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 md:p-8">
          {renderStepper()}
          
          <div className="min-h-[300px] max-h-[60vh] overflow-y-auto">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
            {step > 1 ? (
              <Button variant="outline" onClick={handlePrev} className="px-8 border-slate-300" disabled={isSubmitting}>
                Previous
              </Button>
            ) : (
              <div></div> // Spacer
            )}
            
            <Button 
              onClick={step === 5 ? handleSubmit : handleNext} 
              variant={step === 5 ? "default" : "outline"}
              className={step === 5 ? "px-10 bg-indigo-600 hover:bg-indigo-700 text-white" : "px-10 border-slate-300"}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 5 ? (isSubmitting ? "Saving..." : (initialData ? "Update Course" : "Submit Course")) : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
      {renderMiniQuizDialog()}
    </Dialog>
  );
}
