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
  const [reportData, setReportData] = useState<any>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
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
      setReportData(data);
      setIsReportDialogOpen(true);
    } catch (err: any) {
      toast({ title: "Report failed", description: err?.message || "Could not generate report", variant: "destructive" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) return;
    const data = reportData;

    const fmtPdf = (n: number) => `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const YELLOW: [number, number, number] = [252, 211, 77];
    const BLUE_DARK: [number, number, number] = [30, 58, 138];
    const BLUE_MID: [number, number, number] = [37, 99, 235];
    const WHITE: [number, number, number] = [255, 255, 255];
    const GREY_ROW: [number, number, number] = [248, 250, 252];
    const GREY_TEXT: [number, number, number] = [71, 85, 105];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // Load Sarabun Thai font (supports ฿ and all Thai characters)
    try {
      const fontRes = await fetch('/fonts/Sarabun-Regular.ttf');
      const fontBuf = await fontRes.arrayBuffer();
      const fontBytes = new Uint8Array(fontBuf);
      let fontB64 = '';
      for (let i = 0; i < fontBytes.length; i += 1024) {
        fontB64 += String.fromCharCode(...fontBytes.subarray(i, i + 1024));
      }
      fontB64 = btoa(fontB64);
      doc.addFileToVFS('Sarabun-Regular.ttf', fontB64);
      doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
      doc.setFont('Sarabun', 'normal');
    } catch {
      doc.setFont('helvetica', 'normal');
    }

    // Pre-load logo image
    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = logoUrl;
      await new Promise<void>((res, rej) => { logoImg!.onload = () => res(); logoImg!.onerror = () => rej(); });
    } catch { logoImg = null; }

    const setHeadingFont = () => doc.setFont('Sarabun', 'normal');
    const setBodyFont = () => doc.setFont('Sarabun', 'normal');

    const drawPageHeader = (title: string) => {
      doc.setFillColor(...YELLOW);
      doc.rect(0, 0, W, 30, 'F');
      doc.setFillColor(...BLUE_DARK);
      doc.rect(0, 30, W, 2, 'F');
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 5, 3, 24, 24);
      } else {
        doc.setFillColor(...BLUE_DARK);
        doc.circle(17, 15, 11, 'F');
        doc.setFontSize(8); doc.setTextColor(...WHITE);
        setHeadingFont();
        doc.text("YEN'S", 17, 14, { align: 'center' });
        doc.text("THAI", 17, 19, { align: 'center' });
      }
      doc.setFontSize(20); doc.setTextColor(...BLUE_DARK); setHeadingFont();
      doc.text(title, 33, 13);
      doc.setFontSize(9); setBodyFont(); doc.setTextColor(...GREY_TEXT);
      doc.text("Yen's Thai Ice Cream  -  Nakhon Sawan", 33, 20);
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 33, 26);
    };

    // ── PAGE 1 ────────────────────────────────────────────────────────
    drawPageHeader("Sales Report");

    doc.setFillColor(...BLUE_MID);
    doc.roundedRect(14, 36, W - 28, 9, 2, 2, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
    doc.text(`Period: ${formatDateDDMMYY(reportStartDate)}  to  ${formatDateDDMMYY(reportEndDate)}`, W / 2, 42, { align: 'center' });

    // Summary cards — row of 3, then row of 2 centred
    const summaryItems = [
      { label: 'Total Net Sales', value: fmtPdf(data.summary.totalNetSales) },
      { label: 'Other Sales',     value: fmtPdf(data.summary.totalOtherSales) },
      { label: 'Total Sales',     value: fmtPdf(data.summary.totalSales) },
      { label: 'Days Logged',     value: String(data.summary.transactionCount) },
      { label: 'Avg / Day',       value: fmtPdf(data.summary.avgTransaction) },
    ];
    const cW = (W - 28 - 8) / 3;
    [[0,1,2],[3,4]].forEach((row, ri) => {
      const rowW = row.length === 3 ? W - 28 : (cW * 2 + 4);
      const startX = row.length === 3 ? 14 : (W - rowW) / 2;
      const cy = 50 + ri * 22;
      row.forEach((idx, ci) => {
        const bx = startX + ci * (cW + 4);
        doc.setFillColor(...WHITE); doc.setDrawColor(...YELLOW); doc.setLineWidth(0.5);
        doc.roundedRect(bx, cy, cW, 17, 2, 2, 'FD');
        doc.setFontSize(7); doc.setFont('Sarabun', 'normal'); doc.setTextColor(...GREY_TEXT);
        doc.text(summaryItems[idx].label.toUpperCase(), bx + cW / 2, cy + 6, { align: 'center' });
        doc.setFontSize(10); doc.setFont('Sarabun', 'normal'); doc.setTextColor(...BLUE_DARK);
        doc.text(summaryItems[idx].value, bx + cW / 2, cy + 13, { align: 'center' });
      });
    });

    const tblFont = 'Sarabun';
    let nextY = 100;

    doc.setFontSize(12); doc.setFont('Sarabun', 'normal'); doc.setTextColor(...BLUE_DARK);
    doc.text('Sales by Channel', 14, nextY);
    autoTable(doc, {
      startY: nextY + 3,
      head: [['Channel', 'Revenue (฿)', 'Days']],
      body: data.channelBreakdown.map((c: any) => [c.channel, fmtPdf(c.revenue), c.count.toString()]),
      styles: { font: tblFont, fontSize: 9 },
      headStyles: { fillColor: YELLOW, textColor: BLUE_DARK, fontStyle: 'bold' },
      bodyStyles: { textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: GREY_ROW },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12); doc.setFont('Sarabun', 'normal'); doc.setTextColor(...BLUE_DARK);
    doc.text('Sales by Day of Week', 14, nextY);
    autoTable(doc, {
      startY: nextY + 3,
      head: [['Day', 'Revenue (฿)', 'Days']],
      body: data.dayBreakdown.map((d: any) => [d.day, fmtPdf(d.revenue), d.count.toString()]),
      styles: { font: tblFont, fontSize: 9 },
      headStyles: { fillColor: YELLOW, textColor: BLUE_DARK, fontStyle: 'bold' },
      bodyStyles: { textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: GREY_ROW },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });

    // ── PAGE 2: Transaction log ───────────────────────────────────────
    doc.addPage();
    drawPageHeader("Transaction Details");
    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Day', 'Channel', 'Net Sales (฿)', 'Other (฿)', 'Note', 'Total (฿)']],
      body: data.transactions.map((t: any) => [
        formatDateDDMMYY(t.date), t.dayOfWeek || '-', t.channel,
        fmtPdf(t.netSales), fmtPdf(t.otherSales), t.otherSalesNote || '-', fmtPdf(t.totalSales),
      ]),
      styles: { font: tblFont, fontSize: 8 },
      headStyles: { fillColor: YELLOW, textColor: BLUE_DARK, fontStyle: 'bold' },
      bodyStyles: { textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: GREY_ROW },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 6: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setFont('Sarabun', 'normal'); doc.setTextColor(...GREY_TEXT);
      doc.text(`Page ${i} of ${pageCount}  |  Yen's Thai Ice Cream  |  Confidential`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
    }

    doc.save(`yens-sales-report-${reportStartDate}-to-${reportEndDate}.pdf`);
    toast({ title: "PDF saved", description: `${data.summary.transactionCount} days exported` });
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

      {/* Report Preview Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          {reportData && (
            <>
              {/* Header */}
              <div className="bg-[#FCD34D] px-6 py-4 flex items-center gap-4 rounded-t-2xl">
                <img src={logoUrl} alt="Yen's" className="w-14 h-14 rounded-full border-2 border-blue-900" />
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-blue-900 leading-tight">Sales Report</h2>
                  <p className="text-blue-800 text-sm font-medium">Yen's Thai Ice Cream · Nakhon Sawan</p>
                  <p className="text-blue-700 text-xs">Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <Button onClick={handleExportPDF} className="bg-blue-900 text-yellow-400 font-black rounded-xl gap-2 shrink-0">
                  <FileText className="h-4 w-4" /> Download PDF
                </Button>
              </div>

              {/* Period bar */}
              <div className="bg-blue-700 text-white text-center font-bold py-2 text-sm tracking-wide">
                Period: {formatDateDDMMYY(reportData.startDate)} &nbsp;–&nbsp; {formatDateDDMMYY(reportData.endDate)}
              </div>

              <div className="p-6 space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Net Sales', value: `฿${Number(reportData.summary.totalNetSales).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                    { label: 'Other Sales',     value: `฿${Number(reportData.summary.totalOtherSales).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                    { label: 'Total Sales',     value: `฿${Number(reportData.summary.totalSales).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                    { label: 'Days Logged',     value: String(reportData.summary.transactionCount) },
                    { label: 'Avg / Day',       value: `฿${Number(reportData.summary.avgTransaction).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                  ].map((item) => (
                    <div key={item.label} className="border border-yellow-300 rounded-xl p-3 text-center bg-white">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="text-lg font-black text-blue-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Channel breakdown */}
                <div>
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-2">Sales by Channel</h3>
                  <table className="w-full text-sm rounded-xl overflow-hidden border border-slate-100">
                    <thead>
                      <tr className="bg-yellow-300 text-blue-900">
                        <th className="text-left px-3 py-2 font-black">Channel</th>
                        <th className="text-right px-3 py-2 font-black">Revenue (฿)</th>
                        <th className="text-center px-3 py-2 font-black">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.channelBreakdown.map((c: any, i: number) => (
                        <tr key={c.channel} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="px-3 py-2 font-medium">{c.channel}</td>
                          <td className="px-3 py-2 text-right font-mono">฿{Number(c.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Day of week breakdown */}
                <div>
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-2">Sales by Day of Week</h3>
                  <table className="w-full text-sm rounded-xl overflow-hidden border border-slate-100">
                    <thead>
                      <tr className="bg-yellow-300 text-blue-900">
                        <th className="text-left px-3 py-2 font-black">Day</th>
                        <th className="text-right px-3 py-2 font-black">Revenue (฿)</th>
                        <th className="text-center px-3 py-2 font-black">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.dayBreakdown.map((d: any, i: number) => (
                        <tr key={d.day} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="px-3 py-2 font-medium">{d.day}</td>
                          <td className="px-3 py-2 text-right font-mono">฿{Number(d.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Transaction log */}
                <div>
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-2">Transaction Log</h3>
                  <table className="w-full text-xs rounded-xl overflow-hidden border border-slate-100">
                    <thead>
                      <tr className="bg-yellow-300 text-blue-900">
                        <th className="text-left px-2 py-2 font-black">Date</th>
                        <th className="text-left px-2 py-2 font-black">Day</th>
                        <th className="text-left px-2 py-2 font-black">Channel</th>
                        <th className="text-right px-2 py-2 font-black">Net Sales</th>
                        <th className="text-right px-2 py-2 font-black">Other</th>
                        <th className="text-right px-2 py-2 font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.transactions.map((t: any, i: number) => (
                        <tr key={t.id} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="px-2 py-1.5">{formatDateDDMMYY(t.date)}</td>
                          <td className="px-2 py-1.5 text-slate-500">{t.dayOfWeek || '-'}</td>
                          <td className="px-2 py-1.5 font-medium">{t.channel}</td>
                          <td className="px-2 py-1.5 text-right font-mono">฿{Number(t.netSales).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-slate-500">฿{Number(t.otherSales).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-bold text-blue-900">฿{Number(t.totalSales).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setIsReportDialogOpen(false)} className="rounded-xl">Close</Button>
                  <Button onClick={handleExportPDF} className="bg-blue-900 text-yellow-400 font-black rounded-xl gap-2">
                    <FileText className="h-4 w-4" /> Download PDF
                  </Button>
                </div>
              </div>
            </>
          )}
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
