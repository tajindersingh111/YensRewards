import PromotionCard from '../PromotionCard';

export default function PromotionCardExample() {
  return (
    <PromotionCard
      title="Birthday Bonus!"
      description="Get 100 extra points on your birthday month"
      validUntil={new Date(2025, 2, 31)}
      isNew={true}
    />
  );
}
