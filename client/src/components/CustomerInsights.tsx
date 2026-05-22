/* LEF'S PREMIER YENS LOYALTY INSIGHTS UPDATE */
/* Changes: Yens Blue branding, Refined KPI clarity, and Senior Staff optimization */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Trophy, Gift, TrendingUp, Star,
  MailCheck, Crown, CalendarDays
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import type { Customer } from "@shared/schema";
import { useTranslation } from "react-i18next";

const TIER_COLORS = {
  platinum: "#8B5CF6",
  gold: "#F59E0B",
  silver: "#64748B",
  bronze: "#B45309"
};

export default function CustomerInsights({
  onMessage,
  onEdit,
  onSendBirthdayMessages
}: {
  onMessage?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onSendBirthdayMessages?: (customers: Customer[]) => void;
} = {}) {
  const { t } = useTranslation();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/all'],
  });

  const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
  const totalSpent = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);
  const avgSpent = customers.length > 0 ? totalSpent / customers.length : 0;

  const tierStats = customers.reduce((acc: any, c) => {
    const tier = c.tier || 'bronze';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(tierStats).map(([name, value]) => ({ name, value }));

  const today = new Date();
  const birthdayFolks = customers.filter(c => {
    if (!c.birthday) return false;
    const bday = new Date(c.birthday);
    return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();
  });

  if (isLoading) return (
    <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">
      Analyzing Loyalty Data...
    </div>
  );

  return (
    <div className="space-y-8 pb-12">

      {/* ── BRANDED HEADER ── */}
      <div className="bg-blue-900 rounded-[2rem] p-6 flex items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-yellow-400 rounded-2xl p-4 shadow-lg shrink-0 transform -rotate-3">
            <TrendingUp className="h-5 w-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Customer Insights</h2>
            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 opacity-80">Loyalty analytics and member intelligence</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 relative z-10">
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{customers.length} Members</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Community Size", val: customers.length, icon: Users, detail: "Total Members" },
          { label: "Active Point Pool", val: totalPoints.toLocaleString(), icon: Star, detail: "Unredeemed Points" },
          { label: "Ecosystem Value", val: `฿${totalSpent.toLocaleString()}`, icon: TrendingUp, detail: "Total Lifetime Sales" },
          { label: "Avg. Member Value", val: `฿${avgSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: Crown, detail: "Per Customer", dark: true },
        ].map((kpi, i) => (
          <Card key={i} className={`border-none shadow-sm rounded-2xl overflow-hidden ${kpi.dark ? 'bg-blue-900 text-white' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${kpi.dark ? 'text-blue-300' : 'text-slate-400'}`}>{kpi.label}</p>
                  <h3 className={`text-3xl font-black ${kpi.dark ? 'text-white' : 'text-blue-900'}`}>{kpi.val}</h3>
                  <p className={`text-[10px] font-bold mt-2 ${kpi.dark ? 'text-blue-300' : 'text-slate-400'}`}>{kpi.detail}</p>
                </div>
                <div className={`p-2 rounded-xl ${kpi.dark ? 'bg-yellow-400/20 text-yellow-400' : 'bg-blue-50 text-blue-600'}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tier Distribution Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl bg-white p-6">
          <CardHeader className="px-0 pt-0 border-b border-slate-50 mb-6">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> MEMBER TIER DISTRIBUTION
            </CardTitle>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.name as keyof typeof TIER_COLORS] || "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Birthday Automation Watch */}
        <Card className="border-none shadow-sm rounded-2xl bg-blue-900 text-white overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-black flex items-center gap-2 tracking-widest text-blue-300">
              <Gift className="h-4 w-4 text-amber-400" /> BIRTHDAY AUTOMATION
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-4xl font-black">{birthdayFolks.length}</span>
                <Badge className="bg-green-500 text-white font-black border-none uppercase text-[9px]">Live Today</Badge>
              </div>
              <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                {birthdayFolks.length === 0 ? (
                  <p className="text-blue-300 text-xs font-bold italic">No automated messages scheduled for today.</p>
                ) : (
                  birthdayFolks.map((person, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm font-black uppercase">{person.name}</p>
                        <p className="text-[10px] font-bold text-blue-300">{person.phone}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[8px] border-yellow-400/50 text-yellow-400 font-black">
                          <MailCheck className="h-2.5 w-2.5 mr-1" /> SENT
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-400 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-blue-900">System Status: Active</p>
              <CalendarDays className="h-4 w-4 text-blue-900 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Senior Staff Oversight Table */}
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50">
          <CardTitle className="text-lg font-black text-slate-800">TOP 10 LOYALTY LEADERS</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-blue-900/5 border-b border-blue-100">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black text-blue-900 uppercase tracking-widest">Customer</th>
                <th className="text-center px-6 py-4 text-[10px] font-black text-blue-900 uppercase tracking-widest">Tier</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-blue-900 uppercase tracking-widest">Total Purchases</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-blue-900 uppercase tracking-widest">Point Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...customers].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10).map((c, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black">
                        #{i + 1}
                      </div>
                      <p className="font-black text-slate-800 text-sm uppercase">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: TIER_COLORS[c.tier as keyof typeof TIER_COLORS] || '#cbd5e1',
                        color: TIER_COLORS[c.tier as keyof typeof TIER_COLORS] || '#94a3b8',
                      }}
                      className="font-black text-[9px] uppercase px-2 py-0.5 border-2"
                    >
                      {c.tier}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-black text-slate-700 text-sm">฿{Number(c.totalSpent || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-black text-blue-900 text-sm">{(c.points || 0).toLocaleString()} PTS</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
