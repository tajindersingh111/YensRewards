import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

interface CustomerImportExportProps {
  onImport: (file: File) => void;
  onExport: () => void;
  customerCount: number;
}

export default function CustomerImportExport({
  onImport,
  onExport,
  customerCount,
}: CustomerImportExportProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: t('customers.invalidFile'),
          description: t('customers.invalidFileDesc'),
          variant: "destructive",
        });
        return;
      }
      onImport(file);
      toast({
        title: t('customers.importStarted'),
        description: t('customers.processingFile', { filename: file.name }),
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = () => {
    onExport();
    toast({
      title: t('customers.exportComplete'),
      description: t('customers.customersExported', { count: customerCount }),
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="p-6" data-testid="card-import-export">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{t('customers.customerData')}</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          {t('customers.importExportDesc')}
        </p>

        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />
          
          <Button
            onClick={handleUploadClick}
            variant="outline"
            className="flex-1"
            data-testid="button-import-csv"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('customers.importCSV')}
          </Button>

          <Button
            onClick={handleExport}
            variant="outline"
            className="flex-1"
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('customers.exportCSV')}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="font-medium mb-1">{t('customers.csvFormat')}</p>
          <p className="font-mono">name,phone,email,birthday</p>
          <p className="mt-1">{t('customers.csvExample')}</p>
        </div>
      </div>
    </Card>
  );
}
