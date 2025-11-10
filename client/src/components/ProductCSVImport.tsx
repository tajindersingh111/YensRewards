import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";

interface ParsedProduct {
  productCode: string;
  name: string;
  category: string;
  price: number;
  cost: number;
}

const CATEGORY_MAP: Record<string, string> = {
  "ไอศครีม": "soft_serve",
  "ชานม": "milk_tea",
  "ชาผลไม้": "fruit_tea",
  "สมูตตี้": "smoothie",
};

export default function ProductCSVImport() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (products: ParsedProduct[]) => {
      return await apiRequest('POST', '/api/admin/products/import', { products });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setImportResult(data);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.imported} products`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import products",
        variant: "destructive",
      });
    },
  });

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const products: ParsedProduct[] = [];

    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Parse CSV (handle quoted values)
      const regex = /"([^"]*)"|([^,]+)/g;
      const values: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        values.push(match[1] || match[2] || '');
      }

      if (values.length < 8) continue; // Skip invalid rows
      if (values[1] === 'Total') continue; // Skip total row

      const productCode = values[0].trim();
      const productName = values[1].trim();
      const categoryThai = values[3].trim();
      const costStr = values[4].trim();
      const priceStr = values[6].trim();

      // Skip if product name is empty
      if (!productName) continue;

      // Map Thai category to English
      const category = CATEGORY_MAP[categoryThai] || "soft_serve";

      // Parse cost (remove commas and convert to number)
      const costNum = parseFloat(costStr.replace(/,/g, '')) || 0;
      
      // Parse price (convert to number)
      const priceNum = parseFloat(priceStr.replace(/,/g, '')) || 0;

      products.push({
        productCode,
        name: productName,
        category,
        price: priceNum,
        cost: costNum > 1000 ? 0 : costNum, // Skip unrealistic costs
      });
    }

    return products;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const products = parseCSV(text);
        setParsedProducts(products);
        setImportResult(null);
        toast({
          title: "CSV Parsed",
          description: `Found ${products.length} products ready to import`,
        });
      } catch (error) {
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    importMutation.mutate(parsedProducts);
  };

  const handleReset = () => {
    setParsedProducts([]);
    setImportResult(null);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover-elevate active-elevate-2" data-testid="button-import-csv">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
        </DialogHeader>

        {!parsedProducts.length && !importResult && (
          <div className="space-y-4">
            <Card className="p-6 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">Upload CSV File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a CSV file with product data (Product code, Name, Category, Cost, Price)
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                data-testid="input-csv-file"
              />
              <label htmlFor="csv-upload">
                <Button asChild variant="outline" className="hover-elevate active-elevate-2">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </span>
                </Button>
              </label>
            </Card>
          </div>
        )}

        {parsedProducts.length > 0 && !importResult && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Products to Import: {parsedProducts.length}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  data-testid="button-reset-import"
                >
                  Reset
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="p-2">Code</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedProducts.map((product, index) => (
                      <tr key={index} className="border-b" data-testid={`preview-row-${index}`}>
                        <td className="p-2 text-xs">{product.productCode || '-'}</td>
                        <td className="p-2">{product.name}</td>
                        <td className="p-2 text-xs">{product.category}</td>
                        <td className="p-2">฿{product.price}</td>
                        <td className="p-2 text-muted-foreground">฿{product.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {importResult && (
          <Card className="p-6">
            <div className="text-center space-y-4">
              {importResult.errors === 0 ? (
                <>
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                  <h3 className="font-semibold text-lg">Import Successful!</h3>
                  <p className="text-muted-foreground">
                    {importResult.imported} products have been imported successfully
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 mx-auto text-yellow-500" />
                  <h3 className="font-semibold text-lg">Import Completed with Errors</h3>
                  <p className="text-muted-foreground">
                    {importResult.imported} products imported, {importResult.errors} errors
                  </p>
                  {importResult.details && importResult.details.length > 0 && (
                    <div className="text-left max-h-48 overflow-y-auto bg-muted p-3 rounded">
                      {importResult.details.map((error: any, index: number) => (
                        <p key={index} className="text-xs mb-1">
                          {error.product}: {error.error}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        <DialogFooter>
          {parsedProducts.length > 0 && !importResult && (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importMutation.isPending ? "Importing..." : `Import ${parsedProducts.length} Products`}
            </Button>
          )}
          {importResult && (
            <Button
              onClick={() => {
                setIsDialogOpen(false);
                handleReset();
              }}
              data-testid="button-close-import"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
