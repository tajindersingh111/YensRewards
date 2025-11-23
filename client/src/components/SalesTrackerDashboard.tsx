import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Calendar, TrendingUp, BarChart3, Upload, Plus, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { DailySales, Site } from "@shared/schema";

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

  // Fetch sales metrics
  const { data: metrics } = useQuery<{
    currentWeekSales: number;
    lastWeekSales: number;
    currentMonthSales: number;
    lastMonthSales: number;
    ytdSales: number;
    bestChannel: { name: string; total: number } | null;
    bestDay: string | null;
    bestMonth: string | null;
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
    
    return filtered.slice(0, 10);
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
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

            const result = await apiRequest('POST', '/api/admin/sales/bulk-import', {
              sales: jsonData,
            });
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FCD34D' }}>
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Yen's Logo" className="w-12 h-12 rounded-lg" />
          <h1 className="text-3xl font-bold text-blue-700">Yen's Sales Tracker</h1>
        </div>
      </div>

      {/* KPI Cards - 6 Boxes in Single Row */}
      <div className="px-6 mb-6">
        <div className="grid grid-cols-9 gap-2">
          {/* Current Week Total - Larger (2/9) */}
          <Card className="col-span-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <CardContent className="p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-white/90 mb-0.5">Current Week</p>
                  <p className="text-base font-bold text-white" data-testid="text-current-week-sales">
                    ฿{(metrics?.currentWeekSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] text-white/80 mt-0.5">Mon - Today</p>
                </div>
                {metrics && metrics.lastWeekSales > 0 && (
                  <div className="text-right">
                    <p className="text-[8px] text-white/70">Last Week</p>
                    <p className="text-[9px] font-semibold text-white/90">
                      ฿{metrics.lastWeekSales.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className={`text-[8px] font-medium ${
                      metrics.currentWeekSales >= metrics.lastWeekSales 
                        ? 'text-green-200' 
                        : 'text-red-200'
                    }`}>
                      {metrics.currentWeekSales >= metrics.lastWeekSales ? '↑' : '↓'}
                      {Math.abs(((metrics.currentWeekSales - metrics.lastWeekSales) / metrics.lastWeekSales) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Month Total - Larger (2/9) */}
          <Card className="col-span-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
            <CardContent className="p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-white/90 mb-0.5">Current Month</p>
                  <p className="text-base font-bold text-white" data-testid="text-current-month-sales">
                    ฿{(metrics?.currentMonthSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] text-white/80 mt-0.5">{new Date().toLocaleDateString('en-US', { month: 'short' })}</p>
                </div>
                {metrics && metrics.lastMonthSales > 0 && (
                  <div className="text-right">
                    <p className="text-[8px] text-white/70">Last Month</p>
                    <p className="text-[9px] font-semibold text-white/90">
                      ฿{metrics.lastMonthSales.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className={`text-[8px] font-medium ${
                      metrics.currentMonthSales >= metrics.lastMonthSales 
                        ? 'text-green-200' 
                        : 'text-red-200'
                    }`}>
                      {metrics.currentMonthSales >= metrics.lastMonthSales ? '↑' : '↓'}
                      {Math.abs(((metrics.currentMonthSales - metrics.lastMonthSales) / metrics.lastMonthSales) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* YTD (Year to Date) - Larger (2/9) */}
          <Card className="col-span-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
            <CardContent className="p-2">
              <p className="text-[10px] font-medium text-white/90 mb-0.5">YTD Sales</p>
              <p className="text-base font-bold text-white" data-testid="text-ytd-sales">
                ฿{(metrics?.ytdSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] text-white/80 mt-0.5">Since Jan 1</p>
            </CardContent>
          </Card>

          {/* Best Channel - Smaller (1/9) */}
          <Card className="col-span-1 bg-yellow-400 rounded-lg">
            <CardContent className="p-1.5">
              <p className="text-[9px] font-medium text-gray-800 mb-0.5">Best Channel</p>
              <p className="text-sm font-bold text-gray-900 leading-tight" data-testid="text-best-channel">
                {metrics?.bestChannel?.name || 'N/A'}
              </p>
              {metrics?.bestChannel && (
                <p className="text-[8px] text-gray-700 mt-0.5">
                  ฿{(metrics.bestChannel.total / 1000).toFixed(0)}k
                </p>
              )}
            </CardContent>
          </Card>

          {/* Best Day - Smaller (1/9) */}
          <Card className="col-span-1 bg-blue-400 rounded-lg">
            <CardContent className="p-1.5">
              <p className="text-[9px] font-medium text-white/90 mb-0.5">Best Day</p>
              <p className="text-sm font-bold text-white leading-tight" data-testid="text-best-day">
                {metrics?.bestDay || 'N/A'}
              </p>
            </CardContent>
          </Card>

          {/* Best Month - Smaller (1/9) */}
          <Card className="col-span-1 bg-green-400 rounded-lg">
            <CardContent className="p-1.5">
              <p className="text-[9px] font-medium text-white/90 mb-0.5">Best Month</p>
              <p className="text-sm font-bold text-white leading-tight" data-testid="text-best-month">
                {metrics?.bestMonth ? new Date(metrics.bestMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
              </p>
            </CardContent>
          </Card>
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
    </div>
  );
}
