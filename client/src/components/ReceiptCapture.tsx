import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, CheckCircle, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";

interface ReceiptCaptureProps {
  customerName: string;
  onSubmit: (amount: number, imageUrl: string) => void;
}

export default function ReceiptCapture({ customerName, onSubmit }: ReceiptCaptureProps) {
  const [amount, setAmount] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed!", e.target.files);
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name, file.type, file.size);
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log("File loaded successfully");
        setImagePreview(event.target?.result as string);
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
    <Card className="p-6 w-full" data-testid="card-receipt-capture">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground">Enter Transaction</h3>
          <p className="text-base text-muted-foreground">Customer: {customerName}</p>
        </div>

        <div className="space-y-4">
          {/* Receipt Photo - REQUIRED */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Receipt Photo</Label>
              <span className="text-sm text-destructive font-medium">* Required</span>
            </div>
            
            <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border relative">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Receipt" className="w-full h-full object-cover rounded-lg" />
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-base font-medium text-foreground">Receipt photo required</p>
                  <p className="text-sm text-muted-foreground mt-1">Take photo or choose from gallery</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 mt-2">
              {/* Visible file input styled as button - MOST RELIABLE for Android PWA */}
              <div className="relative">
                <input
                  id="receipt-file-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  data-testid="input-file-receipt"
                />
                <div className="inline-flex items-center justify-center rounded-md text-sm font-medium h-12 px-4 py-2 w-full bg-primary text-primary-foreground pointer-events-none">
                  <Camera className="w-5 h-5 mr-2" />
                  {imagePreview ? "Retake Photo" : "Take Receipt Photo"}
                </div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount" className="text-base font-semibold">Purchase Amount (฿)</Label>
              <span className="text-sm text-destructive font-medium">* Required</span>
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg h-12"
              data-testid="input-amount"
            />
            {amount && (
              <p className="text-base text-muted-foreground">
                Points to earn: <span className="font-semibold text-foreground text-lg">{Math.floor(parseFloat(amount) / 10)}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
            data-testid="button-submit-receipt"
          >
            <Upload className="w-5 h-5 mr-2" />
            {!imagePreview && !amount 
              ? "Add Receipt Photo & Amount"
              : !imagePreview 
                ? "Add Receipt Photo First"
                : !amount
                  ? "Enter Amount to Continue"
                  : "Submit Transaction"}
          </Button>

          {!canSubmit && (
            <p className="text-sm text-center text-muted-foreground">
              Both receipt photo and amount are required to track purchases and calculate points
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
