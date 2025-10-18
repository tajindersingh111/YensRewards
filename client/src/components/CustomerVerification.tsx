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
    <Card className="p-6 sm:p-8" data-testid="card-customer-verification">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Verify Customer</h3>
          <p className="text-base sm:text-lg text-muted-foreground">
            Confirm this is the correct customer
          </p>
        </div>

        <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-primary" data-testid="avatar-customer">
          <AvatarImage src={customerPhoto} alt={customerName} />
          <AvatarFallback className={`text-3xl sm:text-4xl font-bold text-white ${tierColors[tier]}`}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-customer-name">
            {customerName}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-primary" data-testid="text-customer-points">
                {points}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">Points</p>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <p className="text-base sm:text-lg font-semibold text-foreground capitalize" data-testid="text-customer-tier">
                {tier}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">Tier</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md space-y-3">
          {/* Primary Action: Confirm (Large, Prominent) */}
          <Button
            onClick={onConfirm}
            size="lg"
            className="w-full min-h-14 text-base sm:text-lg"
            data-testid="button-confirm-customer"
          >
            <CheckCircle className="w-6 h-6 mr-2" />
            Confirm
          </Button>
          
          {/* Secondary Action: Wrong Customer (Small, Right Edge) */}
          <div className="flex justify-end">
            <Button
              onClick={onReject}
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground min-h-10 text-sm sm:text-base"
              data-testid="button-reject"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Wrong Customer
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
