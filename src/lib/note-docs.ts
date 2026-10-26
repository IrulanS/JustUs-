import { z } from "zod";

export const noteDocIdSchema = z.object({ id: z.string().uuid() });
export const noteDocSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(100),
  content: z.string().max(5000).optional(),
});
