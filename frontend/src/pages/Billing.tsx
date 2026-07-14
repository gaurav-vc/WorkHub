import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/config";

export default function Billing() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  
  // Fetch real data from the API
  useEffect(() => {
    fetch(`${API_BASE}/organization/management/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
           const mapped = data.map((p: any) => ({
             id: p.id,
             org: p.name || "Unknown",
             company: p.company_name || "-",
             plan: p.billing_term || p.solution_type || "Standard Plan",
             amount: "Rs. " + (p.rate_of_billing || "0"),
             next_date: p.billing_date || "-",
             due: "Rs. " + (p.current_due ? parseFloat(p.current_due).toFixed(2) : "0.00"),
             status: parseFloat(p.current_due || 0) > 0 ? 'Pending' : 'Paid'
           }));
           setPayments(mapped);
        }
      })
      .catch(console.error);
  }, [token]);

  const filteredPayments = payments.filter(p => 
    p.org.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 bg-white min-h-screen font-sans">
      <div className="max-w-[1600px] w-[95%] mx-auto space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[24px] font-bold text-slate-900">Billing & Payments</h2>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[16px] border border-slate-200/80 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] p-5 mb-6">
          <h3 className="text-[15px] font-bold text-slate-800 mb-4">Filters</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input 
              type="text" 
              placeholder="Search organization billing..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-10 px-3 rounded-[8px] border border-slate-200 text-[13px] bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
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
                <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[15%] truncate">Organization</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[15%] truncate">Company</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[12%] truncate">Current Plan</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[12%] truncate">Billing Amount</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[12%] truncate">Next Billing Date</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-800 tracking-wider w-[12%] truncate">Current Due</th>
                <th className="px-2 py-3 text-[10px] font-bold text-slate-800 tracking-wider text-center w-[12%]">Status</th>
                <th className="px-2 py-3 text-[10px] font-bold text-slate-800 tracking-wider text-center w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p: any, idx) => (
                  <tr key={idx} onClick={() => navigate(`/admin/organizations/${p.id}/billing`)} className="hover:bg-slate-50/40 transition-colors cursor-pointer group">
                  <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-900 truncate">{p.org}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{p.company}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{p.plan}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{p.amount}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{p.next_date}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-600 truncate">{p.due}</td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/organizations/${p.id}/billing`); }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      View
                    </button>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[12px] text-slate-500">
                    No billing data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
