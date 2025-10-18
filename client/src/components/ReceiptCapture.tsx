import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload } from "lucide-react";
import { useState } from "react";

interface ReceiptCaptureProps {
  customerName: string;
  onSubmit: (amount: number, imageUrl: string) => void;
}

export default function ReceiptCapture({ customerName, onSubmit }: ReceiptCaptureProps) {
  const [amount, setAmount] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleCapture = () => {
    //todo: remove mock functionality
    const mockImage = "https://placehold.co/400x600/FCD34D/003DA5?text=Receipt";
    setImagePreview(mockImage);
    console.log("Camera opened");
  };

  const handleSubmit = () => {
    if (amount) {
      const receiptUrl = imagePreview || "";
      onSubmit(parseFloat(amount), receiptUrl);
      console.log("Receipt submitted:", { amount, imagePreview });
    }
  };

  return (
    <Card className="p-6" data-testid="card-receipt-capture">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground">Enter Transaction</h3>
          <p className="text-sm text-muted-foreground">Customer: {customerName}</p>
        </div>

        <div className="space-y-4">
          <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            {imagePreview ? (
              <img src={imagePreview} alt="Receipt" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="text-center">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No receipt captured</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleCapture}
            variant="outline"
            className="w-full"
            data-testid="button-capture"
          >
            <Camera className="w-4 h-4 mr-2" />
            {imagePreview ? "Retake Photo" : "Take Photo (Optional)"}
          </Button>

          <div className="space-y-2">
            <Label htmlFor="amount">Purchase Amount (฿)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-amount"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!amount}
            className="w-full"
            size="lg"
            data-testid="button-submit-receipt"
          >
            <Upload className="w-4 h-4 mr-2" />
            Submit Transaction
          </Button>
        </div>
      </div>
    </Card>
  );
}
