import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, Edit2, Mail, CheckCircle2, XCircle, Search, ChevronLeft, Calendar, FileText, Settings, UserCircle, Globe, MapPin, Receipt, Clock, Info, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

import { getOrganizationManagement, createOrUpdateOrganizationManagement } from "@/api/hr";
import { apiClient } from "@/api/client";

type ViewState = 'list' | 'create' | 'edit' | 'detail';

export function OrganizationManagement() {
  const navigate = useNavigate();
  const { token, portalType } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>('list');
  const [currentOrg, setCurrentOrg] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    entity: '',
    site_location: '',
    country: '',
    region: '',
    state: '',
    city: '',
    zone: '',
    white_label: false,
    sub_domain: '',
    solution_type: '',
    solution_for: '',
    billing_term: '',
    rate_of_billing: '',
    billing_cycle: '',
    start_date: '',
    project_duration: '',
    end_date: '',
    billing_date: '',
    status: 'active',
  });

  useEffect(() => {
    if (portalType === 'super_user') {
      fetchOrganizations();
    } else {
      setLoading(false);
    }
  }, [portalType, token]);

  const fetchOrganizations = async () => {
    try {
      const data = await getOrganizationManagement();
      setOrganizations(data);
    } catch (e) {
      console.error("Failed to fetch organizations", e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDeleteOrganization = async (id: number) => {
    if (!window.confirm("Are you sure you want to completely remove this organization? This action cannot be undone.")) return;

    try {
      await apiClient(`/organization/management/${id}/`, { method: "DELETE" });
      setView('list');
      setCurrentOrg(null);
      fetchOrganizations();
    } catch (e) {
      console.error("Failed to delete organization", e);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const isEditing = view === 'edit';
      const payload: any = { ...formData };
      ['start_date', 'end_date', 'billing_date'].forEach(field => {
        if (payload[field] === '') {
          payload[field] = null;
        }
      });
        
      await createOrUpdateOrganizationManagement(isEditing ? currentOrg.id : null, payload);
      
      setView('list');
      resetForm();
      fetchOrganizations();
    } catch (err: any) {
      console.error("API Error:", err);
      alert(`Failed to save organization: ${err.message || JSON.stringify(err)}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', company_name: '', entity: '', site_location: '', country: '', region: '', state: '', city: '', zone: '',
      white_label: false, sub_domain: '', solution_type: '', solution_for: '', billing_term: '', rate_of_billing: '',
      billing_cycle: '', start_date: '', project_duration: '', end_date: '', billing_date: '', status: 'active',
    });
    setCurrentOrg(null);
  };

  const openCreateForm = () => {
    resetForm();
    setView('create');
  };

  const openEditForm = (org: any) => {
    setFormData({
      name: org.name || '',
      company_name: org.company_name || '',
      entity: org.entity || '',
      site_location: org.site_location || '',
      country: org.country || '',
      region: org.region || '',
      state: org.state || '',
      city: org.city || '',
      zone: org.zone || '',
      white_label: org.white_label || false,
      sub_domain: org.sub_domain || '',
      solution_type: org.solution_type || '',
      solution_for: org.solution_for || '',
      billing_term: org.billing_term || '',
      rate_of_billing: org.rate_of_billing || '',
      billing_cycle: org.billing_cycle || '',
      start_date: org.start_date || '',
      project_duration: org.project_duration || '',
      end_date: org.end_date || '',
      billing_date: org.billing_date || '',
      status: org.status || 'active',
    });
    setCurrentOrg(org);
    setView('edit');
  };

  const openDetailView = (org: any) => {
    setCurrentOrg(org);
    setView('detail');
  };

  if (portalType !== 'super_user') {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-6 p-10 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full mx-4">
          <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Access Denied</h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">Only authorized SuperAdmins can view and manage Organization configurations.</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    org.org_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 bg-white min-h-screen font-sans">
      <div className="max-w-[1600px] w-[95%] mx-auto space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* ----------------- LIST VIEW ----------------- */}
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-bold text-slate-900">Organization List</h2>
              <Button onClick={() => setView('create')} className="bg-[#7C3AED] hover:bg-violet-700 text-white h-[42px] px-6 rounded-[10px] font-semibold transition-colors shadow-sm">
                Add Organization
              </Button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[16px] border border-slate-200/80 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] p-5 mb-6">
              <h3 className="text-[15px] font-bold text-slate-800 mb-4">Filters</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input 
                  placeholder="Search organizations..." 
                  className="flex-1 h-10 rounded-[8px] border-slate-200 text-[13px] bg-white shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setSearchQuery('')} className="h-10 px-6 rounded-[8px] border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm bg-white whitespace-nowrap">
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[16px] border border-slate-200/80 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] overflow-x-auto mb-4">
              <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[20%] truncate">Organization Name</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[16%] truncate">Company Name</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[15%] truncate">Entity Name</th>
                    <th className="px-2 py-3 text-[10px] font-bold text-slate-800 tracking-wider text-center w-[10%]">Total Sites</th>
                    <th className="px-2 py-3 text-[10px] font-bold text-slate-800 tracking-wider text-center w-[10%]">Status</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[10%] truncate">Created Date Time</th>
                    <th className="px-2 py-3 text-[10px] font-bold text-slate-800 tracking-wider text-center w-[6%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {loading ? (
                    <tr><td colSpan={11} className="text-center py-10 text-slate-500">Loading records...</td></tr>
                  ) : filteredOrgs.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-10 text-slate-500">No organizations found.</td></tr>
                  ) : (
                    filteredOrgs.map((org) => (
                      <tr key={org.id} onClick={() => openDetailView(org)} className="hover:bg-slate-50/40 transition-colors cursor-pointer group">
                        <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-900 truncate">{org.name || '-'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{org.company_name || '-'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{org.entity || '-'}</td>
                        <td className="px-2 py-2.5 text-[11px] text-slate-600 text-center">-</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            org.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {org.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-600 whitespace-nowrap">{org.created_at ? new Date(org.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={(e) => { e.stopPropagation(); openEditForm(org); }} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors opacity-0 group-hover:opacity-100">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ----------------- CREATE / EDIT FORM VIEW ----------------- */}
        {(view === 'create' || view === 'edit') && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-200/60 overflow-hidden animate-in slide-in-from-right-8 duration-500">
            <div className="p-8 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-20">
              <div className="flex items-center gap-5">
                <Button variant="outline" size="icon" onClick={() => setView('list')} className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm h-10 w-10 transition-transform hover:-translate-x-1">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">{view === 'edit' ? 'Edit Organization' : 'Add New Organization'}</h2>
                  {view === 'create' && (
                    <p className="text-slate-500 text-sm mt-1.5 font-medium">Provide the essential information for the new organization.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
              <form onSubmit={handleCreateOrUpdate} className="p-8 md:p-10 space-y-12">
                
                {/* General Information */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Info className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">General Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Organization Name <span className="text-red-500">*</span></label>
                      <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Acme Corporation" required className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Status</label>
                      <select name="status" value={formData.status} onChange={handleInputChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Company Details */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Company details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Company Name <span className="text-red-500">*</span></label>
                      <Input name="company_name" value={formData.company_name} onChange={handleInputChange} placeholder="Acme Inc." required className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Entity</label>
                      <Input name="entity" value={formData.entity} onChange={handleInputChange} placeholder="Acme Global Entity" className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Site Location</label>
                      <Input name="site_location" value={formData.site_location} onChange={handleInputChange} placeholder="Enter your site location" className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                  </div>
                </section>

                {/* Location Details */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Location Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Country</label>
                      <Input name="country" value={formData.country} onChange={handleInputChange} placeholder="Select or type country" className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Region</label>
                      <Input name="region" value={formData.region} onChange={handleInputChange} placeholder="Select or type region" className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">State</label>
                      <Input name="state" value={formData.state} onChange={handleInputChange} placeholder="Select or type state" className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">City</label>
                      <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="Select or type city" className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Zone</label>
                      <Input name="zone" value={formData.zone} onChange={handleInputChange} placeholder="Select or type zone" className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                  </div>
                </section>


                {/* Advanced Options */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="h-8 w-8 rounded-lg bg-pink-50 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-pink-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Advanced Options</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-700 block">White Label Platform</label>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input type="checkbox" name="white_label" checked={formData.white_label} onChange={handleInputChange} className="sr-only peer" />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                        <span className="ml-4 text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Enable white labeling</span>
                      </label>
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-sm font-bold text-slate-700">Sub - Domain</label>
                      <Input name="sub_domain" value={formData.sub_domain} onChange={handleInputChange} placeholder="www.acme.workhub.com" className="h-12 border-slate-200 bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                  </div>
                </section>

                {/* Billing */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-teal-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Billing Configuration</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Solution Type</label>
                      <select name="solution_type" value={formData.solution_type} onChange={handleInputChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 transition-all">
                        <option value="">-- Please choose an option --</option>
                        <option value="SaaS">SaaS</option>
                        <option value="Enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Solution For</label>
                      <select name="solution_for" value={formData.solution_for} onChange={handleInputChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 transition-all">
                        <option value="">-- Please choose an option --</option>
                        <option value="HR">HR Management</option>
                        <option value="IT">IT Service</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Billing Term</label>
                      <select name="billing_term" value={formData.billing_term} onChange={handleInputChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 transition-all">
                        <option value="">-- Please choose an option --</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Annually">Annually</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Rate of Billing</label>
                      <Input name="rate_of_billing" value={formData.rate_of_billing} onChange={handleInputChange} placeholder="Enter billing rate" className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Billing Cycle</label>
                      <select name="billing_cycle" value={formData.billing_cycle} onChange={handleInputChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 transition-all">
                        <option value="">-- Please choose an option --</option>
                        <option value="Prepaid">Prepaid</option>
                        <option value="Postpaid">Postpaid</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Start Date</label>
                      <Input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all font-medium text-slate-700" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Project Duration</label>
                      <select name="project_duration" value={formData.project_duration} onChange={handleInputChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm focus:bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 transition-all">
                        <option value="">-- Please choose an option --</option>
                        <option value="6 Months">6 Months</option>
                        <option value="1 Year">1 Year</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">End Date</label>
                      <Input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all font-medium text-slate-700" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">Billing Date</label>
                      <Input type="date" name="billing_date" value={formData.billing_date} onChange={handleInputChange} className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl shadow-sm transition-all font-medium text-slate-700" />
                    </div>
                  </div>
                </section>

                {/* Footer Actions */}
                <div className="pt-8 mt-12 border-t border-slate-200 flex justify-end gap-4 sticky bottom-0 bg-white/90 backdrop-blur-md py-6 rounded-b-3xl">
                  <Button type="button" variant="outline" onClick={() => setView('list')} className="w-32 h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-600">Cancel</Button>
                  <Button type="submit" className="w-56 h-12 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                    {view === 'edit' ? 'Update Organization' : 'Save Organization'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- DETAIL VIEW ----------------- */}
        {view === 'detail' && currentOrg && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-200/60 overflow-hidden animate-in fade-in zoom-in-95 duration-400">
            <div className="p-6 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-5">
                <Button variant="outline" size="icon" onClick={() => setView('list')} className="rounded-xl border-slate-200 hover:bg-white text-slate-600 shadow-sm h-11 w-11 transition-transform hover:-translate-x-1">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-[24px] font-extrabold text-slate-900 tracking-tight">{currentOrg.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-slate-500 text-sm font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">ID: {currentOrg.org_id}</p>
                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border ${
                      currentOrg.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {currentOrg.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6 sm:mt-0">
                <Button variant="outline" onClick={() => openEditForm(currentOrg)} className="gap-2 h-11 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm font-semibold transition-colors">
                  <Edit2 className="h-4 w-4 text-indigo-500" /> Edit Details
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteOrganization(currentOrg.id)} className="gap-2 h-11 px-5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white shadow-sm font-semibold transition-all">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50/30">
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg"><Building2 className="h-5 w-5 text-indigo-600" /></div>
                      Organization Profile
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Company Name</p>
                      <p className="font-semibold text-slate-800">{currentOrg.company_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Entity</p>
                      <p className="font-semibold text-slate-800">{currentOrg.entity || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Site Location</p>
                      <p className="font-semibold text-slate-800">{currentOrg.site_location || '—'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Location Details</p>
                      <p className="font-semibold text-slate-800 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {[currentOrg.city, currentOrg.state, currentOrg.country].filter(Boolean).join(', ') || 'Location not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Sub-Domain</p>
                      <p className="font-semibold text-slate-800 text-indigo-600">{currentOrg.sub_domain || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Billing Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-teal-50 rounded-lg"><Receipt className="h-5 w-5 text-teal-600" /></div>
                      Billing Configuration
                    </h3>
                    <button 
                      onClick={() => navigate(`/superadmin/billing/${currentOrg.id}`)}
                      className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-colors"
                    >
                      View Full Billing
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Solution Type</p>
                      <p className="font-semibold text-slate-800">{currentOrg.solution_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Billing Term</p>
                      <p className="font-semibold text-slate-800">{currentOrg.billing_term || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Rate</p>
                      <p className="font-semibold text-slate-800 text-emerald-600">{currentOrg.rate_of_billing || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Cycle</p>
                      <p className="font-semibold text-slate-800">{currentOrg.billing_cycle || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Start Date</p>
                      <p className="font-semibold text-slate-800">{currentOrg.start_date || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">End Date</p>
                      <p className="font-semibold text-slate-800">{currentOrg.end_date || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Operational Sites Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg"><MapPin className="h-5 w-5 text-indigo-600" /></div>
                      Operational sites
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-9" onClick={() => navigate('/admin/sites')}>Manage Sites</Button>
                      <Button size="sm" className="h-9 gap-1" onClick={() => navigate(`/admin/sites/add?orgId=${currentOrg.id}`)}>
                        <Plus className="h-4 w-4" /> Add Site
                      </Button>
                    </div>
                  </div>
                  
                  {/* Sites Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Site name</th>
                          <th className="px-4 py-3">Product types</th>
                          <th className="px-4 py-3">Users</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentOrg.sites && currentOrg.sites.length > 0 ? (
                           currentOrg.sites.map((site: any) => (
                             <tr key={site.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/sites`)}>
                               <td className="px-4 py-3 font-semibold text-slate-900">{site.site_name}</td>
                               <td className="px-4 py-3 text-slate-600">{site.product_type || '-'}</td>
                               <td className="px-4 py-3 text-slate-600">0</td>
                               <td className="px-4 py-3">
                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                   {site.status}
                                 </span>
                               </td>
                               <td className="px-4 py-3 text-indigo-600 font-semibold text-xs hover:underline">Manage</td>
                             </tr>
                           ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                              No operational sites recorded yet. Add sites from Sites setup when you are ready.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">


                {/* Audit Log Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
                  <div className="absolute top-8 left-9 bottom-8 w-px bg-slate-100 z-0"></div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3 mb-6 relative z-10 bg-white">
                    <div className="p-2 bg-slate-100 rounded-lg"><Clock className="h-5 w-5 text-slate-600" /></div>
                    Audit Trail
                  </h3>
                  <div className="space-y-8 relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border-4 border-white shadow-sm mt-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1">
                        <p className="text-sm font-bold text-slate-900">Organization Created</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(currentOrg.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        <p className="text-xs text-slate-600 mt-2 font-medium">Created securely by system admin <span className="text-indigo-600">({currentOrg.created_by_name || 'Admin'})</span>.</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
