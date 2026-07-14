import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

import { API_BASE } from "@/config";

interface AddCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function AddCertificateModal({ isOpen, onClose, onSuccess, initialData }: AddCertificateModalProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [titleText, setTitleText] = useState("Certificate of Completion");
  const [bodyText, setBodyText] = useState("This certifies that {{employee_name}} has successfully completed the course.");
  
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  
  const [sigImageFile, setSigImageFile] = useState<File | null>(null);
  const [sigImagePreview, setSigImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setTitleText(initialData?.title_text || "Certificate of Completion");
      setBodyText(initialData?.body_text || "This certifies that {{employee_name}} has successfully completed the course.");
      setBgImagePreview(initialData?.background_image || null);
      setSigImagePreview(initialData?.signature_image || null);
      setBgImageFile(null);
      setSigImageFile(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!name) {
      toast.error("Please provide a template name");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('title_text', titleText);
      formData.append('body_text', bodyText);
      
      if (bgImageFile) formData.append('background_image', bgImageFile);
      if (sigImageFile) formData.append('signature_image', sigImageFile);

      const method = initialData ? 'PATCH' : 'POST';
      const url = initialData 
        ? `${API_BASE}/learning_center/certificates/${initialData.id}/` 
        : `${API_BASE}/learning_center/certificates/`;

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error("Failed to save certificate template");

      toast.success(initialData ? "Template updated!" : "Template created!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-slate-50 flex flex-col md:flex-row h-[80vh]">
        {/* Left Side - Form Controls */}
        <div className="w-full md:w-1/3 bg-white border-r border-slate-200 p-6 overflow-y-auto flex flex-col">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-bold text-slate-800">
              {initialData ? "Edit Template" : "New Certificate"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 flex-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Template Name</label>
              <Input placeholder="e.g. Standard Completion" value={name} onChange={e => setName(e.target.value)} className="bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Certificate Title</label>
              <Input placeholder="Certificate of Completion" value={titleText} onChange={e => setTitleText(e.target.value)} className="bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Body Text</label>
              <p className="text-[10px] text-slate-400">Use {'{{employee_name}}'} or {'{{course_title}}'} as placeholders.</p>
              <Textarea 
                className="bg-slate-50 h-24 resize-none" 
                value={bodyText} 
                onChange={e => setBodyText(e.target.value)} 
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Background Image</label>
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 relative transition-colors cursor-pointer">
                <UploadCloud className="h-6 w-6 text-slate-400 mb-1" />
                <span className="text-xs text-slate-500 font-medium text-center">Click to upload template</span>
                <Input 
                  type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setBgImageFile(e.target.files[0]);
                      const reader = new FileReader();
                      reader.onload = ev => setBgImagePreview(ev.target?.result as string);
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                />
              </div>
              {bgImagePreview && <Button variant="ghost" size="sm" className="text-xs text-red-500 h-6 px-2 mt-1" onClick={() => {setBgImagePreview(null); setBgImageFile(null)}}>Remove background</Button>}
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signature Image (Optional)</label>
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-3 flex flex-col items-center justify-center bg-slate-50 relative transition-colors cursor-pointer">
                <span className="text-xs text-slate-500 font-medium">Upload Signature</span>
                <Input 
                  type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setSigImageFile(e.target.files[0]);
                      const reader = new FileReader();
                      reader.onload = ev => setSigImagePreview(ev.target?.result as string);
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                />
              </div>
              {sigImagePreview && <Button variant="ghost" size="sm" className="text-xs text-red-500 h-6 px-2 mt-1" onClick={() => {setSigImagePreview(null); setSigImageFile(null)}}>Remove signature</Button>}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>

        {/* Right Side - Live Preview */}
        <div className="w-full md:w-2/3 bg-slate-100 p-8 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-[800px] aspect-[1.414/1] bg-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-12 text-center border border-slate-200" style={{ backgroundImage: bgImagePreview ? `url(${bgImagePreview})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            
            {/* Dark overlay if no background to make it look like a placeholder, or slight overlay for readability if needed. For now, trust the user's template. */}
            {!bgImagePreview && (
              <div className="absolute inset-0 border-[16px] border-indigo-900/10 m-4 pointer-events-none"></div>
            )}

            <div className="relative z-10 w-full max-w-2xl bg-white/80 backdrop-blur-sm p-10 rounded-xl shadow-lg border border-white/50">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
                {titleText || "Certificate of Completion"}
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto font-medium" style={{ fontFamily: 'Georgia, serif' }}>
                {bodyText.replace('{{employee_name}}', 'John Doe').replace('{{course_title}}', 'Advanced React Patterns')}
              </p>

              <div className="flex justify-between items-end mt-12 px-8">
                <div className="text-center">
                  <div className="w-40 border-b-2 border-slate-400 mb-2 h-16 flex items-end justify-center pb-2">
                    {/* Date */}
                    <span className="font-serif italic text-slate-700">{new Date().toLocaleDateString()}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date</span>
                </div>

                <div className="text-center">
                  <div className="w-40 border-b-2 border-slate-400 mb-2 h-16 flex items-end justify-center pb-1 relative">
                    {sigImagePreview && (
                      <img src={sigImagePreview} alt="Signature" className="absolute bottom-1 max-h-14 max-w-full object-contain" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
