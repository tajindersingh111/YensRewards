import LeaderboardCard from '../LeaderboardCard';

export default function LeaderboardCardExample() {
  const entries = [
    { id: "1", name: "Somchai", points: 1250, rank: 1 },
    { id: "2", name: "Jaruwan", points: 980, rank: 2 },
    { id: "3", name: "Orapan", points: 875, rank: 3 },
    { id: "4", name: "Phongthep", points: 720, rank: 4 },
  ];

  return <LeaderboardCard entries={entries} currentUserId="1" />;
}
