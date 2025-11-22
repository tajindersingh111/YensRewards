import { useState, useRef } from "react";
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
import { Calendar, TrendingUp, BarChart3, Upload, Plus, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { DailySales } from "@shared/schema";

const CHANNELS = [
  "SHOP", "SUPALAI", "BALLOON", "BOX", "RIVER", "ARMY", "LAMP", 
  "CNY", "UNIVERSITY", "GRAB", "FOODPANDA", "LINEMAN", "SHOPEE", "SHOPZY", "G2"
];

const QUICK_AMOUNTS = [1500, 2500, 3000, 5000, 7500];

interface SalesFormData {
  date: string;
  orderChannel: string;
  netSales: string;
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
    grabFee: "0",
  });

  // Fetch sales metrics
  const { data: metrics } = useQuery<{
    todaySales: number;
    weekSales: number;
    monthSales: number;
  }>({
    queryKey: ['/api/admin/sales-tracker-metrics'],
  });

  // Fetch recent sales (last 10)
  const { data: recentSales = [] } = useQuery<DailySales[]>({
    queryKey: ['/api/admin/sales-overview'],
    select: (data) => data.slice(0, 10),
  });

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

  const handleQuickAmount = (amount: number) => {
    setFormData(prev => ({ ...prev, netSales: amount.toString() }));
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
      {/* Header - Simplified without navigation */}
      <div className="px-6 py-4 flex items-center gap-3">
        <img src={logoUrl} alt="Yen's Logo" className="w-12 h-12 rounded-lg" />
        <h1 className="text-3xl font-bold text-blue-700">Yen's Sales Tracker</h1>
      </div>

      {/* KPI Cards */}
      <div className="px-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Today's Sales */}
        <Card className="bg-white rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Today's Sales</p>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900" data-testid="text-today-sales">
              ฿{(metrics?.todaySales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* This Week */}
        <Card className="bg-blue-600 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white/90">This Week</p>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white" data-testid="text-week-sales">
              ฿{(metrics?.weekSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="bg-blue-600 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white/90">This Month</p>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white" data-testid="text-month-sales">
              ฿{(metrics?.monthSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Import Excel Section */}
      <div className="px-6 mb-6">
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
                <Select
                  value={formData.orderChannel}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, orderChannel: value }))}
                >
                  <SelectTrigger className="bg-yellow-50/50 border-yellow-200/50 rounded-lg" data-testid="select-sales-channel">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Amount Buttons */}
              <div className="space-y-2">
                <Label>Quick Amount</Label>
                <div className="grid grid-cols-5 gap-2">
                  {QUICK_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAmount(amount)}
                      className="hover-elevate bg-yellow-50/30 border-yellow-200/50 rounded-lg"
                      data-testid={`button-quick-${amount}`}
                    >
                      {(amount / 1000).toFixed(1)}k
                    </Button>
                  ))}
                </div>
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
                  className="bg-yellow-50/50 border-yellow-200/50 rounded-lg"
                  data-testid="input-net-sales"
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
                      <p className="text-xl font-bold text-gray-900">
                        ฿{parseFloat(sale.netSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
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
    </div>
  );
}
