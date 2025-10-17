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
  bronze: "bg-[hsl(30,60%,50%)]",
  silver: "bg-[hsl(0,0%,63%)]",
  gold: "bg-[hsl(45,93%,47%)]",
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
    <Card className="p-8" data-testid="card-customer-verification">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground mb-2">Verify Customer</h3>
          <p className="text-sm text-muted-foreground">
            Confirm this is the correct customer
          </p>
        </div>

        <Avatar className="w-32 h-32 border-4 border-primary" data-testid="avatar-customer">
          <AvatarImage src={customerPhoto} alt={customerName} />
          <AvatarFallback className={`text-4xl font-bold text-white ${tierColors[tier]}`}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground" data-testid="text-customer-name">
            {customerName}
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary" data-testid="text-customer-points">
                {points}
              </p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground capitalize" data-testid="text-customer-tier">
                {tier}
              </p>
              <p className="text-xs text-muted-foreground">Tier</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-md">
          <Button
            onClick={onReject}
            variant="outline"
            size="lg"
            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            data-testid="button-reject"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Wrong Customer
          </Button>
          <Button
            onClick={onConfirm}
            size="lg"
            className="flex-1"
            data-testid="button-confirm-customer"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </Card>
  );
}
