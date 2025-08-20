import * as z from 'zod';

export const requestFormSchema = z.object({
  name: z.string().min(2, { message: 'Please enter your name' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  subject: z
    .string()
    .min(5, { message: 'Subject must be at least 5 characters' }),
  message: z
    .string()
    .min(10, { message: 'Message must be at least 10 characters' }),
});

export type RequestFormData = z.infer<typeof requestFormSchema>;
