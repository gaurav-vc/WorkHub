import React, { useState, useEffect, useRef } from "react";
import { Award, Loader2, ArrowLeft, Download, Maximize2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

import { API_BASE } from "@/config";
import { MEDIA_BASE } from "@/config";

interface Certificate {
  id: number;
  course_id: number;
  course_title: string;
  score: number;
  date: string;
  template: any;
}

export default function MyCertificates() {
  const navigate = useNavigate();
  const { token, username } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/learning_center/assessments/my_certificates/?employee_name=${encodeURIComponent(username || '')}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setCertificates(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchCertificates();
    }
  }, [token, username]);

  return (
    <div className="flex flex-col h-full w-full p-6 bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/learning')} className="rounded-full hover:bg-slate-200">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Certificates</h1>
          <p className="text-slate-500 text-sm">View and download your earned certificates.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-white p-12 text-center max-w-2xl mx-auto w-full">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Award className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Certificates Yet</h3>
          <p className="text-slate-500 max-w-sm">
            You haven't earned any certificates. Complete courses and pass the final assessments to earn certificates.
          </p>
          <Button onClick={() => navigate('/learning')} className="mt-6 bg-indigo-600 text-white hover:bg-indigo-700">
            Explore Courses
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {certificates.map(cert => (
            <div 
              key={cert.id} 
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col cursor-pointer"
              onClick={() => setSelectedCert(cert)}
            >
              <div className="aspect-[4/3] relative bg-slate-100 flex items-center justify-center p-4">
                {cert.template?.background_image ? (
                  <img 
                    src={`${MEDIA_BASE}${cert.template.background_image}`} 
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                    alt="Certificate Background" 
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-100" />
                )}
                
                <div className="relative z-10 text-center flex flex-col items-center p-6 border-4 border-double border-indigo-200 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm w-full h-full">
                  <Award className="h-10 w-10 text-amber-500 mb-2" />
                  <h3 className="font-serif text-lg font-bold text-slate-800 line-clamp-2 leading-tight">
                    {cert.course_title}
                  </h3>
                  <div className="mt-auto">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                      {cert.template?.title_text || 'Certificate of Completion'}
                    </p>
                  </div>
                </div>
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                    <Maximize2 className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-1 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 line-clamp-1">{cert.course_title}</h4>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-slate-500 flex items-center">
                    Score: <strong className="ml-1 text-slate-700">{cert.score.toFixed(1)}%</strong>
                  </span>
                  <span className="text-slate-500">
                    {new Date(cert.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Certificate Details</h3>
                <p className="text-xs text-slate-500">Earned on {new Date(selectedCert.date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Download button could be implemented here */}
                <Button variant="ghost" size="icon" onClick={() => setSelectedCert(null)} className="rounded-full hover:bg-slate-200">
                  <X className="h-5 w-5 text-slate-600" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-slate-100 flex items-center justify-center">
              {/* Actual Certificate Rendering */}
              <div 
                className="relative bg-white shadow-xl overflow-hidden flex flex-col items-center text-center w-full aspect-[1.414/1] max-w-[800px]"
                style={{ 
                  backgroundImage: selectedCert.template?.background_image ? `url(${MEDIA_BASE}${selectedCert.template.background_image})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!selectedCert.template?.background_image && (
                  <div className="absolute inset-0 border-[12px] border-double border-slate-200 m-8" />
                )}
                
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12 lg:p-20 bg-white/70 backdrop-blur-sm">
                  <Award className="h-20 w-20 text-amber-500 mb-6" />
                  
                  <h1 className="text-4xl lg:text-5xl font-serif font-bold text-slate-800 mb-8 tracking-wide uppercase">
                    {selectedCert.template?.title_text || 'Certificate of Completion'}
                  </h1>
                  
                  <p className="text-lg lg:text-xl text-slate-600 max-w-2xl leading-relaxed mb-10 font-medium">
                    {selectedCert.template?.body_text
                      ? selectedCert.template.body_text
                          .replace('{{employee_name}}', username || 'Student')
                          .replace('{{course_title}}', selectedCert.course_title)
                      : `This certifies that ${username || 'Student'} has successfully completed the course ${selectedCert.course_title}.`
                    }
                  </p>
                  
                  <div className="mt-auto pt-10 w-full flex justify-between items-end">
                    <div className="flex flex-col items-center">
                      <div className="w-40 border-b-2 border-slate-800 pb-2 mb-2 text-center text-sm font-bold text-slate-800">
                        {new Date(selectedCert.date).toLocaleDateString()}
                      </div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Date</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="w-48 h-16 flex items-end justify-center border-b-2 border-slate-800 pb-2 mb-2">
                        {selectedCert.template?.signature_image ? (
                          <img 
                            src={`${MEDIA_BASE}${selectedCert.template.signature_image}`} 
                            alt="Signature" 
                            className="max-h-full object-contain"
                          />
                        ) : (
                          <span className="font-signature text-3xl text-slate-800 italic">Director</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Signature</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
