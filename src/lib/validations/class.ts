import { z } from 'zod'

export const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  season_id: z.string().min(1, 'Season is required'),
  class_type_id: z.string().min(1, 'Class type is required'),
  instructor_id: z.string().optional(),
  room_id: z.string().optional(),
  day_of_week: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  max_students: z.coerce.number().min(1).max(100),
  monthly_tuition: z.coerce.number().min(0),
  registration_fee: z.coerce.number().min(0).optional(),
})

export type ClassFormData = z.infer<typeof classSchema>
