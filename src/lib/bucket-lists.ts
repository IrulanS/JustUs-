import { z } from "zod";

export const bucketIdSchema = z.object({ id: z.string().uuid() });
export const bucketListSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(100),
});
export const bucketItemSchema = z.object({
  id: z.string().uuid().optional(),
  list_id: z.string().uuid(),
  content: z.string().trim().min(1).max(280),
});
export const bucketCompletionSchema = bucketIdSchema.extend({ completed: z.boolean() });

export function sortBucketItems<T extends { completed: boolean; created_at: string; id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(a.completed) - Number(b.completed)
    || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}