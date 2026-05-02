/* LEF'S BRANDED SALES TRACKER UPDATE */
/* Changes: Softened Yens Yellow accents, improved contrast and professional spacing */

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
import { Calendar as CalendarIcon, Plus, FileSpreadsheet, Pencil, Trash2, Search, FileText, Loader2, ShieldCheck, Wallet, PlusCircle } from "lucide-react";
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

export default function SalesTrackerDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
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
  const [reportStartDate, setReportStartDate] = useState(today);
  const [reportEndDate, setReportEndDate] = useState(today);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: metrics } = useQuery<any>({ queryKey: ['/api/admin/sales-tracker-metrics'] });
  const { data: allSales = [] } = useQuery<DailySales[]>({ queryKey: ['/api/admin/sales-overview'] });
  const { data: sites = [] } = useQuery<Site[]>({ queryKey: ['/api/admin/sites'] });

  const channels = useMemo(() => {
    return sites.filter(s => s.isActive && s.channelName).map(s => s.channelName).sort();
  }, [sites]);

  const recentSales = useMemo(() => {
    return [...allSales].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [allSales]);

  const addSaleMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/admin/sales', {
      ...data, 
      netSales: (parseFloat(data.netSales) || 0).toFixed(2),
      grabFee: (parseFloat(data.grabFee) || 0).toFixed(2),
      totalSales: ((parseFloat(data.netSales) || 0) + (parseFloat(data.otherSales) || 0)).toFixed(2),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
      toast({ title: "Sale Logged", description: "Yens Thai records updated." });
      setFormData({ date: today, orderChannel: "", netSales: "", otherSales: "0", otherSalesNote: "", grabFee: "0" });
    },
  });

  const getChannelColor = (channel: string) => {
    const colors: Record<string, string> = {
      RIVER: "bg-blue-500", SHOP: "bg-purple-500", SHOPZY: "bg-amber-500",
      GRAB: "bg-emerald-500", LINEMAN: "bg-green-600", FOODPANDA: "bg-pink-500",
    };
    return colors[channel] || "bg-slate-400";
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Softened Header - Only a top border of Yens Yellow */}
      <div className="bg-white border-t-8 border-[#FCD34D] shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt="Yens Logo" className="w-16 h-16 rounded-2xl shadow-sm border border-slate-100" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">SALES TRACKER</h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#FCD34D] text-amber-900 hover:bg-[#FCD34D] border-none font-bold text-[10px]">OFFICIAL ADMIN</Badge>
                <span className="text-slate-400 text-xs font-medium">Nakhon Sawan Terminal</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
             <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="text-slate-600 font-bold text-xs">
                  <CalendarIcon className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  {reportStartDate === reportEndDate ? formatDateDDMMYY(reportStartDate) : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64"><Input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} /></PopoverContent>
            </Popover>
            <Button size="sm" className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-lg">
              <FileText className="h-3.5 w-3.5 mr-2" /> REPORT
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* KPI Row - Minimalist Design */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "This Week", val: metrics?.currentWeekSales, color: "border-blue-200" },
            { label: "This Month", val: metrics?.currentMonthSales, color: "border-green-200" },
            { label: "Daily Avg", val: metrics?.weeklyDailyAvg, color: "border-amber-200" },
            { label: "Year to Date", val: metrics?.ytdSales, color: "border-slate-200", dark: true },
          ].map((kpi, i) => (
            <Card key={i} className={`border-none shadow-sm ${kpi.dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
              <CardContent className="p-5">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${kpi.dark ? 'text-slate-400' : 'text-slate-400'}`}>{kpi.label}</p>
                <h3 className="text-2xl font-black mt-1">฿{(kpi.val ?? 0).toLocaleString()}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form Side */}
          <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl bg-white border border-slate-100">
            <CardHeader className="border-b border-slate-50 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <PlusCircle className="text-[#FCD34D] h-5 w-5" /> New Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); addSaleMutation.mutate(formData); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Date</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-slate-50 border-none font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">Channel</Label>
                    <Select value={formData.orderChannel} onValueChange={v => setFormData({...formData, orderChannel: v})}>
                      <SelectTrigger className="bg-slate-50 border-none font-medium"><SelectValue placeholder="Channel" /></SelectTrigger>
                      <SelectContent>{channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/50 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-amber-600 uppercase">Gross Sales</Label>
                    <Input type="number" value={formData.netSales} onChange={e => setFormData({...formData, netSales: e.target.value})} className="bg-white border-amber-200 font-bold" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-red-400 uppercase">App Fees</Label>
                    <Input type="number" value={formData.grabFee} onChange={e => setFormData({...formData, grabFee: e.target.value})} className="bg-white border-red-100 text-red-500 font-bold" placeholder="0" />
                  </div>
                </div>

                <Button type="submit" disabled={addSaleMutation.isPending} className="w-full h-12 bg-[#FCD34D] hover:bg-[#fbd035] text-amber-950 font-black text-sm rounded-xl shadow-sm transition-all active:scale-[0.98]">
                  {addSaleMutation.isPending ? <Loader2 className="animate-spin" /> : "RECORD TRANSACTION"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* List Side */}
          <Card className="lg:col-span-3 border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-800">Weekly Log</CardTitle>
                <Button variant="outline" size="sm" className="text-[10px] font-bold h-7 border-slate-200">
                  <FileSpreadsheet className="h-3 w-3 mr-1" /> EXPORT
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[440px] overflow-y-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-50">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${getChannelColor(sale.orderChannel)}`} />
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{sale.orderChannel}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{formatDateDDMMYY(sale.date)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-black text-slate-800 text-sm">฿{parseFloat(sale.totalSales).toLocaleString()}</p>
                          {parseFloat(sale.grabFee) > 0 && <p className="text-[9px] font-bold text-red-400">-฿{sale.grabFee} fee</p>}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <Button size="icon" variant="ghost" onClick={() => { setDeletingSaleId(sale.id); setIsDeleteDialogOpen(true); }} className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                             <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
                setIsDeleteDialogOpen(false);
              });
            }} className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl border-none">DELETE ENTRY</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
