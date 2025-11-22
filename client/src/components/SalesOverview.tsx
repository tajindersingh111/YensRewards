import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Upload, Plus } from "lucide-react";
import type { DailySales } from "@shared/schema";

// Site/channel options
const CHANNELS = [
  "SHOP", "SUPALAI", "BALLOON", "BOX", "RIVER", "ARMY", "LAMP", 
  "CNY", "UNIVERSITY", "GRAB", "FOODPANDA", "LINEMAN", "SHOPEE"
];

interface SalesFormData {
  date: string;
  orderChannel: string;
  netSales: string;
  grabFee: string;
  totalSales: string;
}

export default function SalesOverview() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SalesFormData>({
    date: new Date().toISOString().split('T')[0],
    orderChannel: "",
    netSales: "",
    grabFee: "0",
    totalSales: "",
  });

  // Fetch sales metrics (server-calculated for accuracy)
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useQuery<{
    currentMonthRevenue: number;
    lastMonthRevenue: number;
    momGrowth: number;
    avgTransaction: number;
    transactionCount: number;
  }>({
    queryKey: ['/api/admin/sales-metrics'],
  });

  // Fetch daily sales for table display (recent 50)
  const { data: salesData = [], isLoading: salesLoading } = useQuery<DailySales[]>({
    queryKey: ['/api/admin/sales-overview'],
  });

  // Show error toast if metrics fail to load (wrapped in useEffect to prevent repeated toasts)
  useEffect(() => {
    if (metricsError) {
      toast({
        title: t('sales.metricsError'),
        description: t('sales.metricsErrorDesc'),
        variant: "destructive",
      });
    }
  }, [metricsError, t, toast]);

  // Use metrics from server or defaults
  const currentMonthRevenue = metrics?.currentMonthRevenue ?? 0;
  const momGrowth = metrics?.momGrowth ?? 0;
  const avgTransaction = metrics?.avgTransaction ?? 0;
  const transactionCount = metrics?.transactionCount ?? 0;

  // Add sale mutation
  const addSaleMutation = useMutation({
    mutationFn: async (data: SalesFormData) => {
      return await apiRequest('POST', '/api/admin/sales', {
        ...data,
        netSales: parseFloat(data.netSales).toFixed(2),
        grabFee: parseFloat(data.grabFee).toFixed(2),
        totalSales: parseFloat(data.totalSales).toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-metrics'] });
      toast({
        title: t('sales.saleAdded'),
        description: t('sales.saleAddedDesc'),
      });
      setIsAddDialogOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        orderChannel: "",
        netSales: "",
        grabFee: "0",
        totalSales: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('sales.addSaleFailed'),
        variant: "destructive",
      });
    },
  });

  // Excel import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/import-sales-excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-metrics'] });
      toast({
        title: t('sales.importSuccess'),
        description: t('sales.importSuccessDesc', { count: data.imported, sheets: data.sheetsProcessed }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('sales.importFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = () => {
    // Validate required fields (grab fee is optional, defaults to 0)
    if (!formData.orderChannel || !formData.netSales || !formData.totalSales) {
      toast({
        title: t('sales.validationError'),
        description: t('sales.fillRequired'),
        variant: "destructive",
      });
      return;
    }

    // Validate numeric values (treat empty grabFee as 0)
    const netSales = parseFloat(formData.netSales);
    const grabFee = formData.grabFee === "" ? 0 : parseFloat(formData.grabFee);
    const totalSales = parseFloat(formData.totalSales);

    if (isNaN(netSales) || isNaN(totalSales)) {
      toast({
        title: t('sales.invalidNumbers'),
        description: t('sales.invalidNumbersDesc'),
        variant: "destructive",
      });
      return;
    }

    if (netSales < 0 || grabFee < 0 || totalSales < 0) {
      toast({
        title: t('sales.invalidAmount'),
        description: t('sales.negativeAmount'),
        variant: "destructive",
      });
      return;
    }

    // Submit with grabFee defaulting to "0" if empty
    addSaleMutation.mutate({
      ...formData,
      grabFee: formData.grabFee === "" ? "0" : formData.grabFee,
    });
  };

  // Auto-calculate total sales when net sales or grab fee changes
  const updateTotalSales = (netSales: string, grabFee: string) => {
    const net = parseFloat(netSales) || 0;
    const fee = parseFloat(grabFee) || 0;
    const total = net + fee;
    return total.toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-current-month-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sales.currentMonthRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-[#FCD34D]" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="text-sm text-muted-foreground">{t('sales.loading')}</div>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#FCD34D]">฿{currentMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-mom-growth">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sales.momGrowth')}</CardTitle>
            {momGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="text-sm text-muted-foreground">{t('sales.loading')}</div>
            ) : (
              <>
                <div className={`text-2xl font-bold ${momGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {momGrowth >= 0 ? '+' : ''}{momGrowth.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">{t('sales.vsLastMonth')}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-avg-transaction">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sales.avgTransaction')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-[#FCD34D]" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="text-sm text-muted-foreground">{t('sales.loading')}</div>
            ) : (
              <>
                <div className="text-2xl font-bold">฿{avgTransaction.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{t('sales.perSale')}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-transaction-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sales.totalTransactions')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="text-sm text-muted-foreground">{t('sales.loading')}</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{transactionCount}</div>
                <p className="text-xs text-muted-foreground">{t('sales.thisMonth')}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          data-testid="button-add-sale"
          className="bg-[#FCD34D] hover:bg-[#FCD34D]/90 text-black font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('sales.addNewSale')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          data-testid="input-file-upload"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={importMutation.isPending}
          data-testid="button-import-excel"
        >
          <Upload className="h-4 w-4 mr-2" />
          {importMutation.isPending ? t('sales.importing') : t('sales.importExcel')}
        </Button>
      </div>

      {/* Recent Sales Table */}
      <Card data-testid="card-recent-sales">
        <CardHeader>
          <CardTitle>{t('sales.recentSales')}</CardTitle>
          <CardDescription>{t('sales.recentSalesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('sales.loading')}</div>
          ) : salesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('sales.noData')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sales.date')}</TableHead>
                  <TableHead>{t('sales.day')}</TableHead>
                  <TableHead>{t('sales.channel')}</TableHead>
                  <TableHead className="text-right">{t('sales.netSales')}</TableHead>
                  <TableHead className="text-right">{t('sales.grabFee')}</TableHead>
                  <TableHead className="text-right">{t('sales.totalSales')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.slice(0, 50).map((sale) => (
                  <TableRow key={`${sale.date}-${sale.orderChannel}`} data-testid={`row-sale-${sale.id || ''}`}>
                    <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.dayOfWeek || ''}</TableCell>
                    <TableCell>
                      <span className="font-medium text-[#FCD34D]">{sale.orderChannel}</span>
                    </TableCell>
                    <TableCell className="text-right">฿{parseFloat(sale.netSales || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">฿{parseFloat(sale.grabFee || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold">฿{parseFloat(sale.totalSales || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Sale Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-sale">
          <DialogHeader>
            <DialogTitle>{t('sales.addNewSale')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">{t('sales.date')}</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                data-testid="input-sale-date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channel">{t('sales.orderChannel')} *</Label>
              <Select
                value={formData.orderChannel || undefined}
                onValueChange={(value) => setFormData({ ...formData, orderChannel: value })}
              >
                <SelectTrigger data-testid="select-order-channel">
                  <SelectValue placeholder={t('sales.selectChannel')} />
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
            <div className="grid gap-2">
              <Label htmlFor="netSales">{t('sales.netSales')} (฿)</Label>
              <Input
                id="netSales"
                type="number"
                step="0.01"
                value={formData.netSales}
                onChange={(e) => {
                  const newNetSales = e.target.value;
                  setFormData({
                    ...formData,
                    netSales: newNetSales,
                    totalSales: updateTotalSales(newNetSales, formData.grabFee),
                  });
                }}
                data-testid="input-net-sales"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grabFee">{t('sales.grabFee')} (฿)</Label>
              <Input
                id="grabFee"
                type="number"
                step="0.01"
                value={formData.grabFee}
                onChange={(e) => {
                  const newGrabFee = e.target.value;
                  setFormData({
                    ...formData,
                    grabFee: newGrabFee,
                    totalSales: updateTotalSales(formData.netSales, newGrabFee),
                  });
                }}
                data-testid="input-grab-fee"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="totalSales">{t('sales.totalSales')} (฿)</Label>
              <Input
                id="totalSales"
                type="number"
                step="0.01"
                value={formData.totalSales}
                onChange={(e) => setFormData({ ...formData, totalSales: e.target.value })}
                data-testid="input-total-sales"
              />
              <p className="text-xs text-muted-foreground">{t('sales.autoCalculated')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              data-testid="button-cancel"
            >
              {t('sales.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addSaleMutation.isPending}
              className="bg-[#FCD34D] hover:bg-[#FCD34D]/90 text-black font-semibold"
              data-testid="button-submit-sale"
            >
              {addSaleMutation.isPending ? t('sales.adding') : t('sales.addSale')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
