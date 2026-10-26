import { z } from "zod";

export const questionSchema = z.object({ content: z.string().trim().min(1).max(1000) });
export const questionIdSchema = z.object({ id: z.string().uuid() });

export function getDrawnQuestion<T extends { id: string }>(questions: T[], id: string | null | undefined): T | null {
  return questions.find(question => question.id === id) ?? null;
}