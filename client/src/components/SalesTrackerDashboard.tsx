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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(getMonday);
  const [draftEnd, setDraftEnd] = useState(today);
  const [activePreset, setActivePreset] = useState<string | null>("This Week");

  const openPicker = () => {
    setDraftStart(reportStartDate);
    setDraftEnd(reportEndDate);
    setActivePreset(null);
    setPickerOpen(true);
  };
  const applyPicker = () => {
    setReportStartDate(draftStart);
    setReportEndDate(draftEnd);
    setPickerOpen(false);
  };
  const cancelPicker = () => setPickerOpen(false);

  const pickerPresets = [
    { label: "Today", start: () => today, end: () => today },
    { label: "Yesterday", start: () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; }, end: () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; } },
    { label: "Last 7 days", start: () => { const d = new Date(); d.setDate(d.getDate()-6); return d.toISOString().split('T')[0]; }, end: () => today },
    { label: "Last 30 days", start: () => { const d = new Date(); d.setDate(d.getDate()-29); return d.toISOString().split('T')[0]; }, end: () => today },
    { label: "This week", start: () => getMonday(), end: () => today },
    { label: "Last week", start: () => { const d = new Date(); const day = d.getDay(); const diff = day===0?-6:1-day; const mon = new Date(d); mon.setDate(d.getDate()+diff-7); return mon.toISOString().split('T')[0]; }, end: () => { const d = new Date(); const day = d.getDay(); const diff = day===0?-6:1-day; const mon = new Date(d); mon.setDate(d.getDate()+diff-7); const sun = new Date(mon); sun.setDate(mon.getDate()+6); return sun.toISOString().split('T')[0]; } },
    { label: "This month", start: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }, end: () => today },
    { label: "Last month", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth()-1, 1).toISOString().split('T')[0]; }, end: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]; } },
    { label: "This year", start: () => `${new Date().getFullYear()}-01-01`, end: () => today },
  ];

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

      // Theme colours
      const YELLOW: [number, number, number] = [252, 211, 77];
      const BLUE_DARK: [number, number, number] = [30, 58, 138];
      const BLUE_MID: [number, number, number] = [37, 99, 235];
      const WHITE: [number, number, number] = [255, 255, 255];
      const GREY_ROW: [number, number, number] = [248, 250, 252];
      const GREY_TEXT: [number, number, number] = [71, 85, 105];

      const fmt = (n: number) => `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();

      const drawPageHeader = (title: string) => {
        // Yellow banner
        doc.setFillColor(...YELLOW);
        doc.rect(0, 0, W, 28, 'F');
        // Blue accent stripe
        doc.setFillColor(...BLUE_DARK);
        doc.rect(0, 28, W, 2, 'F');
        // Logo circle placeholder
        doc.setFillColor(...BLUE_DARK);
        doc.circle(20, 14, 10, 'F');
        doc.setFontSize(9);
        doc.setTextColor(...WHITE);
        doc.setFont('helvetica', 'bold');
        doc.text("YEN'S", 20, 13, { align: 'center' });
        doc.text("THAI", 20, 17.5, { align: 'center' });
        // Title text
        doc.setFontSize(18);
        doc.setTextColor(...BLUE_DARK);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 34, 12);
        // Subtitle
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GREY_TEXT);
        doc.text('Yen\'s Thai Ice Cream · Nakhon Sawan', 34, 19);
        doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 34, 24);
      };

      // ── PAGE 1 ────────────────────────────────────────────────────────
      drawPageHeader("Sales Report");

      // Period badge
      doc.setFillColor(...BLUE_MID);
      doc.roundedRect(14, 34, W - 28, 9, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(`Period: ${formatDateDDMMYY(reportStartDate)}  –  ${formatDateDDMMYY(reportEndDate)}`, W / 2, 40, { align: 'center' });

      // ── Summary cards ─────────────────────────────────────────────────
      const summaryItems = [
        { label: 'Total Net Sales', value: fmt(data.summary.totalNetSales) },
        { label: 'Other Sales', value: fmt(data.summary.totalOtherSales) },
        { label: 'Total Sales', value: fmt(data.summary.totalSales) },
        { label: 'Days Logged', value: String(data.summary.transactionCount) },
        { label: 'Avg / Day', value: fmt(data.summary.avgTransaction) },
      ];
      const cardW = (W - 28 - 8) / 3;
      let cx = 14;
      let cy = 48;
      summaryItems.forEach((item, i) => {
        if (i === 3) { cx = 14 + cardW + 4; cy = 48 + 22; }
        if (i === 4) { cx = 14 + (cardW + 4) * 2; cy = 48 + 22; }
        doc.setFillColor(...WHITE);
        doc.setDrawColor(...YELLOW);
        doc.setLineWidth(0.5);
        doc.roundedRect(cx + (i < 3 ? (cardW + 4) * i : 0), cy, cardW, 18, 2, 2, 'FD');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GREY_TEXT);
        const bx = cx + (i < 3 ? (cardW + 4) * i : 0) + cardW / 2;
        doc.text(item.label.toUpperCase(), bx, cy + 6, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE_DARK);
        doc.text(item.value, bx, cy + 13, { align: 'center' });
      });

      let nextY = 96;

      // ── Channel breakdown ─────────────────────────────────────────────
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE_DARK);
      doc.text('Sales by Channel', 14, nextY);

      autoTable(doc, {
        startY: nextY + 3,
        head: [['Channel', 'Revenue (THB)', 'Days']],
        body: data.channelBreakdown.map((c: { channel: string; revenue: number; count: number }) => [
          c.channel,
          fmt(c.revenue),
          c.count.toString(),
        ]),
        headStyles: { fillColor: YELLOW, textColor: BLUE_DARK, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: GREY_ROW },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
        margin: { left: 14, right: 14 },
      });

      nextY = (doc as any).lastAutoTable.finalY + 10;

      // ── Day of week breakdown ─────────────────────────────────────────
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE_DARK);
      doc.text('Sales by Day of Week', 14, nextY);

      autoTable(doc, {
        startY: nextY + 3,
        head: [['Day', 'Revenue (THB)', 'Days']],
        body: data.dayBreakdown.map((d: { day: string; revenue: number; count: number }) => [
          d.day,
          fmt(d.revenue),
          d.count.toString(),
        ]),
        headStyles: { fillColor: YELLOW, textColor: BLUE_DARK, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: GREY_ROW },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
        margin: { left: 14, right: 14 },
      });

      // ── PAGE 2: Transaction log ───────────────────────────────────────
      doc.addPage();
      drawPageHeader("Transaction Details");

      autoTable(doc, {
        startY: 34,
        head: [['Date', 'Day', 'Channel', 'Net Sales', 'Other', 'Note', 'Total']],
        body: data.transactions.map((t: { date: string; dayOfWeek?: string; channel: string; netSales: number; otherSales: number; otherSalesNote?: string; totalSales: number }) => [
          formatDateDDMMYY(t.date),
          t.dayOfWeek || '-',
          t.channel,
          fmt(t.netSales),
          fmt(t.otherSales),
          t.otherSalesNote || '-',
          fmt(t.totalSales),
        ]),
        headStyles: { fillColor: YELLOW, textColor: BLUE_DARK, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: GREY_ROW },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          6: { halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });

      // Footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...GREY_TEXT);
        doc.text(`Page ${i} of ${pageCount}  ·  Yen's Thai Ice Cream  ·  Confidential`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
      }

      doc.save(`yens-sales-report-${reportStartDate}-to-${reportEndDate}.pdf`);
      toast({ title: "PDF downloaded", description: `${data.summary.transactionCount} days · ${fmt(data.summary.totalSales)}` });
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
            <Popover open={pickerOpen} onOpenChange={(o) => { if (!o) cancelPicker(); }}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="bg-white border-none shadow-sm font-bold text-blue-900 rounded-xl" onClick={openPicker}>
                  <CalendarIcon className="h-4 w-4 mr-2 text-amber-500" />
                  {reportStartDate === reportEndDate ? formatDateDDMMYY(reportStartDate) : `${formatDateDDMMYY(reportStartDate)} - ${formatDateDDMMYY(reportEndDate)}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex">
                  {/* Left: date inputs */}
                  <div className="p-4 border-r border-slate-100 flex flex-col gap-3 min-w-[200px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Range</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Start</p>
                        <Input type="date" value={draftStart} onChange={e => { setDraftStart(e.target.value); setActivePreset(null); }} className="text-sm" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">End</p>
                        <Input type="date" value={draftEnd} onChange={e => { setDraftEnd(e.target.value); setActivePreset(null); }} className="text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-auto pt-2">
                      <Button size="sm" onClick={applyPicker} className="flex-1 bg-blue-600 text-white font-bold rounded-lg">Choose</Button>
                      <Button size="sm" variant="outline" onClick={cancelPicker} className="flex-1 rounded-lg">Cancel</Button>
                    </div>
                  </div>
                  {/* Right: preset list */}
                  <div className="py-2 flex flex-col min-w-[130px]">
                    {pickerPresets.map(({ label, start, end }) => (
                      <button
                        key={label}
                        onClick={() => { setDraftStart(start()); setDraftEnd(end()); setActivePreset(label); }}
                        className={`text-left px-4 py-2 text-sm font-medium transition-colors ${activePreset === label ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >{label}</button>
                    ))}
                  </div>
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
