/** Contexto do usuário após validação do JWT (Supabase Auth). */
export type AuthUserContext = {
  userId: string;
  email: string | null;
  role: string | null;
  emailConfirmedAt: string | null;
  appMetadata: Record<string, unknown> | null;
  userMetadata: Record<string, unknown> | null;
};
