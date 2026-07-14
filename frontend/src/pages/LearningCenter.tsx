import React, { useState, useEffect } from "react";
import { BookOpen, Search, Clock, Star, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import MyCertificates from "./MyCertificates";

import { getCourses } from "@/api/learning";

export default function LearningCenter() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);

  const categories = [
    { label: "All", count: courses.length },
    { label: "Development", count: courses.filter(c => c.category === "Development").length },
    { label: "Design", count: courses.filter(c => c.category === "Design").length },
    { label: "Accounting", count: courses.filter(c => c.category === "Accounting").length },
    { label: "Finance", count: courses.filter(c => c.category === "Finance").length },
    { label: "Photography", count: courses.filter(c => c.category === "Photography").length },
    { label: "Other", count: courses.filter(c => !["Development", "Design", "Accounting", "Finance", "Photography"].includes(c.category)).length },
  ];

  const courseStatuses = [
    "New Courses",
    "Applied Courses",
    "Awaiting Approval",
    "Approved",
    "Started",
    "Rejected",
  ];

  const priceLevels = ["All", "Free", "Paid"];

  const isCourseFree = (course: any) => {
    const numericPrice = parseFloat(course.price);
    if (!isNaN(numericPrice) && numericPrice > 0) {
      return false;
    }
    return course.is_free === true || course.price_level === "Free" || numericPrice === 0 || course.price === null || course.price === undefined;
  };

  const filteredCourses = courses.filter(course => {
    const catMatch = selectedCategories.length === 0 || selectedCategories.includes("All") || selectedCategories.includes(course.category || "Other");
    const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(course.status || "New Courses");
    
    const isFree = isCourseFree(course);
    const priceMatch = selectedPrices.length === 0 || selectedPrices.includes("All") || 
      (selectedPrices.includes("Free") && isFree) ||
      (selectedPrices.includes("Paid") && !isFree);
    
    return catMatch && statusMatch && priceMatch;
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const data = await getCourses();
        setCourses(data);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchCourses();
    }
  }, [token]);

  return (
    <div className="flex flex-col h-full w-full p-6 bg-slate-50 overflow-hidden">
      <Tabs defaultValue="courses" className="h-full flex flex-col">
        {/* Header Area */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Learning Center</h1>
            <p className="text-slate-500 text-sm">Explore courses and manage your certificates.</p>
          </div>
          <div className="flex items-center gap-4">
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="certificates">My Certificates</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              <span className="text-slate-600 font-medium text-sm">Current Level :</span>
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 px-3 py-0.5 rounded-full border-indigo-200 font-semibold">
                Level 3
              </Badge>
            </div>
          </div>
        </div>

        <TabsContent value="courses" className="flex-1 mt-0 data-[state=active]:flex flex-col">

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
        {/* Main Content - Courses Grid */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-white p-12 text-center">
              <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Courses Found</h3>
              <p className="text-slate-500 max-w-sm">
                No courses match your selected filters. Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <div 
                  key={course.id} 
                  onClick={() => navigate(`/learning/course/${course.id}`)}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
                >
                  <div className="h-40 overflow-hidden relative bg-slate-100">
                    <img src={course.image || `https://ui-avatars.com/api/?name=${course.title}&background=random`} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-semibold text-slate-700">New</div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-slate-800 line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{course.highlights?.split('\n')[0] || "Explore this course"}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-600">
                      <span className="flex items-center text-amber-500 font-medium"><Star className="h-3 w-3 mr-1 fill-amber-500"/>{course.rating}/5.0</span>
                      <span className="text-slate-400">•</span>
                      <span>{course.enrolled || "0"} Enrolled</span>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100">
                        <img src={`https://ui-avatars.com/api/?name=${course.employee_name || 'Admin'}&background=random`} alt={course.employee_name || 'Admin'} />
                      </div>
                      <span className="text-xs font-medium text-slate-600">By {course.employee_name || 'Admin'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar Filters */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pb-10 pr-2">
          {/* Category Filter */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Category</h3>
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`cat-${cat.label}`} 
                      className="rounded-full data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      checked={selectedCategories.includes(cat.label) || (selectedCategories.length === 0 && cat.label === 'All')}
                      onCheckedChange={(checked) => {
                        if (cat.label === 'All') {
                          setSelectedCategories(checked ? [] : []);
                        } else {
                          setSelectedCategories(prev => {
                            const newCats = prev.filter(c => c !== 'All');
                            return checked ? [...newCats, cat.label] : newCats.filter(c => c !== cat.label);
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={`cat-${cat.label}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600 cursor-pointer"
                    >
                      {cat.label}
                    </label>
                  </div>
                  <span className="text-xs font-medium text-slate-400">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Course Status Filter */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Course Status</h3>
            <div className="space-y-3">
              {courseStatuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`status-${status}`} 
                    className="rounded-full data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={(checked) => {
                      setSelectedStatuses(prev => 
                        checked ? [...prev, status] : prev.filter(s => s !== status)
                      );
                    }}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600 cursor-pointer"
                  >
                    {status}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Price Level Filter */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Price Level</h3>
            <div className="space-y-3">
              {priceLevels.map((price) => (
                <div key={price} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`price-${price}`} 
                    className="rounded-full data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    checked={selectedPrices.includes(price) || (selectedPrices.length === 0 && price === 'All')}
                    onCheckedChange={(checked) => {
                      if (price === 'All') {
                        setSelectedPrices(checked ? [] : []);
                      } else {
                        setSelectedPrices(prev => {
                          const newPrices = prev.filter(p => p !== 'All');
                          return checked ? [...newPrices, price] : newPrices.filter(p => p !== price);
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor={`price-${price}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600 cursor-pointer"
                  >
                    {price}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
        </TabsContent>

        <TabsContent value="certificates" className="flex-1 mt-0 h-full">
          <MyCertificates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
