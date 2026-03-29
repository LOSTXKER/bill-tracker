import type { FraudFlag } from "./fraud-types";

const PERSONAL_KEYWORDS = [
  // Entertainment
  "เกม", "game", "netflix", "spotify", "youtube premium",
  // Beauty
  "เครื่องสำอาง", "ครีม", "makeup", "skincare",
  // Luxury food
  "บุฟเฟ่ต์", "buffet", "โรงแรม", "สปา", "spa",
  // Personal items
  "เสื้อผ้า", "รองเท้า", "กระเป๋า", "นาฬิกา", "แว่นตา",
  // Alcohol
  "เหล้า", "เบียร์", "ไวน์", "wine", "beer", "alcohol",
];

export function checkPersonalExpenseKeywords(description: string): FraudFlag[] {
  const flags: FraudFlag[] = [];
  const descLower = description.toLowerCase();
  const foundKeywords = PERSONAL_KEYWORDS.filter((kw) =>
    descLower.includes(kw.toLowerCase())
  );

  if (foundKeywords.length > 0) {
    flags.push({
      type: "PERSONAL_EXPENSE",
      severity: "MEDIUM",
      description: `พบคำที่อาจเป็นค่าใช้จ่ายส่วนตัว: ${foundKeywords.join(", ")}`,
      confidence: 60 + foundKeywords.length * 10,
    });
  }

  return flags;
}

export function calculateOverallScore(flags: FraudFlag[]): number {
  if (flags.length === 0) return 0;

  const severityWeights = {
    HIGH: 40,
    MEDIUM: 20,
    LOW: 10,
  };

  let totalScore = 0;
  for (const flag of flags) {
    const baseScore = severityWeights[flag.severity];
    const adjustedScore = (baseScore * flag.confidence) / 100;
    totalScore += adjustedScore;
  }

  return Math.min(100, Math.round(totalScore));
}

export function getRecommendation(
  score: number
): "APPROVE" | "REVIEW" | "REJECT" {
  if (score >= 70) return "REJECT";
  if (score >= 30) return "REVIEW";
  return "APPROVE";
}
