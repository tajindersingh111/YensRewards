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
    <Card className="overflow-hidden" data-testid="card-leaderboard">
      {/* Blue-900 header block */}
      <div className="bg-blue-900 px-4 py-3 flex items-center gap-3">
        <div className="bg-yellow-400 rounded-lg p-2 flex-shrink-0">
          <Trophy className="w-4 h-4 text-blue-900" />
        </div>
        <h3 className="text-base font-black text-white uppercase tracking-tight">
          {t('customer.leaderboard.title')}
        </h3>
      </div>

      <div className="p-4 space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-2 p-2 rounded-lg ${
              entry.id === currentUserId
                ? "bg-blue-900/10 border border-blue-100"
                : "bg-muted/50"
            }`}
            data-testid={`row-leaderboard-${entry.id}`}
          >
            <div className="w-6 flex items-center justify-center flex-shrink-0">
              {getRankIcon(entry.rank) || (
                <span className="font-bold text-muted-foreground text-sm">{entry.rank}</span>
              )}
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-900/10 flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-blue-900 text-sm">{entry.name.charAt(0)}</span>
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
    </Card>
  );
}
