import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, Download, CreditCard, Receipt, Building2, MapPin } from "lucide-react";
import { API_BASE } from "@/config";

export default function OrganizationBillingDetails() {
  const { orgId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'overdue'>('all');

  
  useEffect(() => {
    fetch(`${API_BASE}/organization/management/${orgId}/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setOrg(data);
        // Also fetch payments
        return fetch(`${API_BASE}/organization/payments/?organization_id=${orgId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(res => res.json())
      .then(payments => {
        setInvoices(payments);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [orgId, token]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading billing details...</div>;
  }

  if (!org) {
    return <div className="p-8 text-center text-red-500">Organization not found.</div>;
  }

  const rate = parseFloat(org.rate_of_billing) || 0;
  const billingDate = org.billing_date || "Not set";
  
  // Current balance logic
  const currentBalance = invoices.filter(inv => inv.status !== 'paid').reduce((acc, inv) => acc + parseFloat(inv.amount), 0);

  const handlePayNow = async () => {
    const pendingInv = invoices.find(inv => inv.status !== 'paid');
    if (!pendingInv) {
      alert("No pending invoices to pay.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/organization/payments/${pendingInv.id}/`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'paid' })
      });
      if (res.ok) {
        setInvoices(prev => prev.map(inv => inv.id === pendingInv.id ? { ...inv, status: 'paid' } : inv));
        alert(`Successfully paid invoice ${pendingInv.invoice_number}`);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteInvoice = async (invId: string) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`${API_BASE}/organization/payments/${invId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setInvoices(prev => prev.filter(inv => inv.id !== invId));
      }
    } catch (e) { console.error(e); }
  };

  const handleDownloadCSV = () => {
    const header = ["Invoice Number", "Billing Date", "Due Date", "Amount", "Status"];
    const csvContent = [
      header.join(","),
      ...invoices.map(inv => [inv.invoice_number, inv.billing_date, inv.due_date, inv.amount, inv.status].join(","))
    ].join("\\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${org.name.replace(/\\s+/g, '_')}_Invoices.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadInvoice = (inv: any) => {
    const content = `INVOICE\\n\\nOrganization: ${org.name}\\nInvoice Number: ${inv.invoice_number}\\nDate: ${inv.billing_date}\\nDue Date: ${inv.due_date}\\n\\nTotal Amount: Rs. ${inv.amount}\\nStatus: ${inv.status.toUpperCase()}\\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_number}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-8 bg-slate-50/50 min-h-screen font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center text-[12px] font-medium text-slate-500 mb-2">
              <button onClick={() => navigate('/admin/organizations')} className="hover:text-indigo-600 transition-colors">Organization</button>
              <ChevronRight className="h-3.5 w-3.5 mx-1" />
              <span className="text-slate-400">Billing & Subscriptions</span>
            </div>
            <h1 className="text-[32px] font-extrabold text-slate-900 tracking-tight leading-none">
              {org.name}
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button onClick={handleDownloadCSV} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download CSV
            </button>
            <button onClick={handlePayNow} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pay Now
            </button>
          </div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
            <div className="flex items-center gap-2 text-slate-500 font-medium text-[13px] mb-3">
              <span className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">NB</span>
              Next Billing Amount
            </div>
            <div className="text-[36px] font-bold text-slate-900 tracking-tight mb-1">
              Rs. {rate.toFixed(2)}
            </div>
            <div className="text-[13px] text-slate-500">
              Estimated for next cycle · Renews on {billingDate}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
            <div className="flex items-center gap-2 text-slate-500 font-medium text-[13px] mb-3">
              <span className="w-6 h-6 rounded bg-purple-50 text-purple-600 flex items-center justify-center text-[10px] font-bold">CD</span>
              Current Balance Due
            </div>
            <div className="text-[36px] font-bold text-slate-900 tracking-tight mb-1">
              Rs. {currentBalance.toFixed(2)}
            </div>
            <div className="text-[13px] text-slate-500">
              {currentBalance > 0 ? "You have pending payments." : "Everything looks good!"}
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-slate-900">Invoice History</h2>
              <p className="text-[13px] text-slate-500 mt-1">Review and download your recent billing statements</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input 
                type="text" 
                placeholder="Search invoice #" 
                className="h-10 pl-4 pr-4 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm w-[200px]"
              />
              <div className="flex bg-slate-100/80 p-1 rounded-xl">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold shadow-sm transition-colors ${filter === 'all' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >All</button>
                <button 
                  onClick={() => setFilter('paid')}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold shadow-sm transition-colors ${filter === 'paid' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >Paid</button>
                <button 
                  onClick={() => setFilter('overdue')}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold shadow-sm transition-colors ${filter === 'overdue' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >Overdue</button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[12px] font-bold text-slate-800 bg-slate-50/50">Invoice #</th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-800 bg-slate-50/50">Billing Date</th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-800 bg-slate-50/50">Due Date</th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-800 bg-slate-50/50">Amount</th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-800 bg-slate-50/50">Status</th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-800 bg-slate-50/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices
                .filter(inv => filter === 'all' || inv.status.toLowerCase() === filter)
                .length > 0 ? (
                invoices
                  .filter(inv => filter === 'all' || inv.status.toLowerCase() === filter)
                  .map((inv, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 text-[13px] font-semibold text-slate-700">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-[13px] text-slate-600">{inv.billing_date}</td>
                    <td className="px-6 py-4 text-[13px] text-slate-600">{inv.due_date}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-800">Rs. {inv.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                        inv.status.toLowerCase() === 'paid' 
                          ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' 
                          : 'text-slate-600 bg-slate-100 border border-slate-200'
                      }`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-4">
                      <button onClick={() => handleDownloadInvoice(inv)} className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1.5">
                        Download
                      </button>
                      <button onClick={() => handleDeleteInvoice(inv.id)} className="text-[12px] font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                    No recent billing statements.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

      </div>
    </div>
  );
}
