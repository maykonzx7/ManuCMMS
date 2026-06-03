import {
  mapNivelToPerfil,
  resolvePerfilFromCargo,
} from './convite-cargo.shared';

describe('convite-cargo.shared', () => {
  it('mapeia perfis padrao diretamente', () => {
    expect(resolvePerfilFromCargo('admin')).toBe('ADMIN');
    expect(resolvePerfilFromCargo('TECNICO')).toBe('TECNICO');
  });

  it('mapeia cargo customizado pelo nivel hierarquico', () => {
    expect(
      resolvePerfilFromCargo('TEC_GERAL', {
        codigo: 'TEC_GERAL',
        nome: 'Tecnico',
        nivelHierarquico: 15,
      }),
    ).toBe('TECNICO');
  });

  it('prefere perfil mais baixo em empate de distancia', () => {
    expect(mapNivelToPerfil(15)).toBe('TECNICO');
    expect(mapNivelToPerfil(25)).toBe('SUPERVISOR');
    expect(mapNivelToPerfil(50)).toBe('ADMIN');
  });
});
