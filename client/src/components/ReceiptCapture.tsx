import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, CheckCircle, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { extractAmountFromReceipt } from "@/lib/ocr";

interface ReceiptCaptureProps {
  customerName: string;
  onSubmit: (amount: number, imageUrl: string) => void;
}

export default function ReceiptCapture({ customerName, onSubmit }: ReceiptCaptureProps) {
  const [amount, setAmount] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrDetected, setOcrDetected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed!", e.target.files);
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name, file.type, file.size);
      const reader = new FileReader();
      reader.onload = async (event) => {
        console.log("File loaded successfully");
        const dataUrl = event.target?.result as string;
        setImagePreview(dataUrl);
        
        // Start OCR processing
        setIsProcessing(true);
        setOcrDetected(false);
        
        try {
          const detectedAmount = await extractAmountFromReceipt(dataUrl);
          if (detectedAmount !== null) {
            setAmount(detectedAmount.toString());
            setOcrDetected(true);
            console.log("OCR detected amount:", detectedAmount);
          } else {
            console.log("OCR could not detect amount");
          }
        } catch (error) {
          console.error("OCR processing failed:", error);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        alert("Error loading image - please try again");
      };
      reader.readAsDataURL(file);
    } else {
      console.log("No file selected");
    }
  };

  const handleCaptureClick = () => {
    console.log("Camera button clicked!");
    if (fileInputRef.current) {
      console.log("File input found, triggering click...");
      fileInputRef.current.click();
    } else {
      console.error("File input ref is null!");
      alert("Camera button error - please refresh the app");
    }
  };

  const handleSubmit = () => {
    if (amount && imagePreview) {
      onSubmit(parseFloat(amount), imagePreview);
      console.log("Receipt submitted:", { amount, imagePreview });
    }
  };

  const canSubmit = amount && imagePreview;

  return (
    <Card className="p-4 w-full" data-testid="card-receipt-capture">
      <div className="space-y-3">
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground">Enter Transaction</h3>
          <p className="text-sm text-muted-foreground">Customer: {customerName}</p>
        </div>

        <div className="space-y-3">
          {/* Receipt Photo - REQUIRED */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-semibold">Receipt Photo *</Label>
            </div>
            
            {/* Compact Preview: Show small thumbnail when captured, camera prompt when not */}
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border relative">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Receipt" className="w-full h-full object-cover rounded-lg" />
                  <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </>
              ) : (
                <div className="text-center p-2">
                  <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm font-medium text-foreground">Tap below to capture</p>
                </div>
              )}
            </div>

            <div className="mt-2">
              <input
                id="receipt-file-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="w-full h-10 text-xs file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                data-testid="input-file-receipt"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-semibold">Amount (฿) *</Label>
            
            {isProcessing && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Reading receipt...</span>
              </div>
            )}
            
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder={isProcessing ? "Reading..." : "0.00"}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setOcrDetected(false);
              }}
              disabled={isProcessing}
              className="text-lg h-10"
              data-testid="input-amount"
            />
            
            {ocrDetected && amount && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ Auto-detected
              </p>
            )}
            
            {amount && !isProcessing && (
              <p className="text-sm text-muted-foreground">
                Points: <span className="font-semibold text-foreground">{Math.floor(parseFloat(amount) / 10)}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
            data-testid="button-submit-receipt"
          >
            <Upload className="w-4 h-4 mr-2" />
            {!imagePreview && !amount 
              ? "Add Photo & Amount"
              : !imagePreview 
                ? "Add Photo First"
                : !amount
                  ? "Enter Amount"
                  : "Submit Transaction"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
