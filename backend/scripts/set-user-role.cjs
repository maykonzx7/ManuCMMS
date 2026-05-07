'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const crypto = require('crypto');

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const targetRole = process.argv[3]?.trim().toUpperCase();

  if (!email || !targetRole) {
    throw new Error('Uso: node scripts/set-user-role.cjs <email> <cargo>');
  }

  const allowed = new Set(['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN']);
  if (!allowed.has(targetRole)) {
    throw new Error('Cargo inválido. Use: TECNICO|SUPERVISOR|GESTOR|AUDITOR|ADMIN');
  }

  const envRaw = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const env = {};
  for (const line of envRaw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }

  const connectionString = env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL ausente em backend/.env');

  const c = new Client({ connectionString });
  await c.connect();
  await c.query('BEGIN');

  const usuario = (
    await c.query(
      'select id,id_unidade,perfil from usuario where lower(email)=lower($1) limit 1',
      [email],
    )
  ).rows[0];

  if (!usuario) {
    throw new Error(`Usuário não encontrado para email ${email}`);
  }

  await c.query("update usuario set perfil=$1,status='ATIVO',updated_at=now() where id=$2", [
    targetRole,
    usuario.id,
  ]);

  const unidade = (
    await c.query('select id,empresa_id from unidade_fabril where id=$1 limit 1', [usuario.id_unidade])
  ).rows[0];

  if (!unidade?.empresa_id) {
    throw new Error('Unidade/empresa do usuário não encontrada.');
  }

  let ue = (
    await c.query('select id from usuario_empresa where usuario_id=$1 and empresa_id=$2 limit 1', [
      usuario.id,
      unidade.empresa_id,
    ])
  ).rows[0];

  if (!ue) {
    ue = { id: crypto.randomUUID() };
    await c.query(
      "insert into usuario_empresa (id,usuario_id,empresa_id,status,is_responsavel_principal,created_at,updated_at) values ($1,$2,$3,'ATIVO',false,now(),now())",
      [ue.id, usuario.id, unidade.empresa_id],
    );
  }

  const hierarchy = { TECNICO: 10, SUPERVISOR: 20, GESTOR: 30, AUDITOR: 40, ADMIN: 50 };

  let cargo = (
    await c.query('select id from cargo where empresa_id=$1 and codigo=$2 limit 1', [
      unidade.empresa_id,
      targetRole,
    ])
  ).rows[0];

  if (!cargo) {
    cargo = { id: crypto.randomUUID() };
    await c.query(
      'insert into cargo (id,empresa_id,codigo,nome,nivel_hierarquico,is_sistema,created_at,updated_at) values ($1,$2,$3,$4,$5,true,now(),now())',
      [cargo.id, unidade.empresa_id, targetRole, targetRole.charAt(0) + targetRole.slice(1).toLowerCase(), hierarchy[targetRole]],
    );
  }

  const permissionSets = {
    TECNICO: ['unidade.visualizar', 'ativo.visualizar', 'os.visualizar_unidade', 'os.executar', 'os.fechar'],
    SUPERVISOR: ['unidade.visualizar', 'usuario.visualizar_unidade', 'ativo.visualizar', 'ativo.criar', 'os.visualizar_unidade', 'os.criar', 'os.executar', 'os.cancelar', 'os.fechar'],
    GESTOR: ['unidade.visualizar', 'usuario.visualizar_unidade', 'ativo.visualizar', 'ativo.criar', 'os.visualizar_unidade', 'os.criar', 'os.executar', 'os.cancelar', 'os.fechar'],
    AUDITOR: ['unidade.visualizar', 'usuario.visualizar_unidade', 'ativo.visualizar', 'os.visualizar_unidade'],
    ADMIN: ['empresa.gerenciar', 'unidade.visualizar', 'usuario.visualizar_unidade', 'usuario.convidar', 'ativo.visualizar', 'ativo.criar', 'os.visualizar_unidade', 'os.criar', 'os.executar', 'os.cancelar', 'os.fechar'],
  };

  for (const codigo of permissionSets[targetRole]) {
    let permissao = (await c.query('select id from permissao where codigo=$1 limit 1', [codigo])).rows[0];
    if (!permissao) {
      permissao = { id: crypto.randomUUID() };
      await c.query(
        'insert into permissao (id,codigo,nome,descricao,modulo,created_at) values ($1,$2,$3,$4,$5,now())',
        [permissao.id, codigo, codigo, codigo, codigo.split('.')[0]],
      );
    }

    await c.query(
      'insert into cargo_permissao (cargo_id,permissao_id,created_at) values ($1,$2,now()) on conflict (cargo_id,permissao_id) do nothing',
      [cargo.id, permissao.id],
    );
  }

  const existingUserCargo = (
    await c.query(
      'select id from usuario_cargo where usuario_empresa_id=$1 and cargo_id=$2 and id_unidade=$3 limit 1',
      [ue.id, cargo.id, usuario.id_unidade],
    )
  ).rows[0];

  if (!existingUserCargo) {
    await c.query(
      'insert into usuario_cargo (id,usuario_empresa_id,cargo_id,id_unidade,created_at,updated_at) values ($1,$2,$3,$4,now(),now())',
      [crypto.randomUUID(), ue.id, cargo.id, usuario.id_unidade],
    );
  }

  await c.query('COMMIT');
  await c.end();

  console.log(
    JSON.stringify(
      {
        email,
        usuarioId: usuario.id,
        perfilAnterior: usuario.perfil,
        perfilAtual: targetRole,
        empresaId: unidade.empresa_id,
        unidadeId: usuario.id_unidade,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
