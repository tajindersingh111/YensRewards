import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

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
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      onImport(file);
      toast({
        title: "Import Started",
        description: `Processing ${file.name}...`,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = () => {
    onExport();
    toast({
      title: "Export Complete",
      description: `${customerCount} customers exported to CSV`,
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
          <h3 className="text-lg font-semibold text-foreground">Customer Data</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Import customers from CSV or export current customer list
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
            Import CSV
          </Button>

          <Button
            onClick={handleExport}
            variant="outline"
            className="flex-1"
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="font-medium mb-1">CSV Format:</p>
          <p className="font-mono">name,phone,email,birthday</p>
          <p className="mt-1">Example: John Doe,+66812345678,john@email.com,1990-03-15</p>
        </div>
      </div>
    </Card>
  );
}
