import TransactionConfirm from '../TransactionConfirm';

export default function TransactionConfirmExample() {
  return (
    <TransactionConfirm
      customerName="Somchai"
      amount={120}
      points={12}
      onConfirm={() => console.log("Confirmed")}
      onCancel={() => console.log("Cancelled")}
    />
  );
}
