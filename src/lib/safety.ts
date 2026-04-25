import type { PostInput } from "@/lib/validation";

type SafetyContext = {
  hourlyPostLimit: number;
  dailyPostLimit: number;
  existingHourlyPosts: number;
  existingDailyPosts: number;
  similarMessages: string[];
};

export type SafetyResult = {
  score: number;
  warnings: string[];
};

export function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateSimilarity(left: string, right: string) {
  const leftWords = new Set(normalizeMessage(left).split(" ").filter(Boolean));
  const rightWords = new Set(normalizeMessage(right).split(" ").filter(Boolean));

  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  const sharedWords = [...leftWords].filter((word) => rightWords.has(word));
  const totalWords = new Set([...leftWords, ...rightWords]);

  return sharedWords.length / totalWords.size;
}

export function assessPostSafety(input: PostInput, context: SafetyContext): SafetyResult {
  const warnings: string[] = [];
  let score = 0;

  if (input.pageIds.length > 5) {
    score += 25;
    warnings.push("Đang chọn hơn 5 fanpage cho cùng một bài; nên chia lịch đăng và tùy biến nội dung.");
  }

  if (context.existingHourlyPosts + input.pageIds.length > context.hourlyPostLimit) {
    score += 30;
    warnings.push("Vượt giới hạn đăng bài theo giờ của workspace.");
  }

  if (context.existingDailyPosts + input.pageIds.length > context.dailyPostLimit) {
    score += 30;
    warnings.push("Vượt giới hạn đăng bài theo ngày của workspace.");
  }

  const similarMessage = context.similarMessages.find(
    (message) => calculateSimilarity(input.message, message) >= 0.82,
  );

  if (similarMessage) {
    score += 25;
    warnings.push("Nội dung quá giống một bài đã lên lịch gần đây.");
  }

  if (/free|miễn phí|100%|cam kết|bảo đảm/i.test(input.message)) {
    score += 10;
    warnings.push("Nội dung chứa từ khóa marketing mạnh; nên kiểm duyệt thủ công trước khi đăng.");
  }

  return {
    score: Math.min(score, 100),
    warnings,
  };
}
