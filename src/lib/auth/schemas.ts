import { z } from "zod";

const email = z.string().trim().pipe(z.email("Enter a valid email address."));

// Password minimum 8 on sign up (ADR 0026); sign in only needs something typed.
export const signUpSchema = z.object({
  email,
  password: z.string().min(8, "Use at least 8 characters."),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
