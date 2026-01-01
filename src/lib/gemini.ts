import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ReceiptAnalysis {
  vendor_name: string;
  amount: number;
  vat_amount: number | null;
  total_amount: number;
  has_vat: boolean;
  receipt_date: string;
  suggested_category: string;
  confidence: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  raw_text: string;
}

const RECEIPT_ANALYSIS_PROMPT = `คุณเป็น AI ผู้เชี่ยวชาญในการอ่านและวิเคราะห์ใบเสร็จ/สลิปภาษาไทย

วิเคราะห์รูปใบเสร็จนี้และตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

รูปแบบ JSON ที่ต้องการ:
{
  "vendor_name": "ชื่อร้านค้า/บริษัท",
  "amount": 0.00,
  "vat_amount": null,
  "total_amount": 0.00,
  "has_vat": false,
  "receipt_date": "YYYY-MM-DD",
  "suggested_category": "หมวดหมู่",
  "confidence": 85,
  "items": [
    {"name": "ชื่อสินค้า", "quantity": 1, "price": 0.00}
  ],
  "raw_text": "ข้อความทั้งหมดที่อ่านได้จากใบเสร็จ"
}

หมวดหมู่ที่เลือกได้:
- ค่าอาหาร (ร้านอาหาร, คาเฟ่, 7-11, โลตัส)
- ค่าเดินทาง (น้ำมัน, ทางด่วน, แท็กซี่, Grab)
- อุปกรณ์สำนักงาน (เครื่องเขียน, กระดาษ, หมึก)
- ค่าสาธารณูปโภค (ค่าน้ำ, ค่าไฟ, ค่าเน็ต)
- ค่าการตลาด (โฆษณา, ป้าย, สื่อ)
- ค่ารับรอง (ของขวัญ, งานเลี้ยง)
- อุปกรณ์/เครื่องมือ (คอมพิวเตอร์, โทรศัพท์)
- ค่าบริการ (ซ่อม, ทำความสะอาด)
- ค่าเช่า (สำนักงาน, รถ)
- อื่นๆ

กฎการวิเคราะห์:
1. amount = ยอดก่อน VAT (ถ้ามี VAT)
2. total_amount = ยอดรวมสุทธิ
3. vat_amount = จำนวน VAT (null ถ้าไม่มี)
4. has_vat = true ถ้ามี VAT 7%
5. receipt_date = วันที่ในใบเสร็จ หรือวันนี้ถ้าไม่มี
6. confidence = 0-100 ความมั่นใจในการอ่าน

ตอบเป็น JSON เท่านั้น:`;

export async function analyzeReceipt(imageBase64: string, mimeType: string): Promise<ReceiptAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      RECEIPT_ANALYSIS_PROMPT,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis: ReceiptAnalysis = JSON.parse(jsonMatch[0]);
    
    // Validate and set defaults
    return {
      vendor_name: analysis.vendor_name || 'ไม่ระบุ',
      amount: Number(analysis.amount) || 0,
      vat_amount: analysis.vat_amount ? Number(analysis.vat_amount) : null,
      total_amount: Number(analysis.total_amount) || Number(analysis.amount) || 0,
      has_vat: Boolean(analysis.has_vat),
      receipt_date: analysis.receipt_date || new Date().toISOString().split('T')[0],
      suggested_category: analysis.suggested_category || 'อื่นๆ',
      confidence: Math.min(100, Math.max(0, Number(analysis.confidence) || 70)),
      items: Array.isArray(analysis.items) ? analysis.items : [],
      raw_text: analysis.raw_text || '',
    };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    
    // Return default values on error
    return {
      vendor_name: 'ไม่สามารถอ่านได้',
      amount: 0,
      vat_amount: null,
      total_amount: 0,
      has_vat: false,
      receipt_date: new Date().toISOString().split('T')[0],
      suggested_category: 'อื่นๆ',
      confidence: 0,
      items: [],
      raw_text: '',
    };
  }
}

export async function analyzeReceiptFromUrl(imageUrl: string): Promise<ReceiptAnalysis> {
  try {
    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    return analyzeReceipt(base64, mimeType);
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}
