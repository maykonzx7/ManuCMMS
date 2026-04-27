export type BackendMe = {
  userId: string;
  email: string | null;
  role: string | null;
  usuario: {
    id: string;
    idUnidade: string;
    nome: string;
    email: string;
    perfil: string;
  } | null;
};
