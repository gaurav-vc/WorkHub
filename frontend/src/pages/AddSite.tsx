import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Info, MapPin, CheckSquare, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { API_BASE } from "@/config";


const MODULES_LIST = [
  { id: 'dashboard', label: 'Dashboard', group: 'Core Services' },
  { id: 'my-day', label: 'My Day', group: 'Core Services' },
  { id: 'calendar', label: 'Calendar Meetings', group: 'Core Services' },
  { id: 'projects', label: 'Projects', group: 'Core Services' },
  { id: 'resources', label: 'Resource Planning', group: 'Core Services' },
  { id: 'templates', label: 'Template Marketplace', group: 'Core Services' },
  { id: 'mom', label: 'Minutes of Meeting', group: 'Core Services' },
  { id: 'chat', label: 'Team Chat', group: 'Collaboration' },
  { id: 'docs', label: 'Docs & Notes', group: 'Collaboration' },
  { id: 'wiki', label: 'Knowledge Base', group: 'Collaboration' },
  { id: 'boards', label: 'Custom Boards', group: 'Collaboration' },
  { id: 'pulse', label: 'Company Pulse', group: 'HR Services' },
  { id: 'hr-requests', label: 'HR Requests', group: 'HR Services' },
  { id: 'hr-directory', label: 'Directory', group: 'HR Services' },
  { id: 'hr-attendance', label: 'Attendance', group: 'HR Services' },
  { id: 'hr-recognition', label: 'Recognition', group: 'HR Services' },
  { id: 'hr-policies', label: 'Policies', group: 'HR Services' },
  { id: 'ai-workflows', label: 'Workflow Automation', group: 'AI & Automation' },
  { id: 'ai-insights', label: 'Predictive Insights', group: 'AI & Automation' },
  { id: 'ai-agents', label: 'AI Agents', group: 'AI & Automation' },
];

export default function AddSite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlOrgId = searchParams.get('orgId');
  const { token, portalType } = useAuth();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState(urlOrgId || '');

  const [formData, setFormData] = useState({
    site_name: '',
    site_code: '',
    product_type: '',
    country: '',
    location_address: '',
    activate_date: '',
    status: 'active',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
  });

  const [selectedModules, setSelectedModules] = useState<string[]>(MODULES_LIST.map(m => m.id)); // Default select all
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (portalType === 'super_user') fetchOrganizations();
  }, [portalType, token]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`${API_BASE}/organization/management/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const orgs = await res.json();
        setOrganizations(orgs);
        // If urlOrgId is set but not yet in selectedOrg (just in case), ensure it's selected
        if (urlOrgId && orgs.some((o: any) => String(o.id) === urlOrgId)) {
          setSelectedOrg(urlOrgId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox' && name === 'status') {
      setFormData(prev => ({ ...prev, status: (e.target as HTMLInputElement).checked ? 'active' : 'inactive' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleModuleToggle = (id: string) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSelectAllModules = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedModules(MODULES_LIST.map(m => m.id));
    } else {
      setSelectedModules([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.site_name || !selectedOrg) {
      alert("Site Name and Organization are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        organization: selectedOrg,
        modules_access: selectedModules
      };

      const res = await fetch(`${API_BASE}/organization/sites/`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        navigate(`/admin/sites`);
      } else {
        const err = await res.json();
        console.error("Failed to create site", err);
        alert("Failed to create site. Check console for details.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (portalType !== 'super_user') {
    return <div className="p-10 text-center">Access Denied</div>;
  }

  // Group modules for UI rendering
  const modulesByGroup = MODULES_LIST.reduce((acc: any, module) => {
    if (!acc[module.group]) acc[module.group] = [];
    acc[module.group].push(module);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#fafafa] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#f0f3ff] to-transparent pointer-events-none" />

      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8 relative z-10">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/50 shadow-sm">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl border-slate-200">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Add Site / Project</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Create a new operational site and configure module access.</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-12">
            
            {/* Site Details */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Site Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Organization <span className="text-red-500">*</span></label>
                  <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)} required disabled={!!urlOrgId} className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Site Name <span className="text-red-500">*</span></label>
                  <Input name="site_name" value={formData.site_name} onChange={handleInputChange} placeholder="e.g., Corporate HQ" required className="h-12 bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Site Code</label>
                  <Input name="site_code" value={formData.site_code} onChange={handleInputChange} placeholder="e.g., CHQ-001" className="h-12 bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Select Product Type</label>
                  <select name="product_type" value={formData.product_type} onChange={handleInputChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm">
                    <option value="">Select a product type</option>
                    <option value="Vibecopilot">Vibecopilot</option>
                    <option value="Custom">Custom HRMS</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Country</label>
                  <Input name="country" value={formData.country} onChange={handleInputChange} placeholder="Select or type country" className="h-12 bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Location Address</label>
                  <textarea name="location_address" value={formData.location_address} onChange={handleInputChange} placeholder="Enter full address..." className="w-full min-h-[100px] border border-slate-200 bg-slate-50/50 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Activate Date</label>
                  <Input type="date" name="activate_date" value={formData.activate_date} onChange={handleInputChange} className="h-12 bg-slate-50/50 rounded-xl text-slate-700" />
                </div>
                <div className="space-y-3 flex flex-col justify-center pl-4">
                  <label className="text-sm font-bold text-slate-700">Status Active</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="status" checked={formData.status === 'active'} onChange={handleInputChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Contact Person */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Info className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Contact Person</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Full Name</label>
                  <Input name="contact_name" value={formData.contact_name} onChange={handleInputChange} placeholder="John Doe" className="h-12 bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Phone Number</label>
                  <Input name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} placeholder="+1 (555) 123-4567" className="h-12 bg-slate-50/50 rounded-xl" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Email Address</label>
                  <Input type="email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} placeholder="john.doe@example.com" className="h-12 bg-slate-50/50 rounded-xl" />
                </div>
              </div>
            </section>

            {/* Module Access */}
            <section className="space-y-6 bg-slate-50/50 p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Module Access</h3>
                    <p className="text-sm text-slate-500 font-medium">Manage which modules are active for this site.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-sm font-bold text-slate-700">Select All</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={selectedModules.length === MODULES_LIST.length}
                      onChange={handleSelectAllModules}
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-8">
                {Object.keys(modulesByGroup).map((group, gIdx) => (
                  <div key={group} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h4 className="text-sm font-bold text-slate-900 bg-white px-4 py-1.5 rounded-lg shadow-sm border border-slate-200 inline-block">{group}</h4>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modulesByGroup[group].map((mod: any) => {
                        const isSelected = selectedModules.includes(mod.id);
                        return (
                          <div 
                            key={mod.id} 
                            onClick={() => handleModuleToggle(mod.id)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-100' 
                                : 'bg-white/60 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                              }`}>
                                <CheckSquare className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {mod.label}
                                </h5>
                                <span className={`text-[11px] font-medium ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                                  {isSelected ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={isSelected}
                                onChange={() => handleModuleToggle(mod.id)}
                              />
                              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer Actions */}
            <div className="pt-8 border-t border-slate-200 flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="w-32 h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-600">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="w-48 h-12 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105">
                {isSubmitting ? 'Saving...' : 'Create Site'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
