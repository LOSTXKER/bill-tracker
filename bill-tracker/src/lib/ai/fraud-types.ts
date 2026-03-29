export interface FraudFlag {
  type: "DUPLICATE" | "FAKE_RECEIPT" | "PERSONAL_EXPENSE" | "SUSPICIOUS_AMOUNT";
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  confidence: number; // 0-100
}

export interface FraudAnalysisResult {
  overallScore: number; // 0-100 (0=clean, 100=fraud)
  flags: FraudFlag[];
  recommendation: "APPROVE" | "REVIEW" | "REJECT";
  analyzedAt: Date;
}
