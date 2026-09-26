import { z } from "zod";

export const parsedNoticeSchema = z.object({
  trainNumber: z.string().regex(/^\d+$/),
  station: z.string().min(1),
  expectedTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  reason: z.string().optional(),
});

export type ParsedNotice = z.infer<typeof parsedNoticeSchema>;
