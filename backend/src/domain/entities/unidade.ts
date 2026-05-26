/** Item de listagem de unidades fabris (DEM). */
export type UnidadeListaItem = {
  id: string;
  nome: string;
  localizacao: string;
  cep?: string | null;
  endereco?: string | null;
  numeroEndereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  complemento?: string | null;
  referencia?: string | null;
  slaCorretivaHoras?: number | null;
  slaPreventivaHoras?: number | null;
  slaPreditivaHoras?: number | null;
  empresaId?: string | null;
  empresaSlug?: string | null;
};
