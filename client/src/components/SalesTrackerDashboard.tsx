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
import { Calendar as CalendarIcon, TrendingUp, BarChart3, Upload, Plus, FileSpreadsheet, Pencil, Trash2, Search, FileText, Download, X } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { DailySales, Site } from "@shared/schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parse } from "date-fns";

// Helper to format date as dd/mm/yy
const formatDateDDMMYY = (dateStr: string) => {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'dd/MM/yy');
  } catch {
    return dateStr;
  }
};

interface SalesReport {
  startDate: string;
  endDate: string;
  summary: {
    totalNetSales: number;
    totalOtherSales: number;
    totalSales: number;
    transactionCount: number;
    avgTransaction: number;
  };
  channelBreakdown: { channel: string; revenue: number; count: number }[];
  dayBreakdown: { day: string; revenue: number; count: number }[];
  transactions: {
    id: string;
    date: string;
    channel: string;
    netSales: number;
    otherSales: number;
    totalSales: number;
    dayOfWeek: string;
  }[];
}

interface SalesFormData {
  date: string;
  orderChannel: string;
  netSales: string;
  otherSales: string;
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
    grabFee: "0",
  });
  
  // Edit/Delete state
  const [editingSale, setEditingSale] = useState<DailySales | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<SalesFormData>({
    date: "",
    orderChannel: "",
    netSales: "",
    otherSales: "0",
    grabFee: "0",
  });

  // Date range report state
  const today = new Date().toISOString().split('T')[0];
  const [reportStartDate, setReportStartDate] = useState(today);
  const [reportEndDate, setReportEndDate] = useState(today);
  const [reportData, setReportData] = useState<SalesReport | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch sales metrics
  const { data: metrics } = useQuery<{
    currentWeekSales: number;
    lastWeekSales: number;
    currentMonthSales: number;
    lastMonthSales: number;
    ytdSales: number;
    bestChannel: { name: string; total: number } | null;
    bestDay: { date: string; dayOfWeek: string; total: number } | null;
    bestMonth: { month: string; total: number } | null;
    // Enhanced CFO metrics
    currentWeekTransactions: number;
    currentMonthTransactions: number;
    ytdTransactionCount: number;
    daysElapsedWeek: number;
    daysElapsedMonth: number;
    daysInMonth: number;
    daysElapsedYear: number;
    sameMonthLastYear: number;
    ytdLastYear: number;
    annualTarget: number;
    weeklyTarget: number;
    monthlyTarget: number;
    weeklyDailyAvg: number;
    monthlyDailyAvg: number;
    projectedMonthEnd: number;
    projectedAnnual: number;
    weeklyTargetPercent: number;
    monthlyTargetPercent: number;
    annualTargetPercent: number;
    yoyMonthGrowth: number;
    yoyYtdGrowth: number;
  }>({
    queryKey: ['/api/admin/sales-tracker-metrics'],
  });

  // Fetch all recent sales
  const { data: allSales = [] } = useQuery<DailySales[]>({
    queryKey: ['/api/admin/sales-overview'],
  });

  // Fetch active sites for channel dropdown
  const { data: sites = [], isLoading: sitesLoading, error: sitesError } = useQuery<Site[]>({
    queryKey: ['/api/admin/sites'],
  });

  // Extract channel names from active sites with valid channel names, sorted alphabetically
  const channels = useMemo(() => {
    return sites
      .filter(site => site.isActive && site.channelName && site.channelName.trim().length > 0)
      .map(site => site.channelName)
      .sort();
  }, [sites]);

  // Filter to current week only using useMemo
  const recentSales = useMemo(() => {
    // Get start of current week (Monday) using UTC to match database dates
    const now = new Date();
    const currentDayUTC = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (UTC)
    
    // Calculate days to subtract to get to Monday
    let daysToSubtract;
    if (currentDayUTC === 0) {
      daysToSubtract = 6; // Sunday: go back 6 days to previous Monday
    } else {
      daysToSubtract = currentDayUTC - 1; // Mon-Sat: go back to Monday of this week
    }
    
    // Use UTC date arithmetic to avoid timezone issues
    const mondayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysToSubtract,
      0, 0, 0, 0
    ));
    const startOfWeek = mondayUTC.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Filter sales from current week only (date >= startOfWeek)
    const filtered = allSales.filter(sale => sale.date >= startOfWeek);
    
    return filtered;
  }, [allSales]);

  // Add sale mutation
  const addSaleMutation = useMutation({
    mutationFn: async (data: SalesFormData) => {
      return await apiRequest('POST', '/api/admin/sales', {
        ...data,
        netSales: parseFloat(data.netSales).toFixed(2),
        grabFee: parseFloat(data.grabFee || "0").toFixed(2),
        totalSales: parseFloat(data.netSales).toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
      toast({
        title: t('sales.saleAdded'),
        description: t('sales.saleAddedDesc'),
      });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        orderChannel: "",
        netSales: "",
        otherSales: "0",
        grabFee: "0",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update sale mutation
  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SalesFormData }) => {
      return await apiRequest('PATCH', `/api/admin/sales/${id}`, {
        ...data,
        netSales: parseFloat(data.netSales).toFixed(2),
        grabFee: parseFloat(data.grabFee || "0").toFixed(2),
        totalSales: parseFloat(data.netSales).toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
      toast({
        title: "Sale Updated",
        description: "The sale record has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingSale(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete sale mutation
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
      toast({
        title: "Sale Deleted",
        description: "The sale record has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setDeletingSaleId(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Excel upload mutation
  const uploadExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiRequest('POST', '/api/admin/import-sales-excel', formData);
      
      try {
        return await response.json();
      } catch (e) {
        throw new Error('Invalid response from server');
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
      toast({
        title: t('sales.importSuccess'),
        description: `${data.imported} ${t('sales.recordsImported')}`,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadExcelMutation.mutate(file);
    }
  };

  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderChannel || !formData.netSales) {
      toast({
        title: t('common.error'),
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    addSaleMutation.mutate(formData);
  };

  const handleEditSale = (sale: DailySales) => {
    setEditingSale(sale);
    setEditFormData({
      date: sale.date,
      orderChannel: sale.orderChannel,
      netSales: sale.netSales,
      otherSales: sale.otherSales || "0",
      grabFee: sale.grabFee || "0",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !editFormData.orderChannel || !editFormData.netSales) {
      toast({
        title: t('common.error'),
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    updateSaleMutation.mutate({ id: editingSale.id, data: editFormData });
  };

  const handleDeleteSale = (saleId: string) => {
    setDeletingSaleId(saleId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingSaleId) {
      deleteSaleMutation.mutate(deletingSaleId);
    }
  };

  const getChannelColor = (channel: string) => {
    const colors: Record<string, string> = {
      RIVER: "bg-blue-500",
      SHOP: "bg-purple-500",
      SHOPZY: "bg-amber-500",
      G2: "bg-green-500",
      GRAB: "bg-emerald-500",
      FOODPANDA: "bg-pink-500",
      LINEMAN: "bg-green-600",
    };
    return colors[channel] || "bg-gray-500";
  };

  // Date preset helpers
  const setDatePreset = (preset: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    switch (preset) {
      case 'today':
        setReportStartDate(todayStr);
        setReportEndDate(todayStr);
        break;
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        setReportStartDate(yStr);
        setReportEndDate(yStr);
        break;
      }
      case 'last7days': {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        setReportStartDate(start.toISOString().split('T')[0]);
        setReportEndDate(todayStr);
        break;
      }
      case 'last30days': {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        setReportStartDate(start.toISOString().split('T')[0]);
        setReportEndDate(todayStr);
        break;
      }
      case 'thisMonth': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        setReportStartDate(start.toISOString().split('T')[0]);
        setReportEndDate(todayStr);
        break;
      }
      case 'lastMonth': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        setReportStartDate(start.toISOString().split('T')[0]);
        setReportEndDate(end.toISOString().split('T')[0]);
        break;
      }
      case 'ytd': {
        // Year to Date starts January 1st (use string format to avoid timezone issues)
        const year = now.getFullYear();
        setReportStartDate(`${year}-01-01`);
        setReportEndDate(todayStr);
        break;
      }
    }
  };

  // Generate report
  const handleGenerateReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingReport(true);
    try {
      const response = await fetch(
        `/api/admin/sales/report?startDate=${reportStartDate}&endDate=${reportEndDate}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to generate report');
      const data = await response.json();
      setReportData(data);
      setIsReportDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!reportData) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header with logo space
      doc.setFillColor(252, 211, 77); // Yens Yellow
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175); // Blue
      doc.text("Yen's Sales Report", 35, 20); // Offset for logo
      
      // Date range
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.text(`Period: ${formatDateDDMMYY(reportData.startDate)} to ${formatDateDDMMYY(reportData.endDate)}`, 14, 40);
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yy')}`, 14, 48);
      
      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text("Summary", 14, 62);
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total Net Sales: ${reportData.summary.totalNetSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB`, 14, 72);
      doc.text(`Total Other Sales: ${reportData.summary.totalOtherSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB`, 14, 80);
      doc.text(`Total Sales: ${reportData.summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB`, 14, 88);
      doc.text(`Transactions: ${reportData.summary.transactionCount}`, 14, 96);
      doc.text(`Average Transaction: ${reportData.summary.avgTransaction.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB`, 14, 104);
      
      // Channel breakdown table
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text("Sales by Channel", 14, 120);
      
      autoTable(doc, {
        startY: 125,
        head: [['Channel', 'Revenue (THB)', 'Transactions']],
        body: reportData.channelBreakdown.map(ch => [
          ch.channel,
          ch.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          ch.count.toString()
        ]),
        headStyles: { fillColor: [252, 211, 77], textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [255, 250, 230] },
      });
      
      // Day breakdown table
      const afterChannelY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text("Sales by Day of Week", 14, afterChannelY);
      
      autoTable(doc, {
        startY: afterChannelY + 5,
        head: [['Day', 'Revenue (THB)', 'Transactions']],
        body: reportData.dayBreakdown.map(d => [
          d.day,
          d.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          d.count.toString()
        ]),
        headStyles: { fillColor: [252, 211, 77], textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [255, 250, 230] },
      });
      
      // Transaction list (new page if needed)
      doc.addPage();
      doc.setFillColor(252, 211, 77);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text("Transaction Details", 35, 16); // Offset for logo
      
      autoTable(doc, {
        startY: 25,
        head: [['Date', 'Day', 'Channel', 'Net Sales (THB)', 'Other (THB)', 'Total (THB)']],
        body: reportData.transactions.map(t => [
          formatDateDDMMYY(t.date),
          t.dayOfWeek || '-',
          t.channel,
          t.netSales.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          t.otherSales.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          t.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })
        ]),
        headStyles: { fillColor: [252, 211, 77], textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [255, 250, 230] },
        styles: { fontSize: 9 },
      });
      
      // Add logo and footer to all pages
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        // Add logo to top left corner of each page
        const img = new Image();
        img.src = logoUrl;
        doc.addImage(img, 'PNG', 10, 5, 18, 18);
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Yen's Thai Ice Cream - Sales Report - Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.getHeight() - 10);
        doc.text('Private and Confidential', pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      }
      
      doc.save(`yens-sales-report-${formatDateDDMMYY(reportData.startDate)}-to-${formatDateDDMMYY(reportData.endDate)}.pdf`.replace(/\//g, '-'));
      toast({
        title: "PDF Downloaded",
        description: "Your sales report has been saved",
      });
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast({
        title: "PDF Export Failed",
        description: error.message || "Could not generate PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FCD34D' }}>
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Yen's Logo" className="w-12 h-12 rounded-lg" />
            <h1 className="text-3xl font-bold text-blue-700">Yen's Sales Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-100"
                  data-testid="button-date-range"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {reportStartDate === reportEndDate 
                    ? formatDateDDMMYY(reportStartDate) 
                    : `${formatDateDDMMYY(reportStartDate)} - ${formatDateDDMMYY(reportEndDate)}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">From</Label>
                      <Input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="text-sm"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <Input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="text-sm"
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setDatePreset('today')} className="text-xs">Today</Button>
                    <Button size="sm" variant="outline" onClick={() => setDatePreset('yesterday')} className="text-xs">Yesterday</Button>
                    <Button size="sm" variant="outline" onClick={() => setDatePreset('last7days')} className="text-xs">Last 7 Days</Button>
                    <Button size="sm" variant="outline" onClick={() => setDatePreset('last30days')} className="text-xs">Last 30 Days</Button>
                    <Button size="sm" variant="outline" onClick={() => setDatePreset('thisMonth')} className="text-xs">This Month</Button>
                    <Button size="sm" variant="outline" onClick={() => setDatePreset('lastMonth')} className="text-xs">Last Month</Button>
                    <Button size="sm" variant="outline" onClick={() => setDatePreset('ytd')} className="col-span-2 text-xs">Year to Date</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-generate-report"
            >
              <Search className="h-4 w-4 mr-2" />
              {isGeneratingReport ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards - Enhanced CFO Dashboard */}
      <div className="px-6 mb-6">
        <div className="grid grid-cols-12 gap-2">
          {/* Current Week Total - Blue Card (3/12) */}
          <Card className="col-span-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-white/90 mb-0.5">Current Week</p>
                  <p className="text-lg font-bold text-white" data-testid="text-current-week-sales">
                    ฿{(metrics?.currentWeekSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] text-white/70">Mon - Today ({metrics?.daysElapsedWeek ?? 0} days)</p>
                </div>
                {metrics && metrics.lastWeekSales > 0 && (
                  <div className="text-right">
                    <p className={`text-xs font-bold ${
                      metrics.currentWeekSales >= metrics.lastWeekSales 
                        ? 'text-green-200' 
                        : 'text-red-200'
                    }`}>
                      {metrics.currentWeekSales >= metrics.lastWeekSales ? '↑' : '↓'}
                      {Math.abs(((metrics.currentWeekSales - metrics.lastWeekSales) / metrics.lastWeekSales) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[8px] text-white/60">vs last week</p>
                  </div>
                )}
              </div>
              <div className="border-t border-white/20 pt-2 space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">Daily Avg</span>
                  <span className="text-white font-medium">฿{(metrics?.weeklyDailyAvg ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">vs Target</span>
                  <span className={`font-medium ${(metrics?.weeklyTargetPercent ?? 0) >= 100 ? 'text-green-200' : 'text-yellow-200'}`}>
                    {(metrics?.weeklyTargetPercent ?? 0).toFixed(0)}% of ฿{((metrics?.weeklyTarget ?? 0) / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">Transactions</span>
                  <span className="text-white font-medium">{metrics?.currentWeekTransactions ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Month Total - Green Card (3/12) */}
          <Card className="col-span-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-white/90 mb-0.5">Current Month</p>
                  <p className="text-lg font-bold text-white" data-testid="text-current-month-sales">
                    ฿{(metrics?.currentMonthSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] text-white/70">{new Date().toLocaleDateString('en-US', { month: 'short' })} (Day {metrics?.daysElapsedMonth ?? 0}/{metrics?.daysInMonth ?? 0})</p>
                </div>
                {metrics && (metrics.sameMonthLastYear > 0 || metrics.lastMonthSales > 0) && (
                  <div className="text-right">
                    <p className={`text-xs font-bold ${
                      (metrics.yoyMonthGrowth ?? 0) >= 0 
                        ? 'text-green-200' 
                        : 'text-red-200'
                    }`}>
                      {(metrics.yoyMonthGrowth ?? 0) >= 0 ? '↑' : '↓'}
                      {Math.abs(metrics.yoyMonthGrowth ?? 0).toFixed(1)}%
                    </p>
                    <p className="text-[8px] text-white/60">YoY growth</p>
                  </div>
                )}
              </div>
              <div className="border-t border-white/20 pt-2 space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">vs Target</span>
                  <span className={`font-medium ${(metrics?.monthlyTargetPercent ?? 0) >= ((metrics?.daysElapsedMonth ?? 1) / (metrics?.daysInMonth ?? 1) * 100) ? 'text-green-200' : 'text-yellow-200'}`}>
                    {(metrics?.monthlyTargetPercent ?? 0).toFixed(0)}% of ฿{((metrics?.monthlyTarget ?? 0) / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">Projected</span>
                  <span className="text-white font-medium">฿{((metrics?.projectedMonthEnd ?? 0) / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">Transactions</span>
                  <span className="text-white font-medium">{metrics?.currentMonthTransactions ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* YTD (Year to Date) - Purple Card (3/12) */}
          <Card className="col-span-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-white/90 mb-0.5">YTD Sales</p>
                  <p className="text-lg font-bold text-white" data-testid="text-ytd-sales">
                    ฿{(metrics?.ytdSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] text-white/70">Since Jan 1 ({metrics?.daysElapsedYear ?? 0} days)</p>
                </div>
                {metrics && metrics.ytdLastYear > 0 && (
                  <div className="text-right">
                    <p className={`text-xs font-bold ${
                      (metrics.yoyYtdGrowth ?? 0) >= 0 
                        ? 'text-green-200' 
                        : 'text-red-200'
                    }`}>
                      {(metrics.yoyYtdGrowth ?? 0) >= 0 ? '↑' : '↓'}
                      {Math.abs(metrics.yoyYtdGrowth ?? 0).toFixed(1)}%
                    </p>
                    <p className="text-[8px] text-white/60">YoY growth</p>
                  </div>
                )}
              </div>
              <div className="border-t border-white/20 pt-2 space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">vs Annual Target</span>
                  <span className={`font-medium ${(metrics?.annualTargetPercent ?? 0) >= ((metrics?.daysElapsedYear ?? 1) / 365 * 100) ? 'text-green-200' : 'text-yellow-200'}`}>
                    {(metrics?.annualTargetPercent ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">Projection</span>
                  <span className="text-white font-medium">฿{((metrics?.projectedAnnual ?? 0) / 1000000).toFixed(2)}M</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/70">Target</span>
                  <span className="text-white font-medium">฿{((metrics?.annualTarget ?? 0) / 1000000).toFixed(2)}M</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smaller Yellow Cards Container (3/12 total) */}
          <div className="col-span-3 grid grid-rows-3 gap-2">
            {/* Best Channel - Smaller */}
            <Card className="bg-yellow-400 rounded-lg">
              <CardContent className="p-2">
                <p className="text-[8px] font-medium text-gray-700 mb-0.5">Best Channel</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-900" data-testid="text-best-channel">
                    {metrics?.bestChannel?.name || 'N/A'}
                  </p>
                  <p className="text-xs font-bold text-gray-800">
                    {metrics?.bestChannel ? `฿${(metrics.bestChannel.total / 1000).toFixed(0)}k` : ''}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Best Day - Smaller */}
            <Card className="bg-blue-400 rounded-lg">
              <CardContent className="p-2">
                <p className="text-[8px] font-medium text-white/80 mb-0.5">Best Day</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white" data-testid="text-best-day">
                    {metrics?.bestDay?.date 
                      ? `${new Date(metrics.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${metrics.bestDay.dayOfWeek.substring(0, 3)})`
                      : 'N/A'}
                  </p>
                  <p className="text-xs font-bold text-white">
                    {metrics?.bestDay ? `฿${(metrics.bestDay.total / 1000).toFixed(1)}k` : ''}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Best Month - Smaller */}
            <Card className="bg-green-400 rounded-lg">
              <CardContent className="p-2">
                <p className="text-[8px] font-medium text-white/80 mb-0.5">Best Month</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white" data-testid="text-best-month">
                    {metrics?.bestMonth?.month ? new Date(metrics.bestMonth.month + '-01').toLocaleDateString('en-US', { month: 'short' }) : 'N/A'}
                  </p>
                  <p className="text-xs font-bold text-white">
                    {metrics?.bestMonth ? `฿${(metrics.bestMonth.total / 1000).toFixed(0)}k` : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add New Sale Form */}
        <Card className="bg-white rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Add New Sale</h2>
            </div>

            <form onSubmit={handleAddSale} className="space-y-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-yellow-50/50 border-yellow-200/50 rounded-lg"
                  data-testid="input-sale-date"
                />
              </div>

              {/* Sales Channel */}
              <div className="space-y-2">
                <Label htmlFor="channel">Sales Channel *</Label>
                {sitesError ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    ⚠️ Failed to load sales channels. Please refresh the page or check your permissions.
                  </div>
                ) : sitesLoading ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-600">
                    Loading channels...
                  </div>
                ) : channels.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-600">
                    No active sites found. Please add sites in the Sites tab.
                  </div>
                ) : (
                  <Select
                    value={formData.orderChannel}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, orderChannel: value }))}
                    disabled={sitesLoading}
                  >
                    <SelectTrigger className="bg-yellow-50/50 border-2 border-[#FCD34D] rounded-lg" data-testid="select-sales-channel">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {channel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Net Sales */}
              <div className="space-y-2">
                <Label htmlFor="netSales">Net Sales (฿) *</Label>
                <Input
                  id="netSales"
                  type="number"
                  step="0.01"
                  value={formData.netSales}
                  onChange={(e) => setFormData(prev => ({ ...prev, netSales: e.target.value }))}
                  placeholder="0.00"
                  className="bg-yellow-50/50 border-2 border-[#FCD34D] rounded-lg"
                  data-testid="input-net-sales"
                />
              </div>

              {/* Other Sales */}
              <div className="space-y-2">
                <Label htmlFor="otherSales">Other Sales (฿)</Label>
                <Input
                  id="otherSales"
                  type="number"
                  step="0.01"
                  value={formData.otherSales}
                  onChange={(e) => setFormData(prev => ({ ...prev, otherSales: e.target.value }))}
                  placeholder="0.00"
                  className="bg-yellow-50/50 border-2 border-[#FCD34D] rounded-lg"
                  data-testid="input-other-sales"
                />
              </div>

              {/* Grab Fee */}
              <div className="space-y-2">
                <Label htmlFor="grabFee">Grab Fee (฿)</Label>
                <Input
                  id="grabFee"
                  type="number"
                  step="0.01"
                  value={formData.grabFee}
                  onChange={(e) => setFormData(prev => ({ ...prev, grabFee: e.target.value }))}
                  placeholder="0"
                  className="bg-yellow-50/50 border-yellow-200/50 rounded-lg"
                  data-testid="input-grab-fee"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                disabled={addSaleMutation.isPending}
                data-testid="button-add-sale"
              >
                <Plus className="w-4 h-4 mr-2" />
                {addSaleMutation.isPending ? 'Adding...' : 'Add Sale'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="bg-white rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recent Sales</h2>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
              {recentSales.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No sales recorded yet</p>
              ) : (
                recentSales.map((sale, index) => (
                  <div
                    key={index}
                    className="bg-yellow-50/40 rounded-xl p-4 hover-elevate border border-yellow-100/50"
                    data-testid={`sale-${index}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={`${getChannelColor(sale.orderChannel)} text-white rounded-lg`}>
                        {sale.orderChannel}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-gray-900">
                          ฿{parseFloat(sale.netSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEditSale(sale)}
                          data-testid={`button-edit-sale-${index}`}
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleDeleteSale(sale.id)}
                          data-testid={`button-delete-sale-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(sale.date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      Net Sales: ฿{parseFloat(sale.netSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Excel Section - Moved to bottom */}
      <div className="px-6 pb-6">
        <Card className="bg-white rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Import Excel Data</h3>
                <p className="text-sm text-gray-600">Upload your sales spreadsheet to bulk import data</p>
              </div>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadExcelMutation.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-lg"
              data-testid="button-upload-excel"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadExcelMutation.isPending ? 'Uploading...' : 'Upload Excel'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              data-testid="input-excel-file"
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Sale Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogDescription>
              Update the sale details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSale} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                className="bg-yellow-50/50 border-yellow-200/50 rounded-lg"
                data-testid="input-edit-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-channel">Sales Channel *</Label>
              <Select
                value={editFormData.orderChannel}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, orderChannel: value }))}
              >
                <SelectTrigger className="bg-yellow-50/50 border-2 border-[#FCD34D] rounded-lg" data-testid="select-edit-channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-netSales">Net Sales (฿) *</Label>
              <Input
                id="edit-netSales"
                type="number"
                step="0.01"
                value={editFormData.netSales}
                onChange={(e) => setEditFormData(prev => ({ ...prev, netSales: e.target.value }))}
                placeholder="0.00"
                className="bg-yellow-50/50 border-2 border-[#FCD34D] rounded-lg"
                data-testid="input-edit-net-sales"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-grabFee">Grab Fee (฿)</Label>
              <Input
                id="edit-grabFee"
                type="number"
                step="0.01"
                value={editFormData.grabFee}
                onChange={(e) => setEditFormData(prev => ({ ...prev, grabFee: e.target.value }))}
                placeholder="0"
                className="bg-yellow-50/50 border-yellow-200/50 rounded-lg"
                data-testid="input-edit-grab-fee"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={updateSaleMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateSaleMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sale record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteSaleMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sales Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <img src={logoUrl} alt="Yens Logo" className="h-10 w-10 rounded-full" />
              <div>
                <DialogTitle className="flex items-center gap-2 text-gray-900">
                  Sales Report
                </DialogTitle>
                <DialogDescription>
                  {reportData && `${formatDateDDMMYY(reportData.startDate)} to ${formatDateDDMMYY(reportData.endDate)}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-gradient-to-br from-green-500 to-green-600">
                  <CardContent className="p-3">
                    <p className="text-xs text-white/80">Total Net Sales</p>
                    <p className="text-xl font-bold text-white">
                      ฿{reportData.summary.totalNetSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
                  <CardContent className="p-3">
                    <p className="text-xs text-white/80">Transactions</p>
                    <p className="text-xl font-bold text-white">{reportData.summary.transactionCount}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
                  <CardContent className="p-3">
                    <p className="text-xs text-white/80">Avg Transaction</p>
                    <p className="text-xl font-bold text-white">
                      ฿{reportData.summary.avgTransaction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Channel Breakdown */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Sales by Channel</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#FCD34D]">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Channel</th>
                        <th className="px-3 py-2 text-right font-medium">Revenue</th>
                        <th className="px-3 py-2 text-right font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.channelBreakdown.map((ch, idx) => (
                        <tr key={ch.channel} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2">
                            <Badge className={`${getChannelColor(ch.channel)} text-white`}>{ch.channel}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right">฿{ch.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">{ch.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Day Breakdown */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Sales by Day of Week</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#FCD34D]">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Day</th>
                        <th className="px-3 py-2 text-right font-medium">Revenue</th>
                        <th className="px-3 py-2 text-right font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.dayBreakdown.map((d, idx) => (
                        <tr key={d.day} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 font-medium">{d.day}</td>
                          <td className="px-3 py-2 text-right">฿{d.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">{d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transactions List */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Transaction Details ({reportData.transactions.length} records)
                </h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#FCD34D] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Day</th>
                        <th className="px-3 py-2 text-left font-medium">Channel</th>
                        <th className="px-3 py-2 text-right font-medium">Net Sales</th>
                        <th className="px-3 py-2 text-right font-medium">Other</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.transactions.map((t, idx) => (
                        <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-1.5">{formatDateDDMMYY(t.date)}</td>
                          <td className="px-3 py-1.5">{t.dayOfWeek || '-'}</td>
                          <td className="px-3 py-1.5">
                            <Badge className={`${getChannelColor(t.channel)} text-white text-xs`}>{t.channel}</Badge>
                          </td>
                          <td className="px-3 py-1.5 text-right">฿{t.netSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-1.5 text-right">฿{t.otherSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-1.5 text-right font-medium">฿{t.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsReportDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={handleExportPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-export-pdf"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
