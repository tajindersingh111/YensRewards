import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
}

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export default function LeaderboardCard({ entries, currentUserId }: LeaderboardCardProps) {
  const { t } = useTranslation();
  
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-[hsl(45,93%,47%)]" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-[hsl(0,0%,63%)]" />;
    if (rank === 3) return <Award className="w-5 h-5 text-[hsl(30,60%,50%)]" />;
    return null;
  };

  return (
    <Card className="p-6" data-testid="card-leaderboard">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">{t('customer.leaderboard.title')}</h3>
        </div>

        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                entry.id === currentUserId ? "bg-primary/10" : "bg-muted/50"
              }`}
              data-testid={`row-leaderboard-${entry.id}`}
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                {getRankIcon(entry.rank) || (
                  <span className="font-bold text-muted-foreground text-sm">{entry.rank}</span>
                )}
              </div>
              
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary text-sm">{entry.name.charAt(0)}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{entry.name}</p>
              </div>

              <Badge variant="secondary" className="flex-shrink-0 text-xs" data-testid={`text-points-${entry.id}`}>
                {entry.points} {t('customer.leaderboard.pointsAbbr')}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
