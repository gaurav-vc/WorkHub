import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Users, Building2, Server, BadgeIndianRupee } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, Tooltip, BarChart, Bar, YAxis, CartesianGrid, Cell, PieChart, Pie, Legend, LineChart, Line } from "recharts";
import { API_BASE } from "@/config";

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);

  
  useEffect(() => {
    fetch(`${API_BASE}/organization/superadmin/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [token]);

  const revenue = data?.revenue || 0;
  const activeSites = data?.activeSites || 0;
  const totalUsers = data?.totalUsers || 0;
  const totalOrgs = data?.totalOrganizations || 0;

  const chartData = data?.companyWiseSites || [];
  const upsaleData = data?.todaysUpsale || [];
  const moduleSitesData = data?.moduleWiseSites || [];
  const moduleRevenueData = data?.moduleWiseRevenue || [];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4', '#14b8a6', '#84cc16'];

  return (
    <div className="flex-1 p-8 bg-white min-h-screen font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[24px] font-bold text-slate-900 leading-tight tracking-tight">Dashboard</h2>
            <p className="text-sm text-slate-500 mt-1">Optimize Revenue and Track Sales Performance.</p>
          </div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 flex flex-col justify-between h-[110px]">
            <div className="flex flex-col gap-1">
              <div className="h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center mb-1">
                <BadgeIndianRupee className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Total Revenue</p>
            </div>
            <div className="text-[22px] font-bold text-slate-900 tracking-tight">Rs. {revenue.toLocaleString()}/-</div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 flex flex-col justify-between h-[110px]">
            <div className="flex flex-col gap-1">
              <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                <Building2 className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Active Sites</p>
            </div>
            <div className="text-[22px] font-bold text-slate-900 tracking-tight">{activeSites}</div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 flex flex-col justify-between h-[110px]">
            <div className="flex flex-col gap-1">
              <div className="h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center mb-1">
                <Users className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Total Users</p>
            </div>
            <div className="text-[22px] font-bold text-slate-900 tracking-tight">{totalUsers}</div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 flex flex-col justify-between h-[110px]">
            <div className="flex flex-col gap-1">
              <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                <Server className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Total Company</p>
            </div>
            <div className="text-[22px] font-bold text-slate-900 tracking-tight">{totalOrgs}</div>
          </div>
        </div>

        {/* Second Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Today's Upsale */}
          <div className="w-full lg:w-1/3 bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[17px] font-bold text-slate-800">Today's Upsale</h3>
            </div>
            <div className="flex flex-col gap-4">
              {upsaleData.length > 0 ? (
                upsaleData.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400">Sites: {item.sites}</p>
                    </div>
                    <div className="text-[13px] font-bold text-slate-800">Rs. {item.amount}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No data available</p>
              )}
            </div>
          </div>

          {/* Company Wise Site */}
          <div className="w-full lg:w-2/3 bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[17px] font-bold text-slate-800">Company Wise Site</h3>
              <button className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
                Week
              </button>
            </div>
            <div className="flex-1 min-h-[220px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      dx={-10}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Third Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-1/3 bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[17px] font-bold text-slate-800">Module Wise Revenue</h3>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[220px] pr-2">
              {moduleRevenueData.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <p className="text-[13px] font-semibold text-slate-800">{item.name}</p>
                  </div>
                  <div className="text-[13px] font-bold text-slate-800">Rs. {item.amount.toLocaleString()}</div>
                </div>
              ))}
              {moduleRevenueData.length === 0 && (
                <p className="text-sm text-slate-400">No data available</p>
              )}
            </div>
          </div>
          <div className="w-full lg:w-2/3 bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[17px] font-bold text-slate-800">Module Wise Site</h3>
              <button className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
                Week
              </button>
            </div>
            <div className="flex-1 min-h-[220px]">
              {moduleSitesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleSitesData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 11, fill: '#64748b' }} 
                       dy={10}
                       angle={-45}
                       textAnchor="end"
                       height={60}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(226, 232, 240, 0.4)'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
