import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EditCoursesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: any[];
  onEditCourse: (course: any) => void;
}

export default function EditCoursesListModal({ isOpen, onClose, courses, onEditCourse }: EditCoursesListModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white">
        <DialogHeader className="bg-slate-50 p-4 border-b border-slate-200 text-center relative">
          <DialogTitle className="text-xl font-semibold text-slate-700">Course Library</DialogTitle>
        </DialogHeader>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-200/50 text-slate-600 border-b border-slate-200">
                <th className="py-4 px-6 font-medium w-24">Action</th>
                <th className="py-4 px-6 font-medium">Course Title</th>
                <th className="py-4 px-6 font-medium">Employee</th>
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
                          onEditCourse(course);
                          onClose();
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        className="hover:text-slate-800 transition-colors tooltip-trigger"
                        title="Preview Course"
                        onClick={() => {
                          navigate(`/collaboration/learning/preview/${course.id}`);
                          onClose();
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <img src={course.image || `https://ui-avatars.com/api/?name=${course.title}&background=random`} alt={course.title} className="w-10 h-10 rounded-md object-cover" />
                      <div>
                        <p className="font-semibold text-slate-700">{course.title}</p>
                        <p className="text-sm text-slate-500">{new Date(course.created_at).toLocaleDateString()}</p>
                      </div>
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
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500">No courses available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
