/* LEF'S PREMIER YENS BRANDED UPDATE */
/* Changes: Yens Blue theme, Optimized Monday-Start Weekly Log, and Larger Input Fields for Staff */

import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, TrendingUp, BarChart3, Upload, Plus, FileSpreadsheet, Pencil, Trash2, Search, FileText, Loader2, ShieldCheck, Activity, Wallet, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { DailySales, Site } from "@shared/schema";
import { format, parse } from "date-fns";

const formatDateDDMMYY = (dateStr: string) => {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'dd/MM/yy');
  } catch {
    return dateStr;
  }
};

interface SalesFormData {
  date: string;
  orderChannel: string;
  netSales: string;
  otherSales: string;
  otherSalesNote: string;
  grabFee: string;
}

export default function SalesTrackerDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<SalesFormData>({
    date: new Date().toISOString().split('T')[0],
    orderChannel: "",
    netSales: "",
    otherSales: "0",
    otherSalesNote: "",
    grabFee: "0",
  });

  const [editingSale, setEditingSale] = useState<DailySales | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  const today = new Date().toISOString().split('T')[0];
  const getMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };
  const [reportStartDate, setReportStartDate] = useState(getMonday);
  const [reportEndDate, setReportEndDate] = useState(today);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [validationResult, setValidationResult] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await fetch('/api/admin/sales/validate-totals', { credentials: 'include' });
      const data = await res.json();
      setValidationResult(data);
      setShowValidation(true);
    } finally {
      setIsValidating(false);
    }
  };

  const { data: metrics } = useQuery<any>({ queryKey: ['/api/admin/sales-tracker-metrics'] });
  const { data: allSales = [] } = useQuery<DailySales[]>({ queryKey: ['/api/admin/sales-overview'] });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ['/api/admin/sites'] });

  const channels = useMemo(() => {
    return sites.filter(s => s.isActive && s.channelName).map(s => s.channelName).sort();
  }, [sites]);

  // Compute selected week boundaries from weekOffset (0 = current week, -1 = last week, etc.)
  const { weekStart, weekEnd, weekLabel } = useMemo(() => {
    const now = new Date();
    const daysToMonday = now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1;
    const monday = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(),
      now.getUTCDate() - daysToMonday + weekOffset * 7,
    ));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));
    return {
      weekStart: monday.toISOString().split('T')[0],
      weekEnd:   sunday.toISOString().split('T')[0],
      weekLabel: `${format(monday, 'd MMM')} – ${format(sunday, 'd MMM yyyy')}`,
    };
  }, [weekOffset]);

  const recentSales = useMemo(() => {
    return allSales
      .filter(sale => sale.date >= weekStart && sale.date <= weekEnd)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allSales, weekStart, weekEnd]);

  const editSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      const net = parseFloat(data.netSales) || 0;
      const other = parseFloat(data.otherSales) || 0;
      return await apiRequest('PATCH', `/api/admin/sales/${editingSale!.id}`, {
        ...data,
        netSales: net.toFixed(2),
        otherSales: other.toFixed(2),
        grabFee: parseFloat(data.grabFee || "0").toFixed(2),
        totalSales: (net + other).toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
      toast({ title: "Sale Updated", description: "Entry saved successfully." });
      setIsEditDialogOpen(false);
      setEditingSale(null);
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Could not save changes.", variant: "destructive" });
    },
  });

  const addSaleMutation = useMutation({
    mutationFn: async (data: SalesFormData) => {
      const net = parseFloat(data.netSales) || 0;
      const other = parseFloat(data.otherSales) || 0;
      return await apiRequest('POST', '/api/admin/sales', {
        ...data, netSales: net.toFixed(2), otherSales: other.toFixed(2),
        grabFee: parseFloat(data.grabFee || "0").toFixed(2),
        totalSales: (net + other).toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
      toast({ title: "Sale Logged", description: "Yens Thai record updated successfully." });
      setFormData({ date: today, orderChannel: "", netSales: "", otherSales: "0", otherSalesNote: "", grabFee: "0" });
    },
  });

  const getChannelColor = (channel: string) => {
    const colors: Record<string, string> = {
      RIVER: "bg-blue-500", SHOP: "bg-purple-500", SHOPZY: "bg-amber-500",
      GRAB: "bg-emerald-500", LINEMAN: "bg-green-600", FOODPANDA: "bg-pink-500",
    };
    return colors[channel] || "bg-slate-500";
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await fetch(`/api/admin/sales/report?startDate=${reportStartDate}&endDate=${reportEndDate}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      // Build CSV content
      const lines: string[] = [];

      // Header
      lines.push(`"Yen's Sales Report"`);
      lines.push(`"Period","${reportStartDate} to ${reportEndDate}"`);
      lines.push('');

      // Summary
      lines.push('"SUMMARY"');
      lines.push('"Metric","Value"');
      lines.push(`"Total Net Sales","฿${data.summary.totalNetSales.toLocaleString()}"`);
      lines.push(`"Other Sales","฿${data.summary.totalOtherSales.toLocaleString()}"`);
      lines.push(`"Total Sales","฿${data.summary.totalSales.toLocaleString()}"`);
      lines.push(`"Days Logged","${data.summary.transactionCount}"`);
      lines.push(`"Avg Net Sales / Day","฿${data.summary.avgTransaction.toLocaleString()}"`);
      lines.push('');

      // Channel breakdown
      lines.push('"CHANNEL BREAKDOWN"');
      lines.push('"Channel","Revenue (฿)","Days"');
      data.channelBreakdown.forEach((c: { channel: string; revenue: number; count: number }) => {
        lines.push(`"${c.channel}","${c.revenue.toLocaleString()}","${c.count}"`);
      });
      lines.push('');

      // Day of week breakdown
      lines.push('"DAY OF WEEK BREAKDOWN"');
      lines.push('"Day","Revenue (฿)","Days"');
      data.dayBreakdown.forEach((d: { day: string; revenue: number; count: number }) => {
        lines.push(`"${d.day}","${d.revenue.toLocaleString()}","${d.count}"`);
      });
      lines.push('');

      // Transaction log
      lines.push('"TRANSACTION LOG"');
      lines.push('"Date","Day","Channel","Net Sales (฿)","Other Sales (฿)","Note","Total (฿)"');
      data.transactions.forEach((t: { date: string; dayOfWeek?: string; channel: string; netSales: number; otherSales: number; otherSalesNote?: string; totalSales: number }) => {
        lines.push(`"${t.date}","${t.dayOfWeek || ''}","${t.channel}","${t.netSales}","${t.otherSales}","${t.otherSalesNote || ''}","${t.totalSales}"`);
      });

      // Trigger download
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yens-sales-report-${reportStartDate}-to-${reportEndDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Report downloaded", description: `${data.summary.transactionCount} days, ฿${data.summary.totalSales.toLocaleString()} total` });
    } catch (err: any) {
      toast({ title: "Report failed", description: err?.message || "Could not generate report", variant: "destructive" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleEditSale = (sale: DailySales) => {
    setEditingSale(sale);
    setEditFormData({
      date: sale.date, orderChannel: sale.orderChannel, netSales: sale.netSales,
      otherSales: sale.otherSales || "0", otherSalesNote: (sale as any).otherSalesNote || "", grabFee: sale.grabFee || "0",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="min-h-screen pb-12">

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-white rounded-2xl shadow-md border border-slate-100">
              <img src={logoUrl} alt="Yens Logo" className="w-16 h-16 rounded-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-blue-900 tracking-tight uppercase">Yen's Sales Tracker</h1>
              <p className="text-blue-800 font-medium text-sm">Official Admin Hub for Yens Thai Nakhon Sawan</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl backdrop-blur-sm shadow-inner">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="bg-white border-none shadow-sm font-bold text-blue-900 rounded-xl">
                  <CalendarIcon className="h-4 w-4 mr-2 text-amber-500" />
                  {reportStartDate === reportEndDate ? formatDateDDMMYY(reportStartDate) : `${formatDateDDMMYY(reportStartDate)} - ${formatDateDDMMYY(reportEndDate)}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="grid grid-cols-2 gap-2 p-2">
                  <Input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                  <Input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
              {isGeneratingReport ? <Loader2 className="animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate Report
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Current Week Total", val: metrics?.currentWeekSales, icon: Activity, detail: `${metrics?.currentWeekTransactions ?? 0} Orders`, test: 'weekly-sales' },
            { label: "Current Month Total", val: metrics?.currentMonthSales, icon: CalendarCheck, detail: `${new Date().toLocaleDateString('en-US', { month: 'short' })} (Day ${metrics?.daysElapsedMonth ?? 0}/${metrics?.daysInMonth ?? 0})`, test: 'monthly-sales' },
            { label: "Daily Revenue Pace", val: metrics?.weeklyDailyAvg, icon: TrendingUp, detail: "Average Per Day", test: 'daily-avg' },
            { label: "Year to Date Running Total", val: metrics?.ytdSales, icon: Wallet, detail: `฿${((metrics?.projectedAnnual ?? 0) / 1000000).toFixed(2)}M Projection`, test: 'ytd-sales' },
          ].map((kpi, i) => (
            <Card key={i} className="border-none shadow-lg bg-blue-900 text-white rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <kpi.icon className="w-16 h-16" />
              </div>
              <CardContent className="p-6 relative z-10">
                <p className="text-[10px] uppercase font-bold text-blue-300 tracking-widest">{kpi.label}</p>
                <h3 className="text-3xl font-black mt-1" data-testid={`text-${kpi.test}`}>
                  ฿{(kpi.val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </h3>
                <p className="text-[11px] font-bold text-blue-200/90 mt-2">{kpi.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Add Sale Form */}
          <Card className="lg:col-span-2 border-none shadow-xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-blue-900 text-white pb-6 pt-6 px-6">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Plus className="text-yellow-400 h-5 w-5" /> New Daily Log Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={e => { e.preventDefault(); addSaleMutation.mutate(formData); }} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Date</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="h-11 rounded-lg border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Channel *</Label>
                    <Select value={formData.orderChannel} onValueChange={v => setFormData({ ...formData, orderChannel: v })}>
                      <SelectTrigger className="h-11 rounded-lg border-slate-200 shadow-inner"><SelectValue placeholder="Where?" /></SelectTrigger>
                      <SelectContent>
                        {channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-blue-900">Gross Sales (฿)</Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-base">฿</span>
                    <Input type="number" step="0.01" value={formData.netSales} onChange={e => setFormData({ ...formData, netSales: e.target.value })} className="h-12 pl-8 rounded-lg border-blue-200 bg-blue-50/40 text-blue-900 font-bold text-lg" placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">App / Grab Fee (฿)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">฿</span>
                      <Input type="number" step="0.01" value={formData.grabFee} onChange={e => setFormData({ ...formData, grabFee: e.target.value })} className="h-11 pl-7 rounded-lg border-red-200 bg-red-50/40 text-red-600" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-slate-500">Other In / Tips (฿)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">฿</span>
                      <Input type="number" step="0.01" value={formData.otherSales} onChange={e => setFormData({ ...formData, otherSales: e.target.value })} className="h-11 pl-7 rounded-lg w-full" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-slate-500">Ref / Note (e.g. Delivery, Catering)</Label>
                  <Input type="text" value={formData.otherSalesNote} onChange={e => setFormData({ ...formData, otherSalesNote: e.target.value })} className="h-11 rounded-lg" placeholder="Optional reference" />
                </div>

                <Button type="submit" disabled={addSaleMutation.isPending} className="w-full h-12 bg-yellow-400 text-blue-900 font-black text-base rounded-xl uppercase tracking-widest">
                  {addSaleMutation.isPending ? <Loader2 className="animate-spin" /> : "COMPLETE LOG"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Weekly Log */}
          <Card className="lg:col-span-3 border-none shadow-xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 py-6 px-6 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-amber-500" /> Weekly Activity Log
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Week navigator */}
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => setWeekOffset(o => o - 1)} data-testid="button-sales-week-prev">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-bold text-blue-900 min-w-[168px] text-center tabular-nums" data-testid="text-sales-week-label">{weekLabel}</span>
                    <Button size="icon" variant="outline" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0} data-testid="button-sales-week-next">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {weekOffset !== 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} data-testid="button-sales-week-today">This week</Button>
                    )}
                  </div>
                  {/* Actions */}
                  <Button size="sm" variant="outline" onClick={handleValidate} disabled={isValidating} className="font-bold border-slate-200 rounded-lg">
                    <ShieldCheck className="w-4 h-4 mr-2 text-green-600" /> {isValidating ? "Checking..." : "Validate"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="font-bold border-slate-200 rounded-lg">
                    <Upload className="w-4 h-4 mr-2 text-blue-600" /> Bulk Import
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[560px] overflow-y-auto">
                {recentSales.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-bold">No sales logged this week</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-blue-900/5 border-b border-blue-100 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-6 py-4 text-[10px] font-bold text-blue-900 uppercase tracking-widest">Date / Channel</th>
                        <th className="text-right px-6 py-4 text-[10px] font-bold text-blue-900 uppercase tracking-widest">Amount</th>
                        <th className="text-right px-6 py-4 text-[10px] font-bold text-blue-900 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-blue-50/40 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${getChannelColor(sale.orderChannel)}`} />
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{sale.orderChannel}</p>
                                <p className="text-[11px] font-bold text-slate-400 uppercase">{formatDateDDMMYY(sale.date)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="font-black text-blue-900 text-base">฿{parseFloat(sale.totalSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            {parseFloat(sale.grabFee) > 0 && <p className="text-[10px] font-bold text-red-500">-฿{sale.grabFee} App Fee</p>}
                          </td>
                          <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => handleEditSale(sale)} className="h-8 w-8 hover:bg-blue-100 hover:text-blue-700 rounded-lg">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { setDeletingSaleId(sale.id); setIsDeleteDialogOpen(true); }} className="h-8 w-8 hover:bg-red-100 hover:text-red-700 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Sale Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingSale(null); }}>
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-blue-900 uppercase tracking-tight">Edit Sale Entry</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Update the details for this sale record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-500">Date</Label>
                <Input
                  type="date"
                  value={editFormData.date || ""}
                  onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="h-11 rounded-xl border-slate-200"
                  data-testid="input-edit-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-500">Channel</Label>
                <Select value={editFormData.orderChannel || ""} onValueChange={v => setEditFormData({ ...editFormData, orderChannel: v })}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200" data-testid="select-edit-channel">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-black uppercase text-blue-900">Gross Sales (฿)</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-base">฿</span>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.netSales || ""}
                  onChange={e => setEditFormData({ ...editFormData, netSales: e.target.value })}
                  className="h-12 pl-8 rounded-xl border-blue-200 bg-blue-50/40 text-blue-900 font-bold text-lg"
                  placeholder="0.00"
                  data-testid="input-edit-netsales"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-500">App / Grab Fee (฿)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">฿</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.grabFee || ""}
                    onChange={e => setEditFormData({ ...editFormData, grabFee: e.target.value })}
                    className="h-11 pl-7 rounded-xl border-red-200 bg-red-50/40 text-red-600"
                    placeholder="0"
                    data-testid="input-edit-grabfee"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase text-slate-500">Other / Tips (฿)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-sm">฿</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.otherSales || ""}
                    onChange={e => setEditFormData({ ...editFormData, otherSales: e.target.value })}
                    className="h-11 pl-7 rounded-xl"
                    placeholder="0"
                    data-testid="input-edit-othersales"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase text-slate-500">Ref / Note</Label>
              <Input
                type="text"
                value={editFormData.otherSalesNote || ""}
                onChange={e => setEditFormData({ ...editFormData, otherSalesNote: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="Optional reference"
                data-testid="input-edit-note"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setIsEditDialogOpen(false); setEditingSale(null); }}
                className="flex-1 h-12 rounded-xl font-black uppercase text-xs border-slate-200"
                data-testid="button-edit-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={() => editSaleMutation.mutate(editFormData)}
                disabled={editSaleMutation.isPending}
                className="flex-1 h-12 bg-blue-900 text-yellow-400 rounded-xl font-black uppercase text-xs tracking-widest"
                data-testid="button-edit-save"
              >
                {editSaleMutation.isPending ? <Loader2 className="animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-slate-900">REMOVE ENTRY?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500">This will permanently delete this sale from the Yens Thai database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold border-slate-200">CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deletingSaleId) apiRequest('DELETE', `/api/admin/sales/${deletingSaleId}`).then(() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
                setIsDeleteDialogOpen(false);
                toast({ title: "Entry Removed" });
              });
            }} className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl border-none">DELETE ENTRY</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
