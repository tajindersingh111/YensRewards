import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

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

export default function PointsCard({ points, tier, nextTierPoints }: PointsCardProps) {
  const { t } = useTranslation();
  const progress = nextTierPoints ? (points / nextTierPoints) * 100 : 100;
  const nextTier = tier === "bronze" ? "silver" : "gold";

  return (
    <Card className="p-4 bg-blue-900 text-white rounded-2xl" data-testid="points-card">
      <div className="flex flex-col items-center gap-1.5">
        <Badge className={`${tierColors[tier]} px-3 py-0.5 text-sm`} data-testid={`badge-tier-${tier}`}>
          {t(`customer.tiers.${tier}`)} {t('customer.member')}
        </Badge>
        
        <div className="text-center">
          <p className="text-sm font-medium opacity-90 mb-0.5">{t('customer.points')}</p>
          <p className="text-5xl font-black" data-testid="text-points">{points}</p>
        </div>

        {nextTierPoints && (
          <div className="w-full space-y-0.5 mt-0.5">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center opacity-80">
              {nextTierPoints - points} {t('customer.pointsToNext', { tier: t(`customer.tiers.${nextTier}`) })}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
