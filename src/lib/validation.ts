import { z } from "zod";

export const facebookAccountSchema = z.object({
  name: z.string().trim().min(2).max(120),
  facebookUserId: z.string().trim().min(2).max(80),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export const facebookPageSchema = z.object({
  accountId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(140),
  facebookPageId: z.string().trim().min(2).max(80),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  followersCount: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
});

export const postSchema = z.object({
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  linkUrl: z.string().trim().url().optional().or(z.literal("")),
  mediaUrl: z.string().trim().url().optional().or(z.literal("")),
  scheduledAt: z.string().datetime().optional().or(z.literal("")),
  pageIds: z.array(z.string().trim().min(1)).min(1),
  action: z.enum(["draft", "schedule", "publish"]),
});

export type PostInput = z.infer<typeof postSchema>;

export const aiProviderSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(["OPENAI", "GEMINI", "CLAUDE", "GROK", "VEO3", "CUSTOM"]),
  model: z.string().trim().min(2).max(120),
  apiKey: z.string().trim().max(240).optional().or(z.literal("")),
  baseUrl: z.string().trim().url().optional().or(z.literal("")),
  enabled: z.boolean().default(true),
});

export const promptTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  goal: z.string().trim().min(2).max(160),
  tone: z.string().trim().min(2).max(80),
  language: z.string().trim().min(2).max(20).default("vi"),
  prompt: z.string().trim().min(20).max(4000),
});

export const aiGenerateSchema = z.object({
  providerId: z.string().trim().min(1),
  templateId: z.string().trim().min(1),
  topic: z.string().trim().min(3).max(200),
  audience: z.string().trim().min(3).max(200),
  offer: z.string().trim().max(240).optional().or(z.literal("")),
  pageIds: z.array(z.string().trim().min(1)).default([]),
});

export const aiApproveSchema = z.object({
  generationId: z.string().trim().min(1),
  pageIds: z.array(z.string().trim().min(1)).min(1),
  scheduledAt: z.string().datetime().optional().or(z.literal("")),
  action: z.enum(["draft", "schedule"]).default("draft"),
  reviewNotes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const inboxWebhookSchema = z.object({
  pageId: z.string().trim().min(1),
  channel: z.enum(["MESSENGER", "COMMENT"]).default("MESSENGER"),
  customerExternalId: z.string().trim().min(1).max(120),
  customerName: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  externalMessageId: z.string().trim().max(160).optional().or(z.literal("")),
});

export const inboxSuggestSchema = z.object({
  conversationId: z.string().trim().min(1),
  providerId: z.string().trim().min(1).optional().or(z.literal("")),
});

export type AiGenerateInput = z.infer<typeof aiGenerateSchema>;
