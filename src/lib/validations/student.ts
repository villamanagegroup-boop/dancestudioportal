import { z } from 'zod'

export const studentSchema = z.object({
  guardian_id: z.string().min(1, 'Family is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().optional(),
  medical_notes: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
})

export type StudentFormData = z.infer<typeof studentSchema>
