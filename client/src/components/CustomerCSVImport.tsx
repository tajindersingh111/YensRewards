import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Users, AlertCircle, CheckCircle, Download } from "lucide-react";

interface ParsedCustomer {
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  birthday?: string;
  points?: string; // String from CSV, server will parse to number
  tier?: string;
  totalSpent?: string;
  registerDate?: string;
  registerBranch?: string;
  lastUse?: string;
  tag?: string;
  lineUid?: string;
}

interface CustomerCSVImportProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export default function CustomerCSVImport({ open, onOpenChange, showTrigger = true }: CustomerCSVImportProps = {}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  
  // Use controlled state if provided, otherwise use internal state
  const isDialogOpen = open !== undefined ? open : internalOpen;
  const setIsDialogOpen = onOpenChange || setInternalOpen;

  const downloadTemplate = () => {
    const templateData = [
      ['Crm Name', 'Membership Tier', 'Phone Number', 'Email', 'Gender', 'Birthdate', 'Register Date', 'Register Branch', 'Total Spending', 'Point', 'Last Use', 'Tag', 'Line UID'],
      ['สมชาย ใจดี', 'Member', '0812345678', 'somchai@example.com', 'Male', '15/01/1990', '01/11/2025', 'YensThailand Cafe & Bakery', '250', '25', '10/11/2025', 'VIP', ''],
      ['สมหญิง รักสะอาด', 'Gold', '0823456789', 'somying@example.com', 'Female', '20/03/1985', '05/10/2025', 'YensThailand Cafe & Bakery', '1500', '150', '12/11/2025', '', ''],
      ['John Smith', 'Silver', '0834567890', 'john.smith@example.com', 'Male', '10/05/1992', '15/09/2025', 'YensThailand Cafe & Bakery', '800', '80', '08/11/2025', 'Regular', ''],
    ];

    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'customer_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('common.success'),
      description: t('admin.customers.templateDownloaded'),
    });
  };

  const importMutation = useMutation({
    mutationFn: async (customers: ParsedCustomer[]) => {
      const response = await apiRequest('POST', '/api/admin/customers/import', { customers });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      setImportResult(data);
      toast({
        title: t('common.success'),
        description: `${t('admin.customers.imported')} ${data.imported}, ${t('admin.customers.updated')} ${data.updated}`,
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('admin.customers.importError'),
        variant: "destructive",
      });
    },
  });

  // Parse a single CSV line, preserving empty fields
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Push last value
    return values;
  };

  const parseCSV = (text: string) => {
    // Normalize line endings (handle Windows CRLF and Mac CR)
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.split('\n').filter(line => line.trim());
    const customers: ParsedCustomer[] = [];

    if (lines.length < 2) return customers;

    // Parse header row to detect column positions
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());

    // Map column names to their indices (support multiple variations)
    const columnMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Name variations
      if (h.includes('name') || h.includes('crm') || h === 'customer') columnMap['name'] = index;
      // Tier variations
      if (h.includes('tier') || h.includes('membership') || h.includes('level')) columnMap['tier'] = index;
      // Phone variations
      if (h.includes('phone') || h.includes('mobile') || h.includes('tel')) columnMap['phone'] = index;
      // Email variations
      if (h.includes('email') || h.includes('mail') || h === 'email') columnMap['email'] = index;
      // Gender variations
      if (h.includes('gender') || h.includes('sex')) columnMap['gender'] = index;
      // Birthday variations
      if (h.includes('birth') || h.includes('dob') || h.includes('birthday')) columnMap['birthday'] = index;
      // Register date variations
      if (h.includes('register') && h.includes('date')) columnMap['registerDate'] = index;
      // Register branch variations
      if (h.includes('register') && h.includes('branch')) columnMap['registerBranch'] = index;
      if (h.includes('branch') && !columnMap['registerBranch']) columnMap['registerBranch'] = index;
      // Total spent variations
      if (h.includes('total') && (h.includes('spend') || h.includes('spent') || h.includes('spending'))) columnMap['totalSpent'] = index;
      if (h.includes('spending') && !columnMap['totalSpent']) columnMap['totalSpent'] = index;
      // Points variations
      if (h === 'point' || h === 'points' || h.includes('point')) columnMap['points'] = index;
      // Last use variations
      if (h.includes('last') && (h.includes('use') || h.includes('visit'))) columnMap['lastUse'] = index;
      // Tag variations
      if (h === 'tag' || h === 'tags' || h.includes('tag')) columnMap['tag'] = index;
      // LINE UID variations
      if (h.includes('line') && (h.includes('uid') || h.includes('id'))) columnMap['lineUid'] = index;
    });

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length < 3) continue;

      // Get values by detected column positions, with fallback to fixed positions
      const getValue = (field: string, fallbackIndex: number): string | undefined => {
        const idx = columnMap[field] ?? fallbackIndex;
        return values[idx]?.trim() || undefined;
      };

      const name = getValue('name', 0);
      const tier = getValue('tier', 1);
      const phone = getValue('phone', 2);
      const email = getValue('email', 3);
      const gender = getValue('gender', 4);
      const birthday = getValue('birthday', 5);
      const registerDate = getValue('registerDate', 6);
      const registerBranch = getValue('registerBranch', 7);
      const totalSpent = getValue('totalSpent', 8);
      const points = getValue('points', 9);
      const lastUse = getValue('lastUse', 10);
      const tag = getValue('tag', 11);
      const lineUid = getValue('lineUid', 12);

      // Skip if required fields are empty
      if (!name || !phone) continue;

      const customer: ParsedCustomer = {
        name,
        phone,
        tier: tier || 'member',
        email,
        gender,
        birthday,
        registerDate,
        registerBranch,
        totalSpent,
        lastUse,
        tag,
        lineUid,
      };

      // Points as string - server will parse to number
      if (points) {
        customer.points = points;
      }

      customers.push(customer);
    }

    return customers;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const customers = parseCSV(text);
        setParsedCustomers(customers);
        setImportResult(null);
        toast({
          title: t('admin.customers.csvParsed'),
          description: `${t('admin.customers.foundCustomers', { count: customers.length })}`,
        });
      } catch (error) {
        toast({
          title: t('common.error'),
          description: t('admin.customers.parseError'),
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    importMutation.mutate(parsedCustomers);
  };

  const handleReset = () => {
    setParsedCustomers([]);
    setImportResult(null);
  };

  const dialogTrigger = showTrigger ? (
    <DialogTrigger asChild>
      <Button variant="outline" className="hover-elevate active-elevate-2" data-testid="button-import-csv-customers">
        <Upload className="w-4 h-4 mr-2" />
        {t('admin.customers.importCSV')}
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {dialogTrigger}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admin.customers.importFromCSV')}</DialogTitle>
        </DialogHeader>

        {!parsedCustomers.length && !importResult && (
          <div className="space-y-4">
            <Card className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">{t('admin.customers.uploadCSV')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('admin.customers.uploadDescription')}
              </p>
              <div className="text-xs text-muted-foreground mb-4 text-left bg-muted/50 p-3 rounded border">
                <p className="font-semibold mb-2">{t('admin.customers.csvFormat')}:</p>
                <div className="space-y-1">
                  <p>1. Crm Name</p>
                  <p>2. Membership Tier</p>
                  <p>3. Phone Number</p>
                  <p>4. Email</p>
                  <p>5. Gender</p>
                  <p>6. Birthdate</p>
                  <p>7. Register Date</p>
                  <p>8. Register Branch</p>
                  <p>9. Total Spending</p>
                  <p>10. Point</p>
                  <p>11. Last Use</p>
                  <p>12. Tag</p>
                  <p>13. Line UID</p>
                </div>
              </div>
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  className="hover-elevate active-elevate-2"
                  onClick={downloadTemplate}
                  data-testid="button-download-template"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('admin.customers.downloadTemplate')}
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload-customers"
                  data-testid="input-csv-file-customers"
                />
                <label htmlFor="csv-upload-customers">
                  <Button asChild variant="outline" className="hover-elevate active-elevate-2">
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('common.upload')}
                    </span>
                  </Button>
                </label>
              </div>
            </Card>
          </div>
        )}

        {parsedCustomers.length > 0 && !importResult && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">{t('admin.customers.preview')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('admin.customers.readyToImport', { count: parsedCustomers.length })}
              </p>
              
              <div className="max-h-96 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">{t('admin.customers.name')}</th>
                      <th className="text-left p-2">{t('admin.customers.phone')}</th>
                      <th className="text-left p-2">{t('admin.customers.tier')}</th>
                      <th className="text-left p-2">{t('admin.customers.points')}</th>
                      <th className="text-left p-2">{t('admin.customers.totalSpent')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedCustomers.slice(0, 50).map((customer, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{customer.name}</td>
                        <td className="p-2">{customer.phone}</td>
                        <td className="p-2">{customer.tier}</td>
                        <td className="p-2">{customer.points || 0}</td>
                        <td className="p-2">฿{customer.totalSpent || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedCustomers.length > 50 && (
                  <div className="p-2 text-center text-xs text-muted-foreground border-t">
                    {t('admin.customers.showingFirst', { count: 50, total: parsedCustomers.length })}
                  </div>
                )}
              </div>
            </Card>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="hover-elevate active-elevate-2"
                data-testid="button-reset-import"
              >
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleImport}
                disabled={importMutation.isPending}
                className="hover-elevate active-elevate-2"
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? t('common.loading') : t('admin.customers.import')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {importResult && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">{t('admin.customers.importComplete')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('admin.customers.totalProcessed')}: {importResult.total}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-700">{importResult.imported}</div>
                  <div className="text-xs text-green-600">{t('admin.customers.newImported')}</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
                  <div className="text-xs text-blue-600">{t('admin.customers.existingUpdated')}</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-700">{importResult.failed}</div>
                  <div className="text-xs text-red-600">{t('admin.customers.failed')}</div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {t('admin.customers.errors')}:
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {importResult.errors.map((error: any, idx: number) => (
                      <div key={idx} className="text-xs p-2 bg-red-50 rounded border border-red-200">
                        <div className="font-semibold">{error.name} ({error.phone})</div>
                        <div className="text-muted-foreground">{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <DialogFooter>
              <Button 
                onClick={() => {
                  handleReset();
                  setIsDialogOpen(false);
                }}
                className="hover-elevate active-elevate-2"
                data-testid="button-close-import"
              >
                {t('common.close')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
