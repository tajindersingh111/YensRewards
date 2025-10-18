import { createWorker } from 'tesseract.js';

/**
 * Extract amount from receipt image using OCR
 * Returns the detected amount or null if not found
 */
export async function extractAmountFromReceipt(imageDataUrl: string): Promise<number | null> {
  try {
    console.log('Starting OCR processing...');
    
    const worker = await createWorker('eng+tha', 1, {
      logger: (m) => console.log('OCR:', m),
    });

    const { data: { text } } = await worker.recognize(imageDataUrl);
    await worker.terminate();

    console.log('OCR Text extracted:', text);

    // Look for common patterns in Thai receipts
    // Patterns: "Total", "รวม", "ยอดรวม", numbers with ฿ or baht
    const patterns = [
      /(?:total|รวม|ยอดรวม|sum)[\s:]*(?:฿|baht|บาท)?[\s]*([0-9,]+\.?[0-9]*)/i,
      /฿[\s]*([0-9,]+\.?[0-9]*)/,
      /([0-9,]+\.?[0-9]*)[\s]*(?:baht|บาท)/i,
      /([0-9]{2,}\.?[0-9]{0,2})[\s]*$/m, // Last number on a line (often the total)
    ];

    const amounts: number[] = [];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(new RegExp(pattern, 'gm')));
      for (const match of matches) {
        const numStr = match[1]?.replace(/,/g, '');
        if (numStr) {
          const num = parseFloat(numStr);
          if (!isNaN(num) && num > 0 && num < 100000) { // Reasonable range
            amounts.push(num);
          }
        }
      }
    }

    console.log('Detected amounts:', amounts);

    if (amounts.length === 0) {
      return null;
    }

    // Return the largest amount (likely the total)
    const maxAmount = Math.max(...amounts);
    console.log('Selected amount:', maxAmount);
    return maxAmount;

  } catch (error) {
    console.error('OCR error:', error);
    return null;
  }
}
