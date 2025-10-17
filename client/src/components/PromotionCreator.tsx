import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PromotionCreatorProps {
  onSend: (message: string, targetTier?: string) => void;
}

export default function PromotionCreator({ onSend }: PromotionCreatorProps) {
  const [message, setMessage] = useState("");
  const [targetTier, setTargetTier] = useState("all");
  const { toast } = useToast();

  const handleSend = () => {
    //todo: remove mock functionality
    if (message.trim()) {
      onSend(message, targetTier === "all" ? undefined : targetTier);
      toast({
        title: "Message Sent!",
        description: `Promotion sent to ${targetTier === "all" ? "all customers" : targetTier + " tier"}`,
      });
      setMessage("");
      console.log("Message sent:", { message, targetTier });
    }
  };

  return (
    <Card className="p-6" data-testid="card-promotion-creator">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Send Promotion</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target">Target Audience</Label>
            <select
              id="target"
              value={targetTier}
              onChange={(e) => setTargetTier(e.target.value)}
              className="w-full p-2 rounded-md border border-input bg-background"
              data-testid="select-target-tier"
            >
              <option value="all">All Customers</option>
              <option value="bronze">Bronze Tier</option>
              <option value="silver">Silver Tier</option>
              <option value="gold">Gold Tier</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your promotional message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              data-testid="textarea-message"
            />
            <p className="text-xs text-muted-foreground">
              SMS character count: {message.length}/160
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-full"
            data-testid="button-send-promotion"
          >
            <Users className="w-4 h-4 mr-2" />
            Send to {targetTier === "all" ? "All Customers" : `${targetTier} Tier`}
          </Button>
        </div>
      </div>
    </Card>
  );
}
