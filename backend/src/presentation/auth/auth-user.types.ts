/** Contexto do usuário após validação do JWT (Supabase Auth). */
export type AuthUserContext = {
  userId: string;
  email: string | null;
  role: string | null;
};
