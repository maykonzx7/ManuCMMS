'use strict';
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const crypto = require('crypto');

(async () => {
  const envPath = path.join(process.cwd(), '.env');
  const envRaw = fs.readFileSync(envPath, 'utf8');
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

  const email = 'admin@manucmms.local';
  const authSub = '00000000-0000-4000-8000-000000000001';

  let empresa = (await c.query('select id,nome_empresa,slug from empresa order by created_at asc nulls last limit 1')).rows[0];
  if (!empresa) {
    const id = crypto.randomUUID();
    await c.query("insert into empresa (id,nome_empresa,slug,status,created_at,updated_at) values ($1,$2,$3,'ATIVA',now(),now())", [id, 'Matriz', 'matriz']);
    empresa = { id, nome_empresa: 'Matriz', slug: 'matriz' };
  }

  let unidade = (await c.query('select id,nome from unidade_fabril where empresa_id=$1 order by created_at asc nulls last limit 1', [empresa.id])).rows[0];
  if (!unidade) {
    const id = crypto.randomUUID();
    await c.query("insert into unidade_fabril (id,empresa_id,nome,localizacao,status,created_at,updated_at) values ($1,$2,$3,$4,'ATIVA',now(),now())", [id, empresa.id, 'Matriz', 'Ambiente local']);
    unidade = { id, nome: 'Matriz' };
  }

  let usuario = (await c.query('select id,email from usuario where auth_sub=$1 limit 1', [authSub])).rows[0];
  if (!usuario) {
    usuario = (await c.query('select id,email from usuario where email=$1 limit 1', [email])).rows[0];
  }
  if (!usuario) {
    const id = crypto.randomUUID();
    await c.query("insert into usuario (id,auth_sub,id_unidade,nome,email,perfil,status,created_at,updated_at) values ($1,$2,$3,$4,$5,'ADMIN','ATIVO',now(),now())", [id, authSub, unidade.id, 'Administrador Local', email]);
    usuario = { id };
  } else {
    await c.query("update usuario set auth_sub=$1,id_unidade=$2,nome=$3,perfil='ADMIN',status='ATIVO',updated_at=now() where id=$4", [authSub, unidade.id, 'Administrador Local', usuario.id]);
  }

  let ue = (await c.query('select id from usuario_empresa where usuario_id=$1 and empresa_id=$2 limit 1', [usuario.id, empresa.id])).rows[0];
  if (!ue) {
    ue = { id: crypto.randomUUID() };
    await c.query("insert into usuario_empresa (id,usuario_id,empresa_id,status,is_responsavel_principal,created_at,updated_at) values ($1,$2,$3,'ATIVO',true,now(),now())", [ue.id, usuario.id, empresa.id]);
  }

  let cargo = (await c.query("select id from cargo where empresa_id=$1 and codigo='ADMIN' limit 1", [empresa.id])).rows[0];
  if (!cargo) {
    cargo = { id: crypto.randomUUID() };
    await c.query("insert into cargo (id,empresa_id,codigo,nome,nivel_hierarquico,is_sistema,created_at,updated_at) values ($1,$2,'ADMIN','Admin',50,true,now(),now())", [cargo.id, empresa.id]);
  }

  const perms = [
    'empresa.gerenciar',
    'unidade.visualizar',
    'usuario.visualizar_unidade',
    'usuario.convidar',
    'ativo.visualizar',
    'ativo.criar',
    'os.visualizar_unidade',
    'os.criar',
    'os.executar',
    'os.cancelar',
    'os.fechar',
  ];

  for (const codigo of perms) {
    let p = (await c.query('select id from permissao where codigo=$1 limit 1', [codigo])).rows[0];
    if (!p) {
      p = { id: crypto.randomUUID() };
      const modulo = codigo.split('.')[0];
      await c.query('insert into permissao (id,codigo,nome,descricao,modulo,created_at) values ($1,$2,$3,$4,$5,now())', [p.id, codigo, codigo, codigo, modulo]);
    }

    await c.query('insert into cargo_permissao (cargo_id,permissao_id,created_at) values ($1,$2,now()) on conflict (cargo_id,permissao_id) do nothing', [cargo.id, p.id]);
  }

  const existingUC = (await c.query('select id from usuario_cargo where usuario_empresa_id=$1 and cargo_id=$2 and id_unidade=$3 limit 1', [ue.id, cargo.id, unidade.id])).rows[0];
  if (!existingUC) {
    await c.query('insert into usuario_cargo (id,usuario_empresa_id,cargo_id,id_unidade,created_at,updated_at) values ($1,$2,$3,$4,now(),now())', [crypto.randomUUID(), ue.id, cargo.id, unidade.id]);
  }

  await c.query('COMMIT');
  console.log(JSON.stringify({ email, authSub, empresaId: empresa.id, unidadeId: unidade.id, usuarioId: usuario.id }, null, 2));
  await c.end();
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
