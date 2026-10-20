import { z } from "zod";

/** Spec E01: PASSWORD_MIN_LENGTH = 12, PASSWORD_MAX_BYTES = 72 (bcrypt liczy bajty UTF-8). */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72;

const email = z.email({ error: "Podaj poprawny adres e-mail" });

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Podaj adres e-mail"),
  password: z.string().min(1, "Podaj hasło"),
});

// DISPLAY_NAME_MAX_LENGTH nie ma wartości w spec E01 — prototyp nie sprawdza długości nazwy (pytanie do spec).
export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Podaj wyświetlaną nazwę"),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków`)
    .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, "Hasło jest za długie"),
});

export const invitationSchema = z.object({ email });
