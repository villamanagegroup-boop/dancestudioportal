import { z } from 'zod'

export const enrollmentSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  class_id: z.string().min(1, 'Class is required'),
  season_id: z.string().min(1, 'Season is required'),
  payment_method_id: z.string().optional(),
  notes: z.string().optional(),
})

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>
