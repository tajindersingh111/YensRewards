import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CustomerVerificationProps {
  customerName: string;
  customerPhoto?: string;
  points: number;
  tier: "bronze" | "silver" | "gold";
  onConfirm: () => void;
  onReject: () => void;
}

const tierColors = {
  bronze: "bg-primary/70",
  silver: "bg-primary/50",
  gold: "bg-primary",
};

export default function CustomerVerification({
  customerName,
  customerPhoto,
  points,
  tier,
  onConfirm,
  onReject,
}: CustomerVerificationProps) {
  const initials = customerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="p-4" data-testid="card-customer-verification">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground mb-1">Verify Customer</h3>
          <p className="text-xs text-muted-foreground">
            Confirm this is the correct customer
          </p>
        </div>

        <Avatar className="w-24 h-24 border-4 border-primary" data-testid="avatar-customer">
          <AvatarImage src={customerPhoto} alt={customerName} />
          <AvatarFallback className={`text-3xl font-bold text-white ${tierColors[tier]}`}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-foreground" data-testid="text-customer-name">
            {customerName}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <div className="text-center">
              <p className="text-xl font-bold text-primary" data-testid="text-customer-points">
                {points}
              </p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground capitalize" data-testid="text-customer-tier">
                {tier}
              </p>
              <p className="text-xs text-muted-foreground">Tier</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md space-y-2">
          {/* Primary Action: Confirm (Large, Prominent) */}
          <Button
            onClick={onConfirm}
            size="lg"
            className="w-full"
            data-testid="button-confirm-customer"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm
          </Button>
          
          {/* Secondary Action: Wrong Customer (Small, Right Edge) */}
          <div className="flex justify-end">
            <Button
              onClick={onReject}
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              data-testid="button-reject"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Wrong Customer
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
