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
    empresa: {
      id: string;
      nomeEmpresa: string;
      slug: string;
    } | null;
    cargos: Array<{
      id: string;
      codigo: string;
      nome: string;
      nivelHierarquico: number;
      idUnidade: string | null;
      permissoes: string[];
    }>;
    permissoes: string[];
  } | null;
};
