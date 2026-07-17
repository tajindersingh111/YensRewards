import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from "recharts";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, Activity, Download, DollarSign, Calendar, MapPin, 
  Filter, HelpCircle, ArrowUpRight, BarChart3, FileText,
  Trash2, Pencil, Loader2, ArrowRight
} from "lucide-react";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface POSMetrics {
  pos: {
    todaySales: number;
    todayCount: number;
    currentWeekSales: number;
    currentWeekCount: number;
    lastWeekSales: number;
    currentMonthSales: number;
    currentMonthCount: number;
    lastMonthSales: number;
    ytdSales: number;
    ytdCount: number;
    siteBreakdown: Array<{ site: string; amount: number; count: number }>;
  };
  combinedDaily: Array<{
    date: string;
    posSales: number;
    manualSales: number;
    grandTotal: number;
  }>;
  manualSales: Array<any>;
  transactions: Array<any>;
}

export default function YensPOSDashboard() {
  const [timeframe, setTimeframe] = useState<string>("30"); // 7, 30, 90, all
  const { data, isLoading, error } = useQuery<POSMetrics>({
    queryKey: ["/api/admin/pos-metrics"],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedDetail, setSelectedDetail] = useState<{ type: "site" | "date"; value: string } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [editingManualSale, setEditingManualSale] = useState<any | null>(null);

  // Mutation to delete a POS transaction
  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pos-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-overview"] });
      toast({
        title: "Transaction Deleted",
        description: "The transaction has been deleted and loyalty balance recalculated.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update a POS transaction
  const updateTxMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/admin/transactions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pos-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-overview"] });
      setEditingTransaction(null);
      toast({
        title: "Transaction Updated",
        description: "The transaction details have been updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update transaction.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a Manual Sale
  const deleteManualSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pos-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-tracker-metrics"] });
      toast({
        title: "Manual Sale Deleted",
        description: "The manual sale entry has been deleted successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete manual sale.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update a Manual Sale
  const updateManualSaleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/admin/sales/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pos-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-tracker-metrics"] });
      setEditingManualSale(null);
      toast({
        title: "Manual Sale Updated",
        description: "The manual sale details have been updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update manual sale.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="p-8 text-center bg-red-50 text-red-800 rounded-3xl border border-red-100 max-w-md shadow-lg animate-in fade-in duration-300">
          <p className="text-xs font-black uppercase tracking-widest text-red-600">Engine Fault</p>
          <p className="text-xs mt-3 font-semibold opacity-90">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-blue-900 animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading POS Engine...</p>
        </div>
      </div>
    );
  }

  // Filter combined daily data based on timeframe selection
  const getFilteredData = () => {
    const list = [...data.combinedDaily];
    // Sort oldest to newest for the chart, but newest to oldest for the table
    if (timeframe === "all") return list;
    const days = parseInt(timeframe, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return list.filter(row => row.date >= cutoffStr);
  };

  const filteredDataForTable = getFilteredData();
  // Chart requires chronological order (oldest to newest)
  const filteredDataForChart = [...filteredDataForTable].reverse();

  const fmtCurrency = (val: number) => 
    `฿${(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtInt = (val: number) => (val || 0).toLocaleString("en-US");

  // Calculate stats based on timeframe
  const getFilteredManualSales = () => {
    const list = [...data.manualSales];
    if (timeframe === "all") return list;
    const days = parseInt(timeframe, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return list.filter(row => row.date >= cutoffStr);
  };

  const getFilteredTransactions = () => {
    const list = [...data.transactions];
    if (timeframe === "all") return list;
    const days = parseInt(timeframe, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return list.filter(row => {
      const dateStr = row.createdAt ? row.createdAt.substring(0, 10) : '';
      return dateStr >= cutoffStr;
    });
  };

  const handleExportPDF = async () => {
    const YELLOW:    [number,number,number] = [252, 196,  56];
    const NAVY:      [number,number,number] = [ 30,  58, 138];
    const NAVY_MID:  [number,number,number] = [ 37,  99, 235];
    const WHITE:     [number,number,number] = [255, 255, 255];
    const RULE:      [number,number,number] = [226, 232, 240];
    const GREY_DARK: [number,number,number] = [ 51,  65,  85];
    const GREY_MID:  [number,number,number] = [100, 116, 139];
    const GREEN:     [number,number,number] = [ 22, 163,  74];

    const fmtPdf   = (n: number) => `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtIntPdf = (n: number) => n.toLocaleString('en-US');

    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W    = doc.internal.pageSize.getWidth();
    const H    = doc.internal.pageSize.getHeight();
    const FONT = 'Sarabun';

    try {
      const fontRes  = await fetch('/fonts/Sarabun-Regular.ttf');
      const fontBuf  = await fontRes.arrayBuffer();
      const fontBytes = new Uint8Array(fontBuf);
      let b64 = '';
      for (let i = 0; i < fontBytes.length; i += 1024)
        b64 += String.fromCharCode(...Array.from(fontBytes.subarray(i, i + 1024)));
      b64 = btoa(b64);
      doc.addFileToVFS('Sarabun-Regular.ttf', b64);
      doc.addFont('Sarabun-Regular.ttf', FONT, 'normal');
      doc.setFont(FONT, 'normal');
    } catch { doc.setFont('helvetica', 'normal'); }

    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = logoUrl;
      await new Promise<void>((res, rej) => { logoImg!.onload = () => res(); logoImg!.onerror = () => rej(); });
    } catch { logoImg = null; }

    const sf = (size: number, color: [number,number,number] = GREY_DARK) => {
      doc.setFontSize(size);
      doc.setFont(FONT, 'normal');
      doc.setTextColor(...color);
    };

    const sectionHeading = (label: string, y: number) => {
      doc.setFillColor(...YELLOW);
      doc.rect(14, y - 4, 3, 5.5, 'F');
      sf(11, NAVY);
      doc.text(label, 20, y);
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.3);
      doc.line(14, y + 2, W - 14, y + 2);
    };

    const drawPageHeader = (title: string, subtitle = '') => {
      doc.setFillColor(...YELLOW);
      doc.rect(0, 0, W, 36, 'F');
      doc.setFillColor(...NAVY);
      doc.rect(0, 36, W, 1.5, 'F');

      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 7, 3, 30, 30);
      } else {
        doc.setFillColor(...NAVY);
        doc.circle(22, 18, 13, 'F');
        sf(9, WHITE); doc.text("YEN'S", 22, 16, { align: 'center' });
        sf(7, WHITE); doc.text("THAI", 22, 22, { align: 'center' });
      }

      sf(22, NAVY); doc.text(title, 42, 16);
      sf(9, GREY_DARK); doc.text("Yen's Thai Ice Cream  –  Nakhon Sawan", 42, 24);
      if (subtitle) { sf(8, GREY_MID); doc.text(subtitle, 42, 30); }

      sf(7, GREY_MID);
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - 14, 30, { align: 'right' });
    };

    const drawFooter = (pageNum: number, totalPages: number) => {
      const fy = H - 10;
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.4);
      doc.line(14, fy - 2, W - 14, fy - 2);
      sf(7, GREY_MID);
      doc.text("Yen's Thai Ice Cream  |  Nakhon Sawan  |  Confidential", 14, fy + 2);
      doc.text(`Page ${pageNum} of ${totalPages}`, W - 14, fy + 2, { align: 'right' });
    };

    const dateRangeStr = timeframe === "all" ? "All Time" : `Last ${timeframe} Days`;

    // ── PAGE 1: Summary & Sites ──
    drawPageHeader("POS & Combined Sales Report", dateRangeStr);

    doc.setFillColor(...NAVY);
    doc.roundedRect(14, 42, W - 28, 11, 2, 2, 'F');
    sf(10, WHITE);
    doc.text(`REPORTING TIMEFRAME: ${dateRangeStr.toUpperCase()}`, W / 2, 49, { align: 'center' });

    const filteredTxs = getFilteredTransactions();
    const filteredManual = getFilteredManualSales();
    const filteredCombined = getFilteredData();

    const sumPOS = filteredTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const sumManual = filteredManual.reduce((sum, m) => sum + parseFloat(m.totalSales), 0);
    const grandSum = sumPOS + sumManual;

    const summaryItems = [
      { label: 'TOTAL POS SALES', value: fmtPdf(sumPOS), accent: YELLOW },
      { label: 'TOTAL MANUAL SALES', value: fmtPdf(sumManual), accent: GREY_MID },
      { label: 'GRAND TOTAL REVENUE', value: fmtPdf(grandSum), accent: GREEN },
      { label: 'TOTAL TRANSACTIONS', value: fmtIntPdf(filteredTxs.length), accent: NAVY_MID }
    ];

    const cardGap = 3.5;
    const cardW = (W - 28 - cardGap * 3) / 4;
    const cardH = 20;
    const cardY = 57;

    summaryItems.forEach((item, idx) => {
      const bx = 14 + idx * (cardW + cardGap);
      doc.setFillColor(...WHITE);
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.3);
      doc.roundedRect(bx, cardY, cardW, cardH, 2, 2, 'FD');
      
      doc.setFillColor(...item.accent);
      doc.roundedRect(bx, cardY, cardW, 2.5, 2, 2, 'F');
      doc.rect(bx, cardY + 1.25, cardW, 1.25, 'F');

      sf(6, GREY_MID);
      doc.text(item.label, bx + cardW / 2, cardY + 7.5, { align: 'center' });
      sf(9, NAVY);
      doc.text(item.value, bx + cardW / 2, cardY + 15, { align: 'center' });
    });

    let siteY = 86;
    sectionHeading('POS Sales by Site / Location', siteY);

    const siteSalesMap: Record<string, { amount: number; count: number }> = {};
    for (const t of filteredTxs) {
      const loc = t.location || 'Unknown';
      siteSalesMap[loc] = siteSalesMap[loc] || { amount: 0, count: 0 };
      siteSalesMap[loc].amount += parseFloat(t.amount);
      siteSalesMap[loc].count += 1;
    }
    const siteRows = Object.entries(siteSalesMap).map(([site, val]) => [
      site,
      fmtIntPdf(val.count),
      fmtPdf(val.amount)
    ]).sort((a, b) => b[2].localeCompare(a[2]));

    autoTable(doc, {
      startY: siteY + 5,
      head: [['Branch Location', 'Transactions Count', 'POS Revenue (฿)']],
      body: siteRows.length > 0 ? siteRows : [['-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, font: FONT },
      bodyStyles: { font: FONT, fontSize: 8, textColor: GREY_DARK },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: 'center' },
        2: { cellWidth: doc.internal.pageSize.getWidth() - 144 - 14, halign: 'right' }
      }
    });

    drawFooter(1, 4);

    // ── PAGE 2: Manual Sales list ──
    doc.addPage();
    drawPageHeader("POS & Combined Sales Report", dateRangeStr);
    let sectionY = 42;
    sectionHeading('Manual Sales Tracker Records', sectionY);

    const manualRows = filteredManual.map(m => [
      m.date,
      m.dayOfWeek,
      m.orderChannel,
      fmtPdf(parseFloat(m.netSales)),
      fmtPdf(parseFloat(m.grabFee || '0')),
      fmtPdf(parseFloat(m.totalSales))
    ]);

    autoTable(doc, {
      startY: sectionY + 5,
      head: [['Date', 'Day', 'Sales Channel', 'Net Sales', 'Platform Fee', 'Total Sales']],
      body: manualRows.length > 0 ? manualRows : [['-', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: NAVY_MID, textColor: WHITE, fontSize: 8, font: FONT },
      bodyStyles: { font: FONT, fontSize: 7.5, textColor: GREY_DARK },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 45 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: doc.internal.pageSize.getWidth() - 164 - 14, halign: 'right' }
      }
    });
    drawFooter(2, 4);

    // ── PAGE 3: POS Sales list ──
    doc.addPage();
    drawPageHeader("POS & Combined Sales Report", dateRangeStr);
    sectionY = 42;
    sectionHeading('POS Direct Sales Receipts', sectionY);

    const posRows = filteredTxs.map(t => [
      t.createdAt ? t.createdAt.substring(0, 16) : '-',
      t.location || 'Unknown',
      t.isNewCustomer ? 'Yes' : 'No',
      fmtIntPdf(t.points),
      fmtPdf(parseFloat(t.amount))
    ]);

    autoTable(doc, {
      startY: sectionY + 5,
      head: [['Receipt Date & Time', 'Branch Location', 'New Customer?', 'Points Issued', 'Amount Paid']],
      body: posRows.length > 0 ? posRows : [['-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: YELLOW, textColor: NAVY, fontSize: 8, font: FONT },
      bodyStyles: { font: FONT, fontSize: 7.5, textColor: GREY_DARK },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: doc.internal.pageSize.getWidth() - 169 - 14, halign: 'right' }
      }
    });
    drawFooter(3, 4);

    // ── PAGE 4: Combined Day-wise Ledger ──
    doc.addPage();
    drawPageHeader("POS & Combined Sales Report", dateRangeStr);
    sectionY = 42;
    sectionHeading('Combined Day-Wise Consolidated Ledger', sectionY);

    const combinedRows = filteredCombined.map(c => [
      c.date,
      fmtPdf(c.posSales),
      fmtPdf(c.manualSales),
      fmtPdf(c.grandTotal)
    ]);

    autoTable(doc, {
      startY: sectionY + 5,
      head: [['Date', 'POS Total Revenue (A)', 'Manual Total Revenue (B)', 'Ecosystem Grand Total (A + B)']],
      body: combinedRows.length > 0 ? combinedRows : [['-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, font: FONT },
      bodyStyles: { font: FONT, fontSize: 8, textColor: GREY_DARK },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 45, halign: 'right' },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: doc.internal.pageSize.getWidth() - 144 - 14, halign: 'right' }
      }
    });
    drawFooter(4, 4);

    doc.save(`yens_combined_report_${timeframe}_days_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const totalCombinedRevenue = filteredDataForTable.reduce((sum, r) => sum + r.grandTotal, 0);
  const totalPOSRevenue = filteredDataForTable.reduce((sum, r) => sum + r.posSales, 0);
  const totalManualRevenue = filteredDataForTable.reduce((sum, r) => sum + r.manualSales, 0);

  const downloadCSV = () => {
    const headers = ["Date", "POS Sales (฿)", "Manual Sales (฿)", "Grand Total (฿)"];
    const rows = filteredDataForTable.map(row => [
      row.date,
      row.posSales.toFixed(2),
      row.manualSales.toFixed(2),
      row.grandTotal.toFixed(2),
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `yens_combined_sales_${timeframe}_days_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-blue-900">Yens POS Dashboard</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">Real-time POS revenue and transaction ledger</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[140px] h-[36px] bg-white border border-slate-100 rounded-xl text-xs font-bold text-blue-900 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={handleExportPDF}
            className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl h-[36px] px-4 shadow-md flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" /> Generate PDF Report
          </Button>

          <Button
            onClick={downloadCSV}
            className="bg-blue-900 hover:bg-blue-800 text-white font-black uppercase text-[10px] tracking-widest rounded-xl h-[36px] px-4 shadow-md flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Download Report
          </Button>
        </div>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* CARD 1: TODAY'S POS SALES */}
        <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-gradient-to-br from-blue-900 to-indigo-950 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Today's POS</span>
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-yellow-400" />
              </div>
            </div>
            <h3 className="text-2xl font-black tracking-tight">{fmtCurrency(data.pos.todaySales)}</h3>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mt-2">
              {fmtInt(data.pos.todayCount)} Receipts Logged
            </p>
          </CardContent>
        </Card>

        {/* CARD 2: WEEKLY POS SALES */}
        <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weekly POS</span>
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-blue-900">{fmtCurrency(data.pos.currentWeekSales)}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">
              {fmtInt(data.pos.currentWeekCount)} Receipts • Last Week: {fmtCurrency(data.pos.lastWeekSales)}
            </p>
          </CardContent>
        </Card>

        {/* CARD 3: MONTHLY POS SALES */}
        <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly POS</span>
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-blue-900">{fmtCurrency(data.pos.currentMonthSales)}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">
              {fmtInt(data.pos.currentMonthCount)} Receipts • Last Month: {fmtCurrency(data.pos.lastMonthSales)}
            </p>
          </CardContent>
        </Card>

        {/* CARD 4: YTD POS SALES */}
        <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">YTD POS</span>
              <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
              </div>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-blue-900">{fmtCurrency(data.pos.ytdSales)}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">
              {fmtInt(data.pos.ytdCount)} Total Transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHART SECTION */}
      <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-50 p-6 bg-slate-50/50">
          <CardTitle className="text-xs font-black uppercase tracking-wider text-blue-900">Ecosystem Sales Comparison</CardTitle>
          <CardDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1">POS sales (direct) compared with manual sales tracker records (channels)</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredDataForChart} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                  tickFormatter={(value) => `฿${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "12px", color: "#fff" }}
                  labelStyle={{ fontWeight: "bold", color: "#fcd34d", fontSize: "11px" }}
                  itemStyle={{ fontSize: "10px", fontWeight: "bold" }}
                  formatter={(value: any) => [`฿${parseFloat(value).toLocaleString()}`, ""]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: "10px", fontWeight: "black", textTransform: "uppercase", letterSpacing: "0.05em" }} 
                  verticalAlign="top" 
                  height={36} 
                />
                <Line 
                  type="monotone" 
                  dataKey="posSales" 
                  name="POS Sales" 
                  stroke="#f59e0b" // Amber
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "#f59e0b", strokeWidth: 1 }} 
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="manualSales" 
                  name="Manual Sales" 
                  stroke="#64748b" // Slate
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="grandTotal" 
                  name="Grand Total" 
                  stroke="#1e3a8a" // Navy Blue
                  strokeWidth={4} 
                  dot={{ r: 5, fill: "#1e3a8a", strokeWidth: 1 }}
                  activeDot={{ r: 7 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* DETAILS GRID: SITE BREAKDOWN & GRAND LEDGER */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        
        {/* SITE-WISE BREAKDOWN */}
        <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-white lg:col-span-1 flex flex-col">
          <CardHeader className="border-b border-slate-50 p-6 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-900" />
              <CardTitle className="text-xs font-black uppercase tracking-wider text-blue-900">Site-Wise POS Breakdown</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1">Sales volume by physical branch site</CardDescription>
          </CardHeader>
          
          <CardContent className="p-0 flex-1 overflow-auto">
            {data.pos.siteBreakdown.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase">No transactions logged yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.pos.siteBreakdown.map((row) => (
                  <div 
                    key={row.site} 
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedDetail({ type: 'site', value: row.site })}
                  >
                    <div>
                      <p className="text-xs font-black text-blue-900 uppercase tracking-tight">{row.site}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{row.count} Sales (Click to manage)</p>
                    </div>
                    <span className="text-xs font-bold text-blue-900">{fmtCurrency(row.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* COMBINED LEDGER */}
        <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-white lg:col-span-2">
          <CardHeader className="border-b border-slate-50 p-6 bg-slate-50/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-wider text-blue-900">Day-Wise Sales Ledger</CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1">Consolidated daily revenue statement</CardDescription>
            </div>
            
            <div className="bg-blue-50 text-blue-900 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Period Total:</span>
              <span className="text-xs font-black">{fmtCurrency(totalCombinedRevenue)}</span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Date</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">POS Sales</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Manual Sales</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDataForTable.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-slate-400 font-bold uppercase">No records found for this period</td>
                    </tr>
                  ) : (
                    filteredDataForTable.map((row) => (
                      <tr 
                        key={row.date} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedDetail({ type: 'date', value: row.date })}
                      >
                        <td className="p-4 text-xs font-bold text-slate-600">{row.date} (Click to manage)</td>
                        <td className="p-4 text-xs font-bold text-slate-600 text-right">{fmtCurrency(row.posSales)}</td>
                        <td className="p-4 text-xs font-bold text-slate-600 text-right">{fmtCurrency(row.manualSales)}</td>
                        <td className="p-4 text-xs font-black text-blue-900 text-right">{fmtCurrency(row.grandTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* TRANSACTION DETAILS DIALOG */}
      <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2rem] border-none p-6 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-blue-900">
              Details for {selectedDetail?.type === 'site' ? `Site: ${selectedDetail.value}` : `Date: ${selectedDetail?.value}`}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Manage and audit POS transactions and manual sales ledger entries
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* POS TRANSACTIONS LIST */}
            <div>
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider mb-3">POS Transactions</h3>
              {data.transactions.filter(tx => {
                if (selectedDetail?.type === 'site') return (tx.location || 'Unknown') === selectedDetail.value;
                return (tx.createdAt ? tx.createdAt.substring(0, 10) : '') === selectedDetail?.value;
              }).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No POS transactions logged for this selection.</p>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Customer</th>
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Location</th>
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Amount</th>
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Points</th>
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {data.transactions.filter(tx => {
                        if (selectedDetail?.type === 'site') return (tx.location || 'Unknown') === selectedDetail.value;
                        return (tx.createdAt ? tx.createdAt.substring(0, 10) : '') === selectedDetail?.value;
                      }).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <p className="text-xs font-bold text-slate-700">{tx.customerName || 'Guest Member'}</p>
                            <p className="text-[9px] text-slate-400">{tx.customerPhone}</p>
                          </td>
                          <td className="p-3 text-xs font-medium text-slate-600">
                            {editingTransaction?.id === tx.id ? (
                              <Input
                                value={editingTransaction.location}
                                onChange={(e) => setEditingTransaction({ ...editingTransaction, location: e.target.value })}
                                className="h-8 text-xs rounded-xl border-slate-200"
                              />
                            ) : (
                              tx.location
                            )}
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-600 text-right">
                            {editingTransaction?.id === tx.id ? (
                              <Input
                                type="number"
                                value={editingTransaction.amount}
                                onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                                className="h-8 text-xs text-right rounded-xl border-slate-200"
                              />
                            ) : (
                              fmtCurrency(parseFloat(tx.amount))
                            )}
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-600 text-right">
                            {editingTransaction?.id === tx.id ? (
                              <Input
                                type="number"
                                value={editingTransaction.points}
                                onChange={(e) => setEditingTransaction({ ...editingTransaction, points: parseInt(e.target.value) || 0 })}
                                className="h-8 text-xs text-right rounded-xl border-slate-200"
                              />
                            ) : (
                              tx.points
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {editingTransaction?.id === tx.id ? (
                              <div className="flex justify-center gap-1.5">
                                <Button
                                  onClick={() => updateTxMutation.mutate({
                                    id: tx.id,
                                    data: {
                                      location: editingTransaction.location,
                                      amount: editingTransaction.amount,
                                      points: editingTransaction.points,
                                    }
                                  })}
                                  disabled={updateTxMutation.isPending}
                                  className="h-7 text-[9px] font-black uppercase rounded-lg px-2"
                                >
                                  {updateTxMutation.isPending ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingTransaction(null)}
                                  className="h-7 text-[9px] font-black uppercase rounded-lg px-2 border-slate-200"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  onClick={() => setEditingTransaction({ ...tx })}
                                  className="h-7 w-7 text-blue-900 hover:bg-blue-50 rounded-lg p-0"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this POS transaction? This will permanently deduct customer points.")) {
                                      deleteTxMutation.mutate(tx.id);
                                    }
                                  }}
                                  className="h-7 w-7 text-red-500 hover:bg-red-50 rounded-lg p-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* MANUAL SALES LIST */}
            <div>
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider mb-3">Manual Sales Records</h3>
              {data.manualSales.filter(sale => {
                if (selectedDetail?.type === 'site') return sale.orderChannel === selectedDetail.value;
                return sale.date === selectedDetail?.value;
              }).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No manual sales records logged for this selection.</p>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Date</th>
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Channel / Site</th>
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Net Sales</th>
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Other Sales</th>
                        <th className="p-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {data.manualSales.filter(sale => {
                        if (selectedDetail?.type === 'site') return sale.orderChannel === selectedDetail.value;
                        return sale.date === selectedDetail?.value;
                      }).map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-xs font-medium text-slate-600">
                            {editingManualSale?.id === sale.id ? (
                              <Input
                                value={editingManualSale.date}
                                onChange={(e) => setEditingManualSale({ ...editingManualSale, date: e.target.value })}
                                className="h-8 text-xs rounded-xl border-slate-200"
                              />
                            ) : (
                              sale.date
                            )}
                          </td>
                          <td className="p-3 text-xs font-medium text-slate-600">
                            {editingManualSale?.id === sale.id ? (
                              <Input
                                value={editingManualSale.orderChannel}
                                onChange={(e) => setEditingManualSale({ ...editingManualSale, orderChannel: e.target.value })}
                                className="h-8 text-xs rounded-xl border-slate-200"
                              />
                            ) : (
                              sale.orderChannel
                            )}
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-600 text-right">
                            {editingManualSale?.id === sale.id ? (
                              <Input
                                type="number"
                                value={editingManualSale.netSales}
                                onChange={(e) => setEditingManualSale({ ...editingManualSale, netSales: e.target.value })}
                                className="h-8 text-xs text-right rounded-xl border-slate-200"
                              />
                            ) : (
                              fmtCurrency(parseFloat(sale.netSales))
                            )}
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-600 text-right">
                            {editingManualSale?.id === sale.id ? (
                              <Input
                                type="number"
                                value={editingManualSale.otherSales}
                                onChange={(e) => setEditingManualSale({ ...editingManualSale, otherSales: e.target.value })}
                                className="h-8 text-xs text-right rounded-xl border-slate-200"
                              />
                            ) : (
                              fmtCurrency(parseFloat(sale.otherSales || "0"))
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {editingManualSale?.id === sale.id ? (
                              <div className="flex justify-center gap-1.5">
                                <Button
                                  onClick={() => updateManualSaleMutation.mutate({
                                    id: sale.id,
                                    data: {
                                      date: editingManualSale.date,
                                      orderChannel: editingManualSale.orderChannel,
                                      netSales: editingManualSale.netSales,
                                      otherSales: editingManualSale.otherSales,
                                    }
                                  })}
                                  disabled={updateManualSaleMutation.isPending}
                                  className="h-7 text-[9px] font-black uppercase rounded-lg px-2"
                                >
                                  {updateManualSaleMutation.isPending ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingManualSale(null)}
                                  className="h-7 text-[9px] font-black uppercase rounded-lg px-2 border-slate-200"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  onClick={() => setEditingManualSale({ ...sale })}
                                  className="h-7 w-7 text-blue-900 hover:bg-blue-50 rounded-lg p-0"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this manual sales record?")) {
                                      deleteManualSaleMutation.mutate(sale.id);
                                    }
                                  }}
                                  className="h-7 w-7 text-red-500 hover:bg-red-50 rounded-lg p-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
