import ReceiptCapture from '../ReceiptCapture';

export default function ReceiptCaptureExample() {
  return (
    <ReceiptCapture
      customerName="Somchai"
      onSubmit={(amount, url) => console.log("Submitted:", amount, url)}
    />
  );
}
