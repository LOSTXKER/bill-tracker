/**
 * Smart OCR Service
 * Combines Gemini Vision OCR with learned vendor mappings for intelligent auto-fill
 */

import { prisma } from "@/lib/db";
import { analyzeReceipt, ReceiptData } from "./receipt-ocr";
import { analyzeImage } from "./gemini";
import type { VendorMapping, Contact, Category, PaymentMethod } from "@prisma/client";

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
    totalAmount: number;
    vatAmount: number;
    date: string | null;
    invoiceNumbers: string[];
  };
  smart: {
    mapping: {
      id: string;
      vendorName: string | null;
      contactId: string | null;
      contactName: string | null;
      categoryId: string | null;
      categoryName: string | null;
      defaultVatRate: number | null;
      paymentMethod: string | null;
      descriptionTemplate: string | null;
    } | null;
    matchConfidence: number;
    matchReason: string | null;
    suggested: SuggestedValues;
    isNewVendor: boolean;
    suggestTraining: boolean;
    // AI category suggestion when no mapping found
    aiCategorySuggestion?: {
      categoryId: string | null;
      categoryName: string | null;
      confidence: number;
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
  contactId: string | null;
  
  // Financial
  amount: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  
  // Document
  invoiceNumber: string | null;
  date: string | null;
  paymentMethod: PaymentMethod | null;
  description: string | null;
  categoryId: string | null;
}

export interface VendorMappingWithRelations extends VendorMapping {
  contact: Contact | null;
  category: Category | null;
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
      category: true,
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
  
  // Only return match if confidence is >= 50% (lowered for better learning)
  if (bestScore >= 50) {
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
    contactId: null,
    amount: ocrResult.amount,
    vatRate: ocrResult.vatRate,
    vatAmount: ocrResult.vatAmount,
    totalAmount: ocrResult.totalAmount,
    invoiceNumber: ocrResult.invoiceNumber,
    date: ocrResult.date,
    paymentMethod: normalizePaymentMethod(ocrResult.paymentMethod),
    description: null,
    categoryId: null,
  };
  
  // Override/enhance with mapping values
  if (mapping) {
    // Contact
    if (mapping.contactId) {
      suggested.contactId = mapping.contactId;
    }
    
    // Category
    if (mapping.categoryId) {
      suggested.categoryId = mapping.categoryId;
    }
    
    // VAT Rate (use mapping if OCR is uncertain)
    if (mapping.defaultVatRate !== null && mapping.defaultVatRate !== undefined) {
      // If OCR confidence for amount is low, use mapping VAT
      if (!ocrResult.vatRate || ocrResult.confidence.amount < 70) {
        suggested.vatRate = mapping.defaultVatRate;
      }
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
 */
/**
 * Normalize vendor name for comparison
 * Removes common prefixes/suffixes and normalizes whitespace
 */
function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
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

// =============================================================================
// Training Functions
// =============================================================================

/**
 * Create a new vendor mapping from transaction data
 */
export async function createMappingFromTransaction(
  companyId: string,
  transactionType: "EXPENSE" | "INCOME",
  data: {
    vendorName?: string;
    vendorTaxId?: string;
    contactId?: string;
    categoryId?: string;
    defaultVatRate?: number;
    paymentMethod?: PaymentMethod;
    descriptionTemplate?: string;
    namePattern?: string;
    learnSource?: string; // "MANUAL" | "AUTO" | "FEEDBACK"
    originalTxId?: string;
  }
): Promise<VendorMapping> {
  // Check if mapping with same tax ID and transaction type exists
  if (data.vendorTaxId) {
    const existing = await prisma.vendorMapping.findFirst({
      where: {
        companyId,
        vendorTaxId: data.vendorTaxId,
        transactionType,
      },
    });
    
    if (existing) {
      // Update existing mapping
      return prisma.vendorMapping.update({
        where: { id: existing.id },
        data: {
          vendorName: data.vendorName || existing.vendorName,
          contactId: data.contactId || existing.contactId,
          categoryId: data.categoryId || existing.categoryId,
          defaultVatRate: data.defaultVatRate ?? existing.defaultVatRate,
          paymentMethod: data.paymentMethod || existing.paymentMethod,
          descriptionTemplate: data.descriptionTemplate || existing.descriptionTemplate,
          namePattern: data.namePattern || existing.namePattern,
          learnSource: data.learnSource || existing.learnSource,
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }
  }
  
  // Create new mapping
  return prisma.vendorMapping.create({
    data: {
      companyId,
      transactionType,
      vendorName: data.vendorName,
      vendorTaxId: data.vendorTaxId,
      contactId: data.contactId,
      categoryId: data.categoryId,
      defaultVatRate: data.defaultVatRate,
      paymentMethod: data.paymentMethod,
      descriptionTemplate: data.descriptionTemplate,
      namePattern: data.namePattern,
      learnSource: data.learnSource || "MANUAL",
      originalTxId: data.originalTxId,
      useCount: 1,
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Get all vendor mappings for a company with stats
 */
export async function getVendorMappings(
  companyId: string,
  options?: {
    search?: string;
    transactionType?: "EXPENSE" | "INCOME";
    limit?: number;
    offset?: number;
  }
): Promise<{
  mappings: VendorMappingWithRelations[];
  total: number;
}> {
  const where = {
    companyId,
    ...(options?.transactionType && { transactionType: options.transactionType }),
    ...(options?.search && {
      OR: [
        { vendorName: { contains: options.search, mode: "insensitive" as const } },
        { vendorTaxId: { contains: options.search } },
        { contact: { name: { contains: options.search, mode: "insensitive" as const } } },
      ],
    }),
  };
  
  const [mappings, total] = await Promise.all([
    prisma.vendorMapping.findMany({
      where,
      include: {
        contact: true,
        category: true,
      },
      orderBy: [
        { useCount: "desc" },
        { lastUsedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.vendorMapping.count({ where }),
  ]);
  
  return { mappings, total };
}

/**
 * Delete a vendor mapping
 */
export async function deleteVendorMapping(
  mappingId: string,
  companyId: string
): Promise<boolean> {
  const result = await prisma.vendorMapping.deleteMany({
    where: {
      id: mappingId,
      companyId, // Ensure company access
    },
  });
  
  return result.count > 0;
}

/**
 * Update a vendor mapping
 */
export async function updateVendorMapping(
  mappingId: string,
  companyId: string,
  data: Partial<{
    vendorName: string;
    vendorTaxId: string;
    namePattern: string;
    contactId: string;
    categoryId: string;
    defaultVatRate: number;
    paymentMethod: PaymentMethod;
    descriptionTemplate: string;
  }>
): Promise<VendorMapping | null> {
  // Verify ownership
  const existing = await prisma.vendorMapping.findFirst({
    where: { id: mappingId, companyId },
  });
  
  if (!existing) {
    return null;
  }
  
  return prisma.vendorMapping.update({
    where: { id: mappingId },
    data,
  });
}

// =============================================================================
// AI Category Suggestion Functions
// =============================================================================

interface CategoryForAI {
  id: string;
  name: string;
  parentName: string | null;
  type: "EXPENSE" | "INCOME";
}

/**
 * AI-based category suggestion from document content or description
 * Uses Gemini to analyze content and suggest the best matching category
 */
export async function suggestCategoryFromContent(
  companyId: string,
  transactionType: "EXPENSE" | "INCOME",
  content: {
    vendorName?: string | null;
    description?: string | null;
    items?: string[];
    imageUrls?: string[];
  }
): Promise<{
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  reason: string;
}> {
  try {
    // Get all categories for this company and type
    const categories = await prisma.category.findMany({
      where: {
        companyId,
        type: transactionType,
        isActive: true,
        parentId: { not: null }, // Only sub-categories (not groups)
      },
      include: {
        parent: true,
      },
      orderBy: { order: "asc" },
    });

    if (categories.length === 0) {
      return { categoryId: null, categoryName: null, confidence: 0, reason: "ไม่มีหมวดหมู่" };
    }

    // Build category list for AI
    const categoryList: CategoryForAI[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      parentName: c.parent?.name || null,
      type: c.type,
    }));

    const categoryListText = categoryList
      .map((c, i) => `${i + 1}. ${c.parentName ? `[${c.parentName}] ` : ""}${c.name} (ID: ${c.id})`)
      .join("\n");

    // Build content description
    let contentDescription = "";
    if (content.vendorName) {
      contentDescription += `ร้านค้า/บริษัท: ${content.vendorName}\n`;
    }
    if (content.description) {
      contentDescription += `รายละเอียด: ${content.description}\n`;
    }
    if (content.items && content.items.length > 0) {
      contentDescription += `รายการสินค้า/บริการ: ${content.items.join(", ")}\n`;
    }

    if (!contentDescription.trim()) {
      return { categoryId: null, categoryName: null, confidence: 0, reason: "ไม่มีข้อมูลเนื้อหา" };
    }

    const prompt = `คุณเป็น AI ผู้เชี่ยวชาญด้านบัญชีไทย ช่วยแนะนำหมวดหมู่ที่เหมาะสมที่สุดสำหรับธุรกรรมนี้

ประเภทธุรกรรม: ${transactionType === "EXPENSE" ? "รายจ่าย" : "รายรับ"}

ข้อมูลธุรกรรม:
${contentDescription}

หมวดหมู่ที่มี:
${categoryListText}

กรุณาเลือกหมวดหมู่ที่เหมาะสมที่สุด ตอบเป็น JSON:
{
  "categoryId": "ID ของหมวดหมู่ที่เลือก หรือ null ถ้าไม่แน่ใจ",
  "categoryName": "ชื่อหมวดหมู่ที่เลือก หรือ null",
  "confidence": 0-100,
  "reason": "เหตุผลสั้นๆ ที่เลือกหมวดหมู่นี้"
}

ถ้าไม่แน่ใจ ให้ตั้ง confidence ต่ำ (< 50) และอธิบายเหตุผล`;

    // If we have images, use image analysis
    let response;
    if (content.imageUrls && content.imageUrls.length > 0) {
      response = await analyzeImage(content.imageUrls[0], prompt, {
        temperature: 0.3,
        maxTokens: 512,
      });
    } else {
      // Text-only analysis using Gemini
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      response = { data: result.response.text(), error: null };
    }

    if (response.error) {
      console.error("AI category suggestion error:", response.error);
      return { categoryId: null, categoryName: null, confidence: 0, reason: "AI error" };
    }

    // Parse response
    let jsonText = response.data.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }

    try {
      const result = JSON.parse(jsonText);
      
      // Validate categoryId exists
      const matchedCategory = categoryList.find((c) => c.id === result.categoryId);
      
      return {
        categoryId: matchedCategory ? result.categoryId : null,
        categoryName: matchedCategory ? matchedCategory.name : null,
        confidence: Math.max(0, Math.min(100, result.confidence || 0)),
        reason: result.reason || "",
      };
    } catch {
      console.error("Failed to parse AI category response:", jsonText);
      return { categoryId: null, categoryName: null, confidence: 0, reason: "Parse error" };
    }
  } catch (error) {
    console.error("Category suggestion error:", error);
    return { categoryId: null, categoryName: null, confidence: 0, reason: "Error" };
  }
}

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
  companyName?: string
): Promise<MultiDocAnalysisResult | { error: string }> {
  if (imageUrls.length === 0) {
    return { error: "ไม่มีไฟล์ให้วิเคราะห์" };
  }

  // Step 1: Classify all images with AI first (parallel)
  console.log(`Classifying ${imageUrls.length} documents with AI...`);
  const classificationPromises = imageUrls.map(async (url) => {
    const classification = await classifyDocumentWithAI(url);
    return { url, classification };
  });
  const classifications = await Promise.all(classificationPromises);

  // Step 2: Run OCR on documents (especially invoices) in parallel
  console.log(`Running OCR on documents...`);
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
      console.log(`AI classified ${url.substring(url.length - 30)}: ${docType.type} (${docType.confidence}%) - ${aiClassification.reason}`);
    } else {
      docType = classifyDocumentType(result);
      console.log(`Keyword classified ${url.substring(url.length - 30)}: ${docType.type} (${docType.confidence}%)`);
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
      vendorName: combined.vendorName,
      vendorTaxId: combined.vendorTaxId,
      vendorAddress: null,
      vendorPhone: null,
      amount: combined.amount || combined.totalAmount || null,
      vatRate: combined.vatRate,
      vatAmount: combined.vatAmount || null,
      totalAmount: combined.totalAmount || null,
      invoiceNumber: combined.invoiceNumbers[0] || null,
      date: combined.date,
      paymentMethod: combined.paymentMethod,
      items: [],
      confidence: { overall: 80, amount: 80, vendor: 80, date: 70 },
    };

    const matchResult = await findBestMatchByType(
      pseudoData,
      companyId,
      transactionType
    );

    const suggested = buildSuggestedValues(pseudoData, matchResult.mapping);

    // If no mapping found, use AI to suggest category from content
    let aiCategorySuggestion: {
      categoryId: string | null;
      categoryName: string | null;
      confidence: number;
      reason: string;
    } | null = null;

    if (!matchResult.mapping) {
      // Extract items from OCR for better category suggestion
      const items = extractedDataList.flatMap((d) => 
        (d.items || []).map((item) => typeof item === "string" ? item : item.description || "")
      ).filter(Boolean);

      aiCategorySuggestion = await suggestCategoryFromContent(
        companyId,
        transactionType,
        {
          vendorName: combined.vendorName,
          description: combined.vendorName ? `ค่าใช้จ่ายจาก ${combined.vendorName}` : null,
          items: items.length > 0 ? items : undefined,
          imageUrls: imageUrls.slice(0, 1), // Use first image for context
        }
      );

      // NOTE: Do NOT auto-apply AI category suggestion to suggested.categoryId
      // User must explicitly click "ใช้หมวดหมู่นี้" button to apply
      // Only vendor mappings should auto-apply categoryId
    }

    smartResult = {
      mapping: matchResult.mapping
        ? {
            id: matchResult.mapping.id,
            vendorName: matchResult.mapping.vendorName,
            contactId: matchResult.mapping.contactId,
            contactName: matchResult.mapping.contact?.name || null,
            categoryId: matchResult.mapping.categoryId,
            categoryName: matchResult.mapping.category?.name || null,
            defaultVatRate: matchResult.mapping.defaultVatRate,
            paymentMethod: matchResult.mapping.paymentMethod,
            descriptionTemplate: matchResult.mapping.descriptionTemplate,
          }
        : null,
      matchConfidence: matchResult.confidence,
      matchReason: matchResult.reason,
      suggested,
      isNewVendor: !matchResult.mapping,
      suggestTraining:
        !matchResult.mapping &&
        (combined.vendorName !== null || combined.vendorTaxId !== null),
      // Include AI category suggestion for UI to show confidence
      aiCategorySuggestion: aiCategorySuggestion || undefined,
    };
  }

  return {
    files: fileResults,
    detectedTransactionType: txTypeDetection.type,
    transactionTypeConfidence: txTypeDetection.confidence,
    transactionTypeReason: txTypeDetection.reason,
    combined,
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
      totalAmount: 0,
      vatAmount: 0,
      date: null,
      invoiceNumbers: [],
      vatRate: null,
      paymentMethod: null,
      amount: null,
    };
  }

  // Find the most confident vendor info
  let vendorName: string | null = null;
  let vendorTaxId: string | null = null;
  let bestVendorConfidence = 0;

  // Sum up amounts
  let totalAmount = 0;
  let vatAmount = 0;
  let amount = 0;

  // Collect invoice numbers
  const invoiceNumbers: string[] = [];

  // Use earliest date
  let earliestDate: string | null = null;

  // Track VAT rate and payment method (use from first document with valid value)
  let vatRate: number | null = null;
  let paymentMethod: string | null = null;

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

    // VAT rate (use first found)
    if (vatRate === null && result.vatRate !== null && result.vatRate !== undefined) {
      vatRate = result.vatRate;
    }

    // Payment method (use first found)
    if (!paymentMethod && result.paymentMethod) {
      paymentMethod = result.paymentMethod;
    }
  }

  return {
    vendorName,
    vendorTaxId,
    totalAmount,
    vatAmount,
    date: earliestDate,
    invoiceNumbers,
    vatRate,
    paymentMethod,
    amount: amount || null,
  };
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
      category: true,
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

  // Only return match if confidence is >= 50% (lowered for better learning)
  if (bestScore >= 50 && bestMatch) {
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
    vendorName: null,
    vendorTaxId: null,
    vendorAddress: null,
    vendorPhone: null,
    amount: null,
    vatRate: null,
    vatAmount: null,
    totalAmount: null,
    invoiceNumber: null,
    date: null,
    paymentMethod: null,
    items: [],
    confidence: { overall: 0, amount: 0, vendor: 0, date: 0 },
  };
}
