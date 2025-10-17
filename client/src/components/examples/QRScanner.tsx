import QRScanner from '../QRScanner';

export default function QRScannerExample() {
  return <QRScanner onScan={(id) => console.log("Scanned:", id)} />;
}
