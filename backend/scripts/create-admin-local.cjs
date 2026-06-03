'use strict';

const crypto = require('crypto');
const { Client } = require('pg');
require('./ensure-database-url.cjs');
require('./load-env-file.cjs').loadEnvFile();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@manucmms.local')
  .trim()
  .toLowerCase();
const ADMIN_NOME = (process.env.ADMIN_NOME ?? 'Administrador').trim();
const ADMIN_AUTH_SUB = (process.env.ADMIN_AUTH_SUB ?? '').trim();
const EMPRESA_NOME = (process.env.ADMIN_EMPRESA_NOME ?? 'ManuCMMS Demo').trim();
const EMPRESA_SLUG = (process.env.ADMIN_EMPRESA_SLUG ?? 'demo').trim().toLowerCase();

const PERMISSOES = [
  'empresa.gerenciar',
  'unidade.visualizar',
  'usuario.visualizar_unidade',
  'usuario.convidar',
  'ativo.visualizar',
  'ativo.criar',
  'ativo.editar',
  'ativo.excluir',
  'os.visualizar_unidade',
  'os.criar',
  'os.executar',
  'os.cancelar',
  'os.fechar',
  'dashboard.executivo',
];

async function resolveAuthSub(client) {
  if (ADMIN_AUTH_SUB) return ADMIN_AUTH_SUB;

  const authRow = await client.query(
    'select id::text from auth.users where lower(email) = $1 limit 1',
    [ADMIN_EMAIL],
  );
  const fromAuth = authRow.rows[0]?.id?.trim();
  if (fromAuth) return fromAuth;

  throw new Error(
    `Usuario Supabase nao encontrado para ${ADMIN_EMAIL}. ` +
      'Faca login/cadastro no Supabase Auth ou defina ADMIN_AUTH_SUB com o UUID (Authentication → Users).',
  );
}

(async () => {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL ausente (backend/.env ou variavel de ambiente).');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    const authSub = await resolveAuthSub(client);

    let empresa = (
      await client.query(
        'select id, nome_empresa, slug from empresa where lower(slug) = $1 limit 1',
        [EMPRESA_SLUG],
      )
    ).rows[0];
    if (!empresa) {
      empresa = (
        await client.query(
          'select id, nome_empresa, slug from empresa order by created_at asc nulls last limit 1',
        )
      ).rows[0];
    }
    if (!empresa) {
      const id = crypto.randomUUID();
      await client.query(
        "insert into empresa (id,nome_empresa,slug,status,created_at,updated_at) values ($1,$2,$3,'ATIVA',now(),now())",
        [id, EMPRESA_NOME, EMPRESA_SLUG],
      );
      empresa = { id, nome_empresa: EMPRESA_NOME, slug: EMPRESA_SLUG };
    }

    let unidade = (
      await client.query(
        'select id, nome from unidade_fabril where empresa_id=$1 order by created_at asc nulls last limit 1',
        [empresa.id],
      )
    ).rows[0];
    if (!unidade) {
      const id = crypto.randomUUID();
      await client.query(
        "insert into unidade_fabril (id,empresa_id,nome,localizacao,status,created_at,updated_at) values ($1,$2,$3,$4,'ATIVA',now(),now())",
        [id, empresa.id, 'Matriz', 'Producao / homologacao'],
      );
      unidade = { id, nome: 'Matriz' };
    }

    let usuario = (
      await client.query('select id, email from usuario where auth_sub=$1 limit 1', [
        authSub,
      ])
    ).rows[0];
    if (!usuario) {
      usuario = (
        await client.query('select id, email from usuario where lower(email)=$1 limit 1', [
          ADMIN_EMAIL,
        ])
      ).rows[0];
    }
    if (!usuario) {
      const id = crypto.randomUUID();
      await client.query(
        "insert into usuario (id,auth_sub,id_unidade,nome,email,perfil,status,created_at,updated_at) values ($1,$2,$3,$4,$5,'ADMIN','ATIVO',now(),now())",
        [id, authSub, unidade.id, ADMIN_NOME, ADMIN_EMAIL],
      );
      usuario = { id, email: ADMIN_EMAIL };
    } else {
      await client.query(
        "update usuario set auth_sub=$1,id_unidade=$2,nome=$3,email=$4,perfil='ADMIN',status='ATIVO',updated_at=now() where id=$5",
        [authSub, unidade.id, ADMIN_NOME, ADMIN_EMAIL, usuario.id],
      );
    }

    let ue = (
      await client.query(
        'select id from usuario_empresa where usuario_id=$1 and empresa_id=$2 limit 1',
        [usuario.id, empresa.id],
      )
    ).rows[0];
    if (!ue) {
      ue = { id: crypto.randomUUID() };
      await client.query(
        "insert into usuario_empresa (id,usuario_id,empresa_id,status,is_responsavel_principal,created_at,updated_at) values ($1,$2,$3,'ATIVO',true,now(),now())",
        [ue.id, usuario.id, empresa.id],
      );
    }

    let cargo = (
      await client.query(
        "select id from cargo where empresa_id=$1 and codigo='ADMIN' limit 1",
        [empresa.id],
      )
    ).rows[0];
    if (!cargo) {
      cargo = { id: crypto.randomUUID() };
      await client.query(
        "insert into cargo (id,empresa_id,codigo,nome,nivel_hierarquico,is_sistema,created_at,updated_at) values ($1,$2,'ADMIN','Admin',50,true,now(),now())",
        [cargo.id, empresa.id],
      );
    }

    for (const codigo of PERMISSOES) {
      let permissao = (
        await client.query('select id from permissao where codigo=$1 limit 1', [codigo])
      ).rows[0];
      if (!permissao) {
        permissao = { id: crypto.randomUUID() };
        const modulo = codigo.split('.')[0];
        await client.query(
          'insert into permissao (id,codigo,nome,descricao,modulo,created_at) values ($1,$2,$3,$4,$5,now())',
          [permissao.id, codigo, codigo, codigo, modulo],
        );
      }

      await client.query(
        'insert into cargo_permissao (cargo_id,permissao_id,created_at) values ($1,$2,now()) on conflict (cargo_id,permissao_id) do nothing',
        [cargo.id, permissao.id],
      );
    }

    const existingUC = (
      await client.query(
        'select id from usuario_cargo where usuario_empresa_id=$1 and cargo_id=$2 and id_unidade=$3 limit 1',
        [ue.id, cargo.id, unidade.id],
      )
    ).rows[0];
    if (!existingUC) {
      await client.query(
        'insert into usuario_cargo (id,usuario_empresa_id,cargo_id,id_unidade,created_at,updated_at) values ($1,$2,$3,$4,now(),now())',
        [crypto.randomUUID(), ue.id, cargo.id, unidade.id],
      );
    }

    await client.query('COMMIT');
    console.log(
      JSON.stringify(
        {
          ok: true,
          email: ADMIN_EMAIL,
          authSub,
          empresa: { id: empresa.id, slug: empresa.slug, nome: empresa.nome_empresa },
          unidadeId: unidade.id,
          usuarioId: usuario.id,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
