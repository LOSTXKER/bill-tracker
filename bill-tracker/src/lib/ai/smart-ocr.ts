/**
 * Smart OCR Service
 * Combines Gemini Vision OCR with learned vendor mappings for intelligent auto-fill
 */

import { prisma } from "@/lib/db";
import { analyzeReceipt, ReceiptData } from "./receipt-ocr";
import { analyzeImage } from "./gemini";
import { detectAndConvertAmount, type CurrencyDetectionResult } from "./currency-converter";
import { suggestAccount } from "./account-suggestion";
import { findMapping } from "./vendor-mapping";
import type { VendorMapping, Contact, PaymentMethod } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export type DocumentCategory = "invoice" | "slip" | "whtCert" | "unknown";

export interface MultiDocAnalysisResult {
  files: Array<{
    url: string;
    type: DocumentCategory;
    confidence: number;
    extracted: ReceiptData;
  }>;
  detectedTransactionType: "EXPENSE" | "INCOME";
  transactionTypeConfidence: number;
  transactionTypeReason: string;
  combined: {
    vendorName: string | null;
    vendorTaxId: string | null;
    vendorBranchNumber: string | null;
    vendorEmail: string | null;
    vendorAddress?: string | null;
    vendorPhone?: string | null;
    totalAmount: number;
    amount?: number | null;
    vatAmount: number;
    vatRate?: number | null;
    whtRate: number | null;
    whtAmount: number | null;
    whtType: string | null;
    netAmount: number | null;
    date: string | null;
    dueDate: string | null;
    invoiceNumbers: string[];
    invoiceNumber?: string | null;
    documentType: string | null;
    description?: string | null;
    items?: string[];
  };
  currencyConversion?: CurrencyDetectionResult;
  smart: {
    mapping: {
      id: string;
      vendorName: string | null;
      contactId: string | null;
      contactName: string | null;
      accountId: string | null;
      accountCode: string | null;
      accountName: string | null;
      defaultVatRate: number | null;
      defaultWhtRate: number | null;
      defaultWhtType: string | null;
      paymentMethod: string | null;
      descriptionTemplate: string | null;
    } | null;
    matchConfidence: number;
    matchReason: string | null;
    suggested: SuggestedValues;
    isNewVendor: boolean;
    suggestTraining: boolean;
    // Contact found by taxId/name lookup (not from mapping)
    foundContact?: {
      id: string;
      name: string;
    } | null;
    // Contact suggestions when no exact match (user can choose)
    contactSuggestions?: Array<{
      id: string;
      name: string;
      confidence: number;
    }>;
    // AI account suggestion when no mapping found
    aiAccountSuggestion?: {
      accountId: string | null;
      accountCode: string | null;
      accountName: string | null;
      confidence: number;
      reason: string;
    };
    // AI suggests creating a new account
    suggestNewAccount?: {
      code: string;
      name: string;
      class: string;
      description: string;
      keywords: string[];
      reason: string;
    };
  } | null;
  fileAssignments: Record<string, DocumentCategory>;
}

export interface SmartOcrResult {
  // Raw OCR data
  ocr: ReceiptData;
  
  // Matched mapping (if found)
  mapping: VendorMappingWithRelations | null;
  matchConfidence: number; // 0-100
  matchReason: string | null;
  
  // Final suggested values (merged from OCR + mapping)
  suggested: SuggestedValues;
  
  // Flags
  isNewVendor: boolean;
  suggestTraining: boolean;
}

export interface SuggestedValues {
  // Contact/Vendor
  vendorName: string | null;
  vendorTaxId: string | null;
  vendorBranchNumber: string | null;
  vendorEmail: string | null;
  contactId: string | null;
  
  // Financial
  amount: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  
  // Withholding Tax
  whtRate: number | null;
  whtAmount: number | null;
  whtType: string | null;
  netAmount: number | null;
  
  // Document
  documentType: string | null;
  invoiceNumber: string | null;
  date: string | null;
  dueDate: string | null;
  paymentMethod: PaymentMethod | null;
  description: string | null;
  accountId: string | null;
}

export interface VendorMappingWithRelations extends VendorMapping {
  contact: Contact | null;
  account: { id: string; code: string; name: string } | null;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Analyze image and match with vendor mappings
 */
export async function analyzeAndMatch(
  imageData: string | Buffer,
  companyId: string,
  mimeType: string = "image/jpeg"
): Promise<SmartOcrResult | { error: string }> {
  // Step 1: Run OCR
  const ocrResult = await analyzeReceipt(imageData, mimeType);
  
  if ("error" in ocrResult) {
    return ocrResult;
  }
  
  // Step 2: Find best matching vendor mapping
  const matchResult = await findBestMatch(ocrResult, companyId);
  
  // Step 3: Build suggested values
  const suggested = buildSuggestedValues(ocrResult, matchResult.mapping);
  
  return {
    ocr: ocrResult,
    mapping: matchResult.mapping,
    matchConfidence: matchResult.confidence,
    matchReason: matchResult.reason,
    suggested,
    isNewVendor: !matchResult.mapping,
    suggestTraining: !matchResult.mapping && (ocrResult.vendorName !== null || ocrResult.vendorTaxId !== null),
  };
}

/**
 * Find the best matching vendor mapping for OCR result
 */
export async function findBestMatch(
  ocrResult: ReceiptData,
  companyId: string
): Promise<{
  mapping: VendorMappingWithRelations | null;
  confidence: number;
  reason: string | null;
}> {
  // Get all mappings for this company
  const mappings = await prisma.vendorMapping.findMany({
    where: { companyId },
    include: {
      contact: true,
      account: true,
    },
  });
  
  if (mappings.length === 0) {
    return { mapping: null, confidence: 0, reason: null };
  }
  
  let bestMatch: VendorMappingWithRelations | null = null;
  let bestScore = 0;
  let bestReason: string | null = null;
  
  for (const mapping of mappings) {
    const { score, reason } = calculateMatchScore(ocrResult, mapping);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = mapping;
      bestReason = reason;
    }
  }
  
  // Only return match if confidence is >= 80% (increased for accuracy)
  if (bestScore >= 80) {
    // Update usage stats
    if (bestMatch) {
      await prisma.vendorMapping.update({
        where: { id: bestMatch.id },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }
    
    return { mapping: bestMatch, confidence: bestScore, reason: bestReason };
  }
  
  return { mapping: null, confidence: bestScore, reason: null };
}

/**
 * Calculate match score between OCR result and mapping
 */
function calculateMatchScore(
  ocrResult: ReceiptData,
  mapping: VendorMapping
): { score: number; reason: string } {
  // Priority 1: Tax ID exact match (100%)
  if (ocrResult.vendorTaxId && mapping.vendorTaxId) {
    const ocrTaxId = ocrResult.vendorTaxId.replace(/[^0-9]/g, "");
    const mappingTaxId = mapping.vendorTaxId.replace(/[^0-9]/g, "");
    
    if (ocrTaxId === mappingTaxId && ocrTaxId.length >= 10) {
      return { score: 100, reason: "เลขผู้เสียภาษีตรงกัน" };
    }
  }
  
  // Priority 2: Regex pattern match (90%)
  if (ocrResult.vendorName && mapping.namePattern) {
    try {
      const regex = new RegExp(mapping.namePattern, "i");
      if (regex.test(ocrResult.vendorName)) {
        return { score: 90, reason: `ชื่อตรงกับรูปแบบ: ${mapping.namePattern}` };
      }
    } catch {
      // Invalid regex, skip
    }
  }
  
  // Priority 3: Name fuzzy match
  if (ocrResult.vendorName && mapping.vendorName) {
    const normalizedOcr = normalizeVendorName(ocrResult.vendorName);
    const normalizedMapping = normalizeVendorName(mapping.vendorName);
    
    const similarity = calculateStringSimilarity(normalizedOcr, normalizedMapping);
    
    // High similarity - very likely the same vendor
    if (similarity >= 0.85) {
      return { score: 85, reason: "ชื่อร้านตรงกัน" };
    }
    
    // Medium similarity - probably the same vendor
    if (similarity >= 0.65) {
      return { score: Math.round(60 + similarity * 20), reason: "ชื่อร้านคล้ายกัน" };
    }
    
    // Check for token overlap (handles cases like "ABC Company" vs "ABC")
    if (similarity >= 0.5) {
      return { score: 55, reason: "ชื่อร้านมีบางส่วนตรงกัน" };
    }
    
    if (similarity >= 0.5) {
      return { score: 50, reason: "ชื่อร้านคล้ายกันบางส่วน" };
    }
  }
  
  return { score: 0, reason: "" };
}

/**
 * Build suggested values from OCR and mapping
 */
function buildSuggestedValues(
  ocrResult: ReceiptData,
  mapping: VendorMappingWithRelations | null
): SuggestedValues {
  // Start with OCR values
  const suggested: SuggestedValues = {
    vendorName: ocrResult.vendorName,
    vendorTaxId: ocrResult.vendorTaxId,
    vendorBranchNumber: ocrResult.vendorBranchNumber,
    vendorEmail: ocrResult.vendorEmail,
    contactId: null,
    amount: ocrResult.amount,
    vatRate: ocrResult.vatRate,
    vatAmount: ocrResult.vatAmount,
    totalAmount: ocrResult.totalAmount,
    whtRate: ocrResult.whtRate,
    whtAmount: ocrResult.whtAmount,
    whtType: ocrResult.whtType,
    netAmount: ocrResult.netAmount,
    documentType: ocrResult.documentType,
    invoiceNumber: ocrResult.invoiceNumber,
    date: ocrResult.date,
    dueDate: ocrResult.dueDate,
    paymentMethod: normalizePaymentMethod(ocrResult.paymentMethod),
    description: null,
    accountId: null,
  };
  
  // Override/enhance with mapping values
  if (mapping) {
    // Contact
    if (mapping.contactId) {
      suggested.contactId = mapping.contactId;
    }
    
    // Account - ใช้จาก mapping ที่สอนไว้เลย
    // ถ้าร้านเดียวกันมีหลายบัญชี ให้ผู้ใช้สอนเพิ่มได้
    if (mapping.accountId) {
      suggested.accountId = mapping.accountId;
    }
    
    // VAT Rate (use mapping if OCR is uncertain)
    if (mapping.defaultVatRate !== null && mapping.defaultVatRate !== undefined) {
      // If OCR confidence for amount is low, use mapping VAT
      if (!ocrResult.vatRate || ocrResult.confidence.amount < 70) {
        suggested.vatRate = mapping.defaultVatRate;
      }
    }
    
    // WHT Rate (use mapping if no OCR result or mapping has default)
    const extendedMapping = mapping as typeof mapping & {
      defaultWhtRate?: number | null;
      defaultWhtType?: string | null;
    };
    if (extendedMapping.defaultWhtRate !== null && extendedMapping.defaultWhtRate !== undefined) {
      // Use mapping WHT if OCR didn't detect it or has low confidence
      if (!ocrResult.whtRate || (ocrResult.confidence.wht && ocrResult.confidence.wht < 70)) {
        suggested.whtRate = extendedMapping.defaultWhtRate;
      }
    }
    if (extendedMapping.defaultWhtType && !ocrResult.whtType) {
      suggested.whtType = extendedMapping.defaultWhtType;
    }
    
    // Payment Method (prefer mapping)
    if (mapping.paymentMethod) {
      suggested.paymentMethod = mapping.paymentMethod;
    }
    
    // Description template
    if (mapping.descriptionTemplate) {
      suggested.description = processDescriptionTemplate(
        mapping.descriptionTemplate,
        ocrResult,
        mapping
      );
    }
  }
  
  return suggested;
}

/**
 * Process description template with variables
 */
function processDescriptionTemplate(
  template: string,
  ocrResult: ReceiptData,
  mapping: VendorMappingWithRelations
): string {
  return template
    .replace(/\{vendorName\}/g, ocrResult.vendorName || mapping.vendorName || "")
    .replace(/\{invoiceNumber\}/g, ocrResult.invoiceNumber || "")
    .replace(/\{date\}/g, ocrResult.date || "")
    .replace(/\{amount\}/g, ocrResult.totalAmount?.toLocaleString("th-TH") || "")
    .trim();
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize vendor name for comparison
 * Removes common prefixes/suffixes and normalizes whitespace
 */
function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    // Normalize Thai person prefixes (น.ส., นาย, นาง, นางสาว, ดร., etc.)
    // Convert variations like "น.ส. " or "น.ส." to standardized form
    .replace(/น\.?\s*ส\.?\s*/gi, "นส")
    .replace(/นางสาว\s*/gi, "นส")
    .replace(/นาย\s*/gi, "นาย")
    .replace(/นาง\s*/gi, "นาง")
    .replace(/ดร\.?\s*/gi, "ดร")
    // Remove Thai company suffixes
    .replace(/บริษัท|ห้างหุ้นส่วน|จำกัด|มหาชน|หจก\.|บจก\./gi, "")
    // Remove English company suffixes
    .replace(/co\.?,?\s*ltd\.?|inc\.?|corp\.?|llc\.?|company|limited/gi, "")
    // Remove parentheses and their content (branch names, etc.)
    .replace(/\([^)]*\)/g, "")
    // Remove common noise words
    .replace(/สาขา|branch|shop|store/gi, "")
    // Remove numbers at the end (branch numbers)
    .replace(/\s*\d+\s*$/g, "")
    // Keep only Thai, English letters, and numbers
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenize a name into words for comparison
 */
function tokenizeName(name: string): string[] {
  return name.split(/\s+/).filter(token => token.length > 1);
}

/**
 * Calculate token-based similarity (good for partial matches)
 */
function calculateTokenSimilarity(str1: string, str2: string): number {
  const tokens1 = tokenizeName(str1);
  const tokens2 = tokenizeName(str2);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  let matchedTokens = 0;
  
  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      // Check for exact match or high similarity
      if (t1 === t2 || (t1.length > 3 && t2.length > 3 && calculateLevenshteinSimilarity(t1, t2) > 0.8)) {
        matchedTokens++;
        break;
      }
    }
  }
  
  // Score based on proportion of matched tokens
  const minTokens = Math.min(tokens1.length, tokens2.length);
  return matchedTokens / minTokens;
}

/**
 * Calculate Levenshtein-based string similarity
 */
function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return 1 - distance / maxLen;
}

/**
 * Calculate string similarity using multiple methods
 * Returns the highest score from: exact, contains, token, and Levenshtein
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  // Method 1: Contains check (one is substring of other)
  if (str1.includes(str2) || str2.includes(str1)) {
    const minLen = Math.min(len1, len2);
    const maxLen = Math.max(len1, len2);
    // Score based on how much overlap there is
    return 0.8 + (0.2 * minLen / maxLen);
  }
  
  // Method 2: Token-based similarity (good for reordered words)
  const tokenSim = calculateTokenSimilarity(str1, str2);
  
  // Method 3: Levenshtein similarity
  const levenSim = calculateLevenshteinSimilarity(str1, str2);
  
  // Return the higher score
  return Math.max(tokenSim, levenSim);
}

/**
 * Normalize payment method string to enum
 */
function normalizePaymentMethod(method: string | null): PaymentMethod | null {
  if (!method) return null;
  
  const upperMethod = method.toUpperCase();
  const validMethods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "PROMPTPAY", "CHEQUE"];
  
  if (validMethods.includes(upperMethod as PaymentMethod)) {
    return upperMethod as PaymentMethod;
  }
  
  return null;
}

// NOTE: Training Functions moved to vendor-mapping.ts
// NOTE: AI Account Suggestion Functions moved to account-suggestion.ts
// Import from those files if needed


// =============================================================================
// Multi-Document Analysis Functions
// =============================================================================

/**
 * AI-based document classification using Gemini
 */
async function classifyDocumentWithAI(imageUrl: string): Promise<{
  type: DocumentCategory;
  confidence: number;
  reason: string;
}> {
  try {
    const prompt = `คุณเป็น AI ผู้เชี่ยวชาญในการจำแนกประเภทเอกสารทางการเงินไทย

ดูจากภาพที่ให้มา จำแนกว่าเป็นเอกสารประเภทใด:

1. **invoice** - ใบกำกับภาษี, ใบเสร็จรับเงิน, Tax Invoice, Receipt
   - มักมี: ชื่อบริษัท, เลขผู้เสียภาษี 13 หลัก, รายการสินค้า/บริการ, ยอดเงิน, VAT

2. **slip** - สลิปโอนเงิน, Payment Slip, Bank Transfer Slip
   - มักมี: QR Code, เลขบัญชี, ชื่อธนาคาร, วันเวลาที่โอน, จำนวนเงินที่โอน

3. **whtCert** - ใบหัก ณ ที่จ่าย (50 ทวิ), Withholding Tax Certificate
   - มักมี: คำว่า "50 ทวิ", "ภ.ง.ด.", หักภาษี ณ ที่จ่าย, อัตราภาษี 1-5%

4. **unknown** - ไม่ใช่เอกสารทางการเงิน หรือไม่สามารถระบุได้

ตอบเป็น JSON เท่านั้น:
{
  "type": "invoice" | "slip" | "whtCert" | "unknown",
  "confidence": 0-100,
  "reason": "เหตุผลสั้นๆ ที่จำแนกเป็นประเภทนี้"
}`;

    const response = await analyzeImage(imageUrl, prompt, {
      temperature: 0.2,
      maxTokens: 256,
    });

    if (response.error) {
      console.error("AI classification error:", response.error);
      return { type: "unknown", confidence: 0, reason: "AI classification failed" };
    }

    // Parse response
    let jsonText = response.data.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }

    try {
      const result = JSON.parse(jsonText);
      const validTypes: DocumentCategory[] = ["invoice", "slip", "whtCert", "unknown"];
      
      return {
        type: validTypes.includes(result.type) ? result.type : "unknown",
        confidence: Math.max(0, Math.min(100, result.confidence || 50)),
        reason: result.reason || "",
      };
    } catch {
      console.error("Failed to parse AI classification response:", jsonText);
      return { type: "unknown", confidence: 0, reason: "Failed to parse response" };
    }
  } catch (error) {
    console.error("Document classification error:", error);
    return { type: "unknown", confidence: 0, reason: "Classification error" };
  }
}

/**
 * Analyze multiple documents and classify them
 */
export async function analyzeAndClassifyMultiple(
  imageUrls: string[],
  companyId: string,
  transactionType: "EXPENSE" | "INCOME",
  companyName?: string,
  exchangeRates?: Record<string, number>
): Promise<MultiDocAnalysisResult | { error: string }> {
  if (imageUrls.length === 0) {
    return { error: "ไม่มีไฟล์ให้วิเคราะห์" };
  }

  // Step 1: Classify all images with AI first (parallel)
  const classificationPromises = imageUrls.map(async (url) => {
    const classification = await classifyDocumentWithAI(url);
    return { url, classification };
  });
  const classifications = await Promise.all(classificationPromises);

  // Step 2: Run OCR on documents (especially invoices) in parallel
  const ocrPromises = imageUrls.map(async (url) => {
    const result = await analyzeReceipt(url, getMimeTypeFromUrl(url));
    return { url, result };
  });
  const analysisResults = await Promise.all(ocrPromises);

  // Step 3: Combine classification and OCR results
  const fileResults: MultiDocAnalysisResult["files"] = [];
  const fileAssignments: Record<string, DocumentCategory> = {};
  const extractedDataList: ReceiptData[] = [];

  for (const { url, result } of analysisResults) {
    // Find AI classification for this URL
    const aiClassification = classifications.find(c => c.url === url)?.classification;
    
    if ("error" in result) {
      // OCR failed - use AI classification only
      const docType = aiClassification || { type: "unknown" as DocumentCategory, confidence: 0 };
      fileResults.push({
        url,
        type: docType.type,
        confidence: docType.confidence,
        extracted: createEmptyReceiptData(),
      });
      fileAssignments[url] = docType.type;
      continue;
    }

    // Use AI classification, fallback to keyword-based if AI failed
    let docType: { type: DocumentCategory; confidence: number };
    if (aiClassification && aiClassification.confidence >= 50) {
      docType = aiClassification;
    } else {
      docType = classifyDocumentType(result);
    }

    fileResults.push({
      url,
      type: docType.type,
      confidence: docType.confidence,
      extracted: result,
    });
    fileAssignments[url] = docType.type;
    extractedDataList.push(result);
  }

  // Combine data from all successfully extracted documents
  const combined = combineMultipleResults(extractedDataList);

  // Detect and convert currency if needed
  let currencyConversion: CurrencyDetectionResult | undefined;
  if (exchangeRates && combined.totalAmount > 0) {
    // Get full OCR text for currency detection
    // Only include text fields - NOT amount values (to avoid false $ detection)
    const fullText = extractedDataList
      .map((d) => {
        const parts = [
          d.vendorName,
          d.invoiceNumber,
          d.vendorAddress,
          // Include items descriptions only (not amounts)
          ...(d.items || []).map((item) => 
            typeof item === "string" ? item : item.description
          ),
        ].filter(Boolean);
        return parts.join(" ");
      })
      .join(" ");
    
    // Check for foreign currency indicators (must be explicit, not just any $)
    // For Thai slips/invoices, default to THB
    const hasThaiIndicator = /ธนาคาร|บาท|THB|สลิป|โอนเงิน|พร้อมเพย์|บจก\.|หจก\.|นาย|นาง|นางสาว/i.test(fullText);
    const hasUsdIndicator = !hasThaiIndicator && (
      /USD|US\s*DOLLAR|\$\s*\d/i.test(fullText) || 
      extractedDataList.some(d => d.vendorAddress?.includes("United States"))
    );
    
    // Only run currency conversion if there's a clear foreign currency indicator
    if (hasUsdIndicator) {
      currencyConversion = detectAndConvertAmount(
        fullText,
        combined.totalAmount,
        exchangeRates
      );
      
      // If currency conversion happened, update combined amount
      if (currencyConversion.convertedAmount !== null && currencyConversion.currency !== "THB") {
        combined.totalAmount = currencyConversion.convertedAmount;
        // Also update VAT amount proportionally
        if (combined.vatAmount > 0 && currencyConversion.exchangeRate) {
          combined.vatAmount = combined.vatAmount * currencyConversion.exchangeRate;
        }
      }
    }
  }

  // Detect transaction type if we have company name
  const txTypeDetection = detectTransactionTypeFromDocs(
    extractedDataList,
    companyName || ""
  );

  // Find best vendor mapping (filter by transaction type)
  let smartResult = null;
  if (combined.vendorName || combined.vendorTaxId) {
    // Create a pseudo ReceiptData for matching
    const pseudoData: ReceiptData = {
      documentType: combined.documentType as ReceiptData["documentType"],
      documentTypeConfidence: 80,
      vendorName: combined.vendorName,
      vendorTaxId: combined.vendorTaxId,
      vendorBranchNumber: combined.vendorBranchNumber,
      vendorAddress: null,
      vendorPhone: null,
      vendorEmail: combined.vendorEmail,
      amount: combined.amount || combined.totalAmount || null,
      vatRate: combined.vatRate,
      vatAmount: combined.vatAmount || null,
      totalAmount: combined.totalAmount || null,
      whtRate: combined.whtRate,
      whtAmount: combined.whtAmount,
      whtType: combined.whtType,
      netAmount: combined.netAmount,
      invoiceNumber: combined.invoiceNumbers[0] || null,
      date: combined.date,
      dueDate: combined.dueDate,
      paymentMethod: combined.paymentMethod,
      items: [],
      confidence: { overall: 80, amount: 80, vendor: 80, date: 70, wht: 70 },
    };

    const matchResult = await findBestMatchByType(
      pseudoData,
      companyId,
      transactionType
    );

    // Build suggested values from mapping (ONLY for account, not contact)
    const suggested = buildSuggestedValues(pseudoData, matchResult.mapping);
    
    // REFACTORED: Don't use contact from VendorMapping - rely on Tax ID only
    suggested.contactId = null;

    // Track found contact for returning contact info
    let foundContact: { id: string; name: string } | null = null;
    
    // Track contact suggestions when no exact match found
    let contactSuggestions: Array<{ id: string; name: string; confidence: number }> = [];

    // Get company's own tax ID to avoid matching vendor with our own company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { taxId: true },
    });
    const companyTaxId = company?.taxId?.replace(/[^0-9]/g, "") || null;

    // ==========================================================================
    // STEP 1: Tax ID Exact Match (ONLY way to auto-select contact)
    // ==========================================================================
    if (combined.vendorTaxId) {
      const normalizedVendorTaxId = combined.vendorTaxId.replace(/[^0-9]/g, "");
      
      // Skip if vendor tax ID matches our company's tax ID
      if (companyTaxId && normalizedVendorTaxId === companyTaxId) {
        console.log("[Smart-OCR] Skipping - vendor tax ID matches company:", normalizedVendorTaxId);
        combined.vendorTaxId = null;
      } else if (normalizedVendorTaxId.length >= 10) {
        // Only match if tax ID is valid (at least 10 digits)
        const contactByTaxId = await prisma.contact.findFirst({
          where: {
            companyId,
            taxId: combined.vendorTaxId,
          },
          select: { id: true, name: true },
        });
        if (contactByTaxId) {
          console.log("[Smart-OCR] Auto-selected contact by Tax ID:", contactByTaxId.name);
          suggested.contactId = contactByTaxId.id;
          foundContact = contactByTaxId;
        }
      }
    }

    // ==========================================================================
    // STEP 2: Name-based matching → SUGGESTIONS ONLY (never auto-select)
    // ==========================================================================
    if (!suggested.contactId && combined.vendorName) {
      const normalizedVendor = normalizeVendorName(combined.vendorName);
      
      // Skip if vendor name is too short (likely garbage data)
      if (normalizedVendor.length >= 3) {
        const allContacts = await prisma.contact.findMany({
          where: { companyId },
          select: { id: true, name: true },
        });

        const potentialMatches: Array<{ id: string; name: string; similarity: number }> = [];

        for (const contact of allContacts) {
          const normalizedContact = normalizeVendorName(contact.name);
          const similarity = calculateStringSimilarity(normalizedVendor, normalizedContact);
          
          // Collect potential matches (>= 40% similarity) for suggestions
          if (similarity >= 0.4) {
            potentialMatches.push({ ...contact, similarity });
          }
        }

        // Sort by similarity desc and take top 5
        potentialMatches.sort((a, b) => b.similarity - a.similarity);
        
        if (potentialMatches.length > 0) {
          contactSuggestions = potentialMatches.slice(0, 5).map(m => ({
            id: m.id,
            name: m.name,
            confidence: Math.round(m.similarity * 100),
          }));
          console.log("[Smart-OCR] Found contact suggestions:", contactSuggestions.map(s => `${s.name} (${s.confidence}%)`));
        }
      }
    }

    // Use AI to suggest account only when mapping doesn't have accountId
    let aiAccountSuggestion: {
      accountId: string | null;
      accountCode: string | null;
      accountName: string | null;
      confidence: number;
      reason: string;
      suggestNewAccount?: {
        code: string;
        name: string;
        class: string;
        description: string;
        keywords: string[];
        reason: string;
      };
    } | null = null;

    // Only run AI account suggestion if no account from mapping
    if (!suggested.accountId) {
      // Extract items from OCR for better account suggestion
      const items = extractedDataList.flatMap((d) => 
        (d.items || []).map((item) => typeof item === "string" ? item : item.description || "")
      ).filter(Boolean);

      const aiResult = await suggestAccount(
        companyId,
        transactionType,
        {
          vendorName: combined.vendorName,
          description: combined.vendorName ? `ค่าใช้จ่ายจาก ${combined.vendorName}` : null,
          items: items.length > 0 ? items : undefined,
          imageUrls: imageUrls.slice(0, 1), // Use first image for context
        }
      );
      
      aiAccountSuggestion = {
        accountId: aiResult.accountId,
        accountCode: aiResult.accountCode,
        accountName: aiResult.accountName,
        confidence: aiResult.confidence,
        reason: aiResult.reason,
        suggestNewAccount: aiResult.suggestNewAccount,
      };

      // Auto-apply AI account suggestion if confidence is high enough
      if (aiAccountSuggestion?.accountId && aiAccountSuggestion.confidence >= 70) {
        suggested.accountId = aiAccountSuggestion.accountId;
      }
    }

    smartResult = {
      mapping: matchResult.mapping
        ? {
            id: matchResult.mapping.id,
            vendorName: matchResult.mapping.vendorName,
            contactId: matchResult.mapping.contactId,
            contactName: matchResult.mapping.contact?.name || null,
            accountId: matchResult.mapping.accountId,
            accountCode: matchResult.mapping.account?.code || null,
            accountName: matchResult.mapping.account?.name || null,
            defaultVatRate: matchResult.mapping.defaultVatRate,
            defaultWhtRate: (matchResult.mapping as any).defaultWhtRate || null,
            defaultWhtType: (matchResult.mapping as any).defaultWhtType || null,
            paymentMethod: matchResult.mapping.paymentMethod,
            descriptionTemplate: matchResult.mapping.descriptionTemplate,
          }
        : null,
      matchConfidence: matchResult.confidence,
      matchReason: matchResult.reason,
      suggested,
      // Include found contact info (from taxId/name lookup, not from mapping)
      foundContact: foundContact || null,
      // Include contact suggestions when no exact match found
      contactSuggestions: contactSuggestions.length > 0 ? contactSuggestions : undefined,
      isNewVendor: !matchResult.mapping,
      suggestTraining:
        !matchResult.mapping &&
        (combined.vendorName !== null || combined.vendorTaxId !== null),
      // Include AI account suggestion for UI to show confidence
      aiAccountSuggestion: aiAccountSuggestion || undefined,
      // Include suggestion to create new account
      suggestNewAccount: aiAccountSuggestion?.suggestNewAccount || undefined,
    };
  }

  return {
    files: fileResults,
    detectedTransactionType: txTypeDetection.type,
    transactionTypeConfidence: txTypeDetection.confidence,
    transactionTypeReason: txTypeDetection.reason,
    combined,
    currencyConversion,
    smart: smartResult,
    fileAssignments,
  };
}

/**
 * Classify document type based on OCR content
 */
function classifyDocumentType(data: ReceiptData): {
  type: DocumentCategory;
  confidence: number;
} {
  // Keywords for each document type
  const invoiceKeywords = [
    "ใบกำกับภาษี",
    "tax invoice",
    "ใบเสร็จรับเงิน",
    "receipt",
    "ใบแจ้งหนี้",
    "invoice",
    "เลขผู้เสียภาษี",
    "tax id",
    "vat",
    "ภาษีมูลค่าเพิ่ม",
  ];

  const slipKeywords = [
    "สลิป",
    "slip",
    "โอนเงิน",
    "transfer",
    "promptpay",
    "พร้อมเพย์",
    "ธนาคาร",
    "bank",
    "บัญชี",
    "account",
    "qr code",
    "จำนวนเงินที่โอน",
  ];

  const whtKeywords = [
    "50 ทวิ",
    "ใบหัก ณ ที่จ่าย",
    "withholding tax",
    "ภ.ง.ด.",
    "หักภาษี",
    "ณ ที่จ่าย",
  ];

  // Create searchable text from all fields
  const searchText = [
    data.vendorName || "",
    data.invoiceNumber || "",
    String(data.amount || ""),
  ]
    .join(" ")
    .toLowerCase();

  // Score each type
  let invoiceScore = 0;
  let slipScore = 0;
  let whtScore = 0;

  for (const kw of invoiceKeywords) {
    if (searchText.includes(kw.toLowerCase())) {
      invoiceScore += 10;
    }
  }

  for (const kw of slipKeywords) {
    if (searchText.includes(kw.toLowerCase())) {
      slipScore += 10;
    }
  }

  for (const kw of whtKeywords) {
    if (searchText.includes(kw.toLowerCase())) {
      whtScore += 15; // WHT is more specific
    }
  }

  // Additional signals
  if (data.vendorTaxId) {
    invoiceScore += 20; // Tax ID strongly suggests invoice
  }
  if (data.vatRate || data.vatAmount) {
    invoiceScore += 15;
  }

  // Determine winner
  const maxScore = Math.max(invoiceScore, slipScore, whtScore);

  if (maxScore === 0) {
    return { type: "unknown", confidence: 30 };
  }

  if (whtScore === maxScore && whtScore >= 15) {
    return { type: "whtCert", confidence: Math.min(95, 50 + whtScore) };
  }

  if (slipScore === maxScore && slipScore > invoiceScore) {
    return { type: "slip", confidence: Math.min(95, 50 + slipScore) };
  }

  if (invoiceScore >= 20) {
    return { type: "invoice", confidence: Math.min(95, 50 + invoiceScore) };
  }

  // Default to invoice if we have amount/vendor info
  if (data.amount || data.vendorName) {
    return { type: "invoice", confidence: 60 };
  }

  return { type: "unknown", confidence: 40 };
}

/**
 * Combine results from multiple documents
 */
function combineMultipleResults(results: ReceiptData[]): MultiDocAnalysisResult["combined"] & {
  vatRate: number | null;
  paymentMethod: string | null;
  amount: number | null;
} {
  if (results.length === 0) {
    return {
      vendorName: null,
      vendorTaxId: null,
      vendorBranchNumber: null,
      vendorEmail: null,
      totalAmount: 0,
      vatAmount: 0,
      whtRate: null,
      whtAmount: null,
      whtType: null,
      netAmount: null,
      date: null,
      dueDate: null,
      invoiceNumbers: [],
      documentType: null,
      vatRate: null,
      paymentMethod: null,
      amount: null,
    };
  }

  // Find the most confident vendor info
  let vendorName: string | null = null;
  let vendorTaxId: string | null = null;
  let vendorBranchNumber: string | null = null;
  let vendorEmail: string | null = null;
  let bestVendorConfidence = 0;

  // Sum up amounts
  let totalAmount = 0;
  let vatAmount = 0;
  let amount = 0;
  let whtAmount = 0;

  // WHT info (use from WHT cert or first document with valid value)
  let whtRate: number | null = null;
  let whtType: string | null = null;

  // Collect invoice numbers
  const invoiceNumbers: string[] = [];

  // Use earliest date
  let earliestDate: string | null = null;
  let dueDate: string | null = null;

  // Track VAT rate and payment method (use from first document with valid value)
  let vatRate: number | null = null;
  let paymentMethod: string | null = null;

  // Document type (prefer TAX_INVOICE > RECEIPT > others)
  let documentType: string | null = null;
  const docTypePriority: Record<string, number> = {
    TAX_INVOICE: 5,
    RECEIPT: 4,
    INVOICE: 3,
    BANK_SLIP: 2,
    WHT_CERT: 1,
    OTHER: 0,
  };

  for (const result of results) {
    // Vendor info (use highest confidence)
    if (result.confidence.vendor > bestVendorConfidence) {
      if (result.vendorName) {
        vendorName = result.vendorName;
        bestVendorConfidence = result.confidence.vendor;
      }
    }
    if (result.vendorTaxId && !vendorTaxId) {
      vendorTaxId = result.vendorTaxId;
    }
    if (result.vendorBranchNumber && !vendorBranchNumber) {
      vendorBranchNumber = result.vendorBranchNumber;
    }
    if (result.vendorEmail && !vendorEmail) {
      vendorEmail = result.vendorEmail;
    }

    // Sum amounts
    if (result.totalAmount) {
      totalAmount += result.totalAmount;
    } else if (result.amount) {
      totalAmount += result.amount;
    }

    if (result.amount) {
      amount += result.amount;
    }

    if (result.vatAmount) {
      vatAmount += result.vatAmount;
    }

    // WHT - sum amounts, use first rate/type
    if (result.whtAmount) {
      whtAmount += result.whtAmount;
    }
    if (whtRate === null && result.whtRate !== null) {
      whtRate = result.whtRate;
    }
    if (!whtType && result.whtType) {
      whtType = result.whtType;
    }

    // Collect invoice numbers
    if (result.invoiceNumber && !invoiceNumbers.includes(result.invoiceNumber)) {
      invoiceNumbers.push(result.invoiceNumber);
    }

    // Earliest date
    if (result.date) {
      if (!earliestDate || result.date < earliestDate) {
        earliestDate = result.date;
      }
    }

    // Due date (use first found)
    if (result.dueDate && !dueDate) {
      dueDate = result.dueDate;
    }

    // VAT rate (use first found)
    if (vatRate === null && result.vatRate !== null && result.vatRate !== undefined) {
      vatRate = result.vatRate;
    }

    // Payment method (use first found)
    if (!paymentMethod && result.paymentMethod) {
      paymentMethod = result.paymentMethod;
    }

    // Document type (use highest priority)
    if (result.documentType) {
      const currentPriority = documentType ? (docTypePriority[documentType] || 0) : -1;
      const newPriority = docTypePriority[result.documentType] || 0;
      if (newPriority > currentPriority) {
        documentType = result.documentType;
      }
    }
  }

  // Validate and fix Thai Buddhist Era date conversion errors
  const validatedDate = validateAndFixThaiDate(earliestDate);
  const validatedDueDate = validateAndFixThaiDate(dueDate);

  // Calculate net amount
  const netAmount = totalAmount > 0 && whtAmount > 0 ? totalAmount - whtAmount : null;

  return {
    vendorName,
    vendorTaxId,
    vendorBranchNumber,
    vendorEmail,
    totalAmount,
    vatAmount,
    whtRate,
    whtAmount: whtAmount || null,
    whtType,
    netAmount,
    date: validatedDate,
    dueDate: validatedDueDate,
    invoiceNumbers,
    documentType,
    vatRate,
    paymentMethod,
    amount: amount || null,
  };
}

/**
 * Validate and fix common Thai Buddhist Era date conversion errors
 * Common mistake: AI reads 2569 as 2559, resulting in 2016 instead of 2026
 */
function validateAndFixThaiDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    
    // If year is more than 5 years in the past, it might be a conversion error
    // Common error: 2569 read as 2559 (2026 → 2016, off by 10 years)
    if (year < currentYear - 5) {
      const yearsOff = currentYear - year;
      
      // Check if adding 10 years makes it reasonable (within 1 year of now)
      if (yearsOff >= 9 && yearsOff <= 11) {
        // Likely read 6 as 5 in the Thai year (e.g., 2569 → 2559)
        const fixedYear = year + 10;
        const fixedDate = new Date(date);
        fixedDate.setFullYear(fixedYear);
        return fixedDate.toISOString().split('T')[0];
      }
    }
    
    // If year is in the future by too much (more than 1 year), might be unconverted BE
    if (year > currentYear + 500) {
      // Still in Buddhist Era, convert to CE
      const fixedYear = year - 543;
      const fixedDate = new Date(date);
      fixedDate.setFullYear(fixedYear);
      return fixedDate.toISOString().split('T')[0];
    }
    
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Detect transaction type from document content
 */
function detectTransactionTypeFromDocs(
  results: ReceiptData[],
  companyName: string
): {
  type: "EXPENSE" | "INCOME";
  confidence: number;
  reason: string;
} {
  // If company name is provided, try to match
  if (companyName) {
    const normalizedCompany = companyName.toLowerCase();

    for (const result of results) {
      // If our company name appears as vendor, it's likely INCOME (we issued invoice)
      if (result.vendorName) {
        const normalizedVendor = result.vendorName.toLowerCase();
        if (
          normalizedVendor.includes(normalizedCompany) ||
          normalizedCompany.includes(normalizedVendor)
        ) {
          return {
            type: "INCOME",
            confidence: 85,
            reason: "พบชื่อบริษัทเราเป็นผู้ขาย",
          };
        }
      }
    }
  }

  // Look for buyer/seller indicators in documents
  // For now, default to context-based (the form type they're using)
  return {
    type: "EXPENSE",
    confidence: 50,
    reason: "ไม่พบข้อมูลชัดเจน ใช้ค่าตามประเภทฟอร์ม",
  };
}

/**
 * Find best match filtered by transaction type
 */
async function findBestMatchByType(
  ocrResult: ReceiptData,
  companyId: string,
  transactionType: "EXPENSE" | "INCOME"
): Promise<{
  mapping: VendorMappingWithRelations | null;
  confidence: number;
  reason: string | null;
}> {
  // Get mappings filtered by transaction type
  const mappings = await prisma.vendorMapping.findMany({
    where: {
      companyId,
      transactionType,
    },
    include: {
      contact: true,
      account: true,
    },
  });

  if (mappings.length === 0) {
    return { mapping: null, confidence: 0, reason: null };
  }

  let bestMatch: VendorMappingWithRelations | null = null;
  let bestScore = 0;
  let bestReason: string | null = null;

  for (const mapping of mappings) {
    const { score, reason } = calculateMatchScore(ocrResult, mapping);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = mapping;
      bestReason = reason;
    }
  }

  // Only return match if confidence is >= 80% (increased for accuracy)
  if (bestScore >= 80 && bestMatch) {
    // Update usage stats
    await prisma.vendorMapping.update({
      where: { id: bestMatch.id },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return { mapping: bestMatch, confidence: bestScore, reason: bestReason };
  }

  return { mapping: null, confidence: bestScore, reason: null };
}

/**
 * Helper to get mime type from URL
 */
function getMimeTypeFromUrl(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
  };
  return mimeTypes[ext || ""] || "image/jpeg";
}

/**
 * Create empty receipt data structure
 */
function createEmptyReceiptData(): ReceiptData {
  return {
    documentType: null,
    documentTypeConfidence: 0,
    vendorName: null,
    vendorTaxId: null,
    vendorBranchNumber: null,
    vendorAddress: null,
    vendorPhone: null,
    vendorEmail: null,
    amount: null,
    vatRate: null,
    vatAmount: null,
    totalAmount: null,
    whtRate: null,
    whtAmount: null,
    whtType: null,
    netAmount: null,
    invoiceNumber: null,
    date: null,
    dueDate: null,
    paymentMethod: null,
    items: [],
    confidence: { overall: 0, amount: 0, vendor: 0, date: 0, wht: 0 },
  };
}
