import { z } from "zod";

/**
 * Schema de login. Solo valida que email tenga formato y que la password
 * no esté vacía. La longitud mínima de password aplica al signup, no al
 * login: si alguien tipea "abc" como password, bcrypt.compare devuelve
 * false y el endpoint responde 401 ("Credenciales incorrectas") — UX
 * más coherente que 400 ("Datos inválidos") por el largo.
 */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;
