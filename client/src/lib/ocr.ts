import { createWorker } from 'tesseract.js';

/**
 * Extract amount from receipt image using OCR
 * Returns object with amount and extracted text for debugging
 */
export async function extractAmountFromReceipt(imageDataUrl: string): Promise<{ amount: number | null; text: string }> {
  try {
    console.log('🔍 OCR: Creating worker...');
    
    const worker = await createWorker('eng+tha', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log('🔍 OCR: Recognizing image...');
    const { data: { text } } = await worker.recognize(imageDataUrl);
    await worker.terminate();

    console.log('📝 OCR Text extracted:');
    console.log('---START---');
    console.log(text);
    console.log('---END---');

    // Look for common patterns in receipts
    const patterns = [
      // Pattern 1: Total/รวม followed by amount
      /(?:total|รวม|ยอดรวม|sum|grand total|net)[\s:]*(?:฿|baht|บาท)?[\s]*([0-9,]+\.?[0-9]{0,2})/gi,
      // Pattern 2: Baht symbol followed by amount
      /฿[\s]*([0-9,]+\.?[0-9]{0,2})/g,
      // Pattern 3: Amount followed by baht
      /([0-9,]+\.?[0-9]{0,2})[\s]*(?:baht|บาท)/gi,
      // Pattern 4: Standalone numbers (2+ digits, with optional decimals)
      /\b([0-9]{2,}\.?[0-9]{0,2})\b/g,
    ];

    const amounts: number[] = [];
    const foundPatterns: string[] = [];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const numStr = match[1]?.replace(/,/g, '').replace(/\s/g, '');
        if (numStr) {
          const num = parseFloat(numStr);
          if (!isNaN(num) && num > 0 && num < 100000) {
            amounts.push(num);
            foundPatterns.push(`Pattern ${i + 1}: "${match[0]}" → ${num}`);
          }
        }
      }
    }

    console.log('💰 Found amounts:', amounts);
    console.log('📊 Patterns matched:', foundPatterns);

    if (amounts.length === 0) {
      console.log('❌ No amounts detected');
      return { amount: null, text };
    }

    // Return the largest amount (most likely the total)
    const maxAmount = Math.max(...amounts);
    console.log('✅ Selected amount:', maxAmount);
    return { amount: maxAmount, text };

  } catch (error) {
    console.error('❌ OCR error:', error);
    return { amount: null, text: '' };
  }
}
