import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PointsCardProps {
  points: number;
  tier: "bronze" | "silver" | "gold";
  nextTierPoints?: number;
}

const tierColors = {
  bronze: "bg-[hsl(30,60%,50%)] text-white",
  silver: "bg-[hsl(0,0%,63%)] text-white",
  gold: "bg-[hsl(45,93%,47%)] text-white",
};

const tierNames = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

export default function PointsCard({ points, tier, nextTierPoints }: PointsCardProps) {
  const progress = nextTierPoints ? (points / nextTierPoints) * 100 : 100;

  return (
    <Card className="p-14 bg-primary text-primary-foreground rounded-2xl" data-testid="points-card">
      <div className="flex flex-col items-center gap-6">
        <Badge className={`${tierColors[tier]} px-6 py-2 text-lg`} data-testid={`badge-tier-${tier}`}>
          {tierNames[tier]} Member
        </Badge>
        
        <div className="text-center">
          <p className="text-xl font-medium opacity-90 mb-4">Your Points</p>
          <p className="text-9xl font-bold" data-testid="text-points">{points}</p>
        </div>

        {nextTierPoints && (
          <div className="w-full space-y-3 mt-4">
            <Progress value={progress} className="h-3.5" />
            <p className="text-lg text-center opacity-80">
              {nextTierPoints - points} points to {tier === "bronze" ? "Silver" : "Gold"}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
