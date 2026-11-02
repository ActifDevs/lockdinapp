import { z } from "zod";

export const subjectIdSchema = z.preprocess(
  (value) => (value === "" || value == null ? 0 : value),
  z.coerce
    .number({ invalid_type_error: "Select a valid subject" })
    .min(1, "Subject is required"),
);

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: subjectIdSchema,
  deadline: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  estimatedMinutes: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().min(1, "Must be at least 1 min").optional(),
  ),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

export const examDateFormSchema = z.object({
  subjectId: subjectIdSchema,
  paperCode: z.string().trim().min(1, "Paper code is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export type ExamDateFormValues = z.infer<typeof examDateFormSchema>;
