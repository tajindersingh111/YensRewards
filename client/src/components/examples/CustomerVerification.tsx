import CustomerVerification from '../CustomerVerification';

export default function CustomerVerificationExample() {
  return (
    <CustomerVerification
      customerName="Somchai Prasert"
      points={1250}
      tier="gold"
      onConfirm={() => console.log("Confirmed")}
      onReject={() => console.log("Rejected")}
    />
  );
}
