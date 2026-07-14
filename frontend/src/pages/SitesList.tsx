import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Plus, Search, MapPin, Building2, UserCircle, LayoutGrid, Calendar, Trash2, Activity, Filter, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { API_BASE } from "@/config";


type ViewState = 'list' | 'detail';

export default function SitesList() {
  const navigate = useNavigate();
  const { token, portalType } = useAuth();

  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [view, setView] = useState<ViewState>('list');
  const [selectedSite, setSelectedSite] = useState<any | null>(null);

  useEffect(() => {
    if (portalType === 'super_user') {
      fetchSites();
    } else {
      setLoading(false);
    }
  }, [portalType, token]);

  const fetchSites = async () => {
    try {
      const res = await fetch(`${API_BASE}/organization/sites/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setSites(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (siteId: number) => {
    // Removed window.confirm because browser might be blocking dialogs!
    try {
      const res = await fetch(`${API_BASE}/organization/sites/${siteId}/`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok || res.status === 204) {
        if (selectedSite?.id === siteId) {
          setView('list');
          setSelectedSite(null);
        }
        fetchSites();
      } else {
        const errText = await res.text();
        alert(`Failed to delete site: HTTP ${res.status}\n${errText}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Network error during deletion: ${e.message}`);
    }
  };

  const openDetailView = (site: any) => {
    setSelectedSite(site);
    setView('detail');
  };

  const filteredSites = sites.filter(s =>
    s.site_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.site_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (portalType !== 'super_user') {
    return <div className="p-10 text-center">Access Denied</div>;
  }

  return (
    <div className="flex-1 p-8 bg-white min-h-screen font-sans">
      <div className="max-w-[1600px] w-[95%] mx-auto space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-bold text-slate-900">Sites List</h2>
              <Button onClick={() => navigate(`/admin/sites/add`)} className="bg-[#7C3AED] hover:bg-violet-700 text-white h-[42px] px-6 rounded-[10px] font-semibold transition-colors shadow-sm">
                + Add Site
              </Button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[16px] border border-slate-200/80 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] p-5 mb-6">
              <h3 className="text-[15px] font-bold text-slate-800 mb-4">Filters</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                  placeholder="Search site..."
                  className="flex-1 h-10 rounded-[8px] border-slate-200 text-[13px] bg-white shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select className="h-10 px-3 rounded-[8px] border border-slate-200 text-[13px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white shadow-sm min-w-[200px]">
                  <option value="">Product Type</option>
                </select>
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
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[20%] truncate">Site Name</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[16%] truncate">Organization</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[15%] truncate">Location</th>
                    <th className="px-2 py-3 text-[10px] font-bold text-slate-800 tracking-wider text-center w-[12%]">Product Type</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[12%] truncate">Contact</th>
                    <th className="px-2 py-3 text-[10px] font-bold text-slate-800 tracking-wider text-center w-[10%]">Status</th>
                    <th className="px-2 py-3 text-[10px] font-bold text-slate-800 tracking-wider text-center w-[10%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-500">Loading records...</td></tr>
                  ) : filteredSites.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-500">No sites found.</td></tr>
                  ) : (
                    filteredSites.map((site) => (
                      <tr key={site.id} onClick={() => openDetailView(site)} className="hover:bg-slate-50/40 transition-colors cursor-pointer group">
                        <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-900 truncate">{site.site_name || '-'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{site.organization_name || '-'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{site.location_address || '-'}</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[120px]">
                            {site.product_type || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{site.contact_name || '-'}</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            site.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {site.status}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); openDetailView(site); }} className="text-indigo-500 hover:text-indigo-700 transition-colors" title="Manage">
                              <Settings className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(site.id); }} className="text-red-500 hover:text-red-700 transition-colors" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'detail' && selectedSite && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-200/60 overflow-hidden animate-in fade-in zoom-in-95 duration-400">
            <div className="p-6 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-5">
                <Button variant="outline" size="icon" onClick={() => { setView('list'); setSelectedSite(null); }} className="rounded-xl border-slate-200 hover:bg-white text-slate-600 shadow-sm h-11 w-11 transition-transform hover:-translate-x-1">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-[24px] font-extrabold text-slate-900 tracking-tight">{selectedSite.site_name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-slate-500 text-sm font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Site Code: {selectedSite.site_code || 'N/A'}</p>
                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border ${selectedSite.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                      {selectedSite.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6 sm:mt-0">
                <Button variant="destructive" onClick={() => handleDelete(selectedSite.id)} className="gap-2 h-11 px-5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white shadow-sm font-semibold transition-all">
                  <Trash2 className="h-4 w-4" /> Delete Site
                </Button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-[#fafafa]">
              <div className="lg:col-span-2 space-y-8">
                {/* Site Profile Card */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center bg-indigo-50 rounded-xl"><Building2 className="h-5 w-5 text-indigo-600" /></div>
                      Site Profile
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-6">
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Organization</p>
                      <p className="font-semibold text-slate-800 text-[14px]">{selectedSite.organization_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Product Type</p>
                      <p className="font-semibold text-slate-800 text-[14px]">{selectedSite.product_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Activate Date</p>
                      <p className="font-semibold text-slate-800 text-[14px] flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {selectedSite.activate_date || '—'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Location Address</p>
                      <p className="font-semibold text-slate-800 text-[14px] flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedSite.location_address || '—'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Country</p>
                      <p className="font-semibold text-slate-800 text-[14px]">{selectedSite.country || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Modules Card */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center bg-purple-50 rounded-xl"><LayoutGrid className="h-5 w-5 text-purple-600" /></div>
                      Modules Access
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {selectedSite.modules_access && selectedSite.modules_access.length > 0 ? (
                      selectedSite.modules_access.map((mod: string, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-white border border-slate-200 shadow-sm text-slate-700 hover:border-purple-200 transition-colors">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                          {mod}
                        </span>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm italic w-full">No modules assigned to this site.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Contact Card */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center bg-emerald-50 rounded-xl"><UserCircle className="h-5 w-5 text-emerald-600" /></div>
                      Contact Person
                    </h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Name</p>
                      <p className="font-semibold text-slate-800 text-[15px]">{selectedSite.contact_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Email</p>
                      <p className="font-semibold text-indigo-600 text-[15px] hover:underline cursor-pointer">{selectedSite.contact_email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Phone</p>
                      <p className="font-semibold text-slate-800 text-[15px]">{selectedSite.contact_phone || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Site Activity Logs */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center bg-amber-50 rounded-xl"><Activity className="h-5 w-5 text-amber-600" /></div>
                      Site Logs
                    </h3>
                  </div>
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                      <Activity className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium text-sm">No recent activity</p>
                    <p className="text-slate-400 text-xs max-w-[200px]">Audit logs for this site will appear here once activity occurs.</p>
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
