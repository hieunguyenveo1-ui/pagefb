import type { AiGenerateInput } from "@/lib/validation";

type GenerateContentInput = AiGenerateInput & {
  providerName: string;
  templateName: string;
  tone: string;
};

export type GeneratedContent = {
  caption: string;
  hashtags: string[];
  variants: string[];
};

export function maskSecret(value: string) {
  if (!value) {
    return null;
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export async function generateCampaignContent(input: GenerateContentInput): Promise<GeneratedContent> {
  if (process.env.AI_MODE === "live") {
    return generateMockCampaignContent(input);
  }

  return generateMockCampaignContent(input);
}

export function generateMockCampaignContent(input: GenerateContentInput): GeneratedContent {
  const offer = input.offer ? ` Ưu đãi nổi bật: ${input.offer}.` : "";
  const caption = [
    `${input.topic} đang là cơ hội để ${input.audience} tăng trưởng bền vững hơn.`,
    `Đội ngũ của bạn có thể bắt đầu ngay hôm nay với một quy trình rõ ràng, nội dung nhất quán và trải nghiệm khách hàng chuyên nghiệp.${offer}`,
    "Nhắn tin cho fanpage để được tư vấn lộ trình phù hợp.",
  ].join("\n\n");

  return {
    caption,
    hashtags: ["#FanpageGrowth", "#SocialCommerce", "#ChamSocKhachHang", "#NoiDungHieuQua"],
    variants: [
      `${input.topic}: giải pháp thực tế cho ${input.audience}. Bắt đầu với nội dung rõ thông điệp, lịch đăng ổn định và phản hồi khách hàng nhanh hơn.`,
      `Nếu ${input.audience} đang cần tăng hiệu quả fanpage, hãy thử chiến dịch ${input.topic} với thông điệp nhất quán và CTA dễ hành động.`,
      `Tối ưu ${input.topic} không chỉ là đăng nhiều hơn, mà là đăng đúng nội dung, đúng thời điểm và chăm sóc khách hàng sau tương tác.`,
    ],
  };
}

export function suggestInboxReply(customerName: string, body: string) {
  const normalized = body.toLowerCase();

  if (normalized.includes("giá") || normalized.includes("bao nhiêu")) {
    return `Chào ${customerName}, cảm ơn anh/chị đã quan tâm. Bên em có thể tư vấn gói phù hợp theo nhu cầu fanpage hiện tại. Anh/chị cho em xin ngành hàng và số lượng fanpage đang vận hành được không ạ?`;
  }

  if (normalized.includes("demo") || normalized.includes("dùng thử")) {
    return `Chào ${customerName}, bên em có thể hỗ trợ demo quy trình quản lý fanpage, lập lịch đăng bài và inbox chăm sóc khách hàng. Anh/chị muốn demo theo mô hình shop, agency hay đào tạo ạ?`;
  }

  return `Chào ${customerName}, cảm ơn anh/chị đã nhắn tin. Em đã ghi nhận thông tin và sẽ tư vấn phương án phù hợp nhất. Anh/chị cho em biết thêm mục tiêu chính của fanpage hiện tại được không ạ?`;
}
