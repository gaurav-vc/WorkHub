import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash, FileBadge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import AddCertificateModal from "./AddCertificateModal"; // Force TS refresh

import { getCertificates, deleteCertificate as deleteCertificateApi } from "@/api/learning";

export default function SetupCertificates() {
  const { token } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const data = await getCertificates();
      setCertificates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this certificate template?")) return;
    try {
      await deleteCertificateApi(id.toString());
      toast.success("Certificate template deleted!");
      fetchCertificates();
    } catch (err) {
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileBadge className="h-4 w-4 text-primary" /> Certificate Templates
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage global and course-specific certificate templates</p>
        </div>
        <Button
          size="sm"
          className="h-9 text-sm"
          onClick={() => { setEditData(null); setIsModalOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map(cert => (
          <div key={cert.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center">
              {cert.background_image ? (
                <img src={cert.background_image} alt={cert.name} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <FileBadge className="h-12 w-12 text-slate-300" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
              <h3 className="absolute bottom-4 left-4 text-white font-bold text-lg drop-shadow-md">{cert.name}</h3>
            </div>
            <div className="p-4 bg-white flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500">{cert.title_text}</span>
              <div className="flex items-center gap-2">
                <button 
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  onClick={() => { setEditData(cert); setIsModalOpen(true); }}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  onClick={() => handleDelete(cert.id)}
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {certificates.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <FileBadge className="h-10 w-10 mx-auto text-slate-400 mb-3" />
            <p>No certificate templates found.</p>
            <Button variant="link" className="text-indigo-600 mt-2" onClick={() => setIsModalOpen(true)}>Create one now</Button>
          </div>
        )}
      </div>

      <AddCertificateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCertificates}
        initialData={editData}
      />
    </div>
  );
}
