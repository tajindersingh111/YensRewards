import PromotionCreator from '../PromotionCreator';

export default function PromotionCreatorExample() {
  return <PromotionCreator onSend={(msg, tier) => console.log("Sent:", msg, tier)} />;
}
