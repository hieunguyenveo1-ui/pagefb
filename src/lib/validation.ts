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
