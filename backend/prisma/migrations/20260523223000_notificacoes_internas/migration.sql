CREATE TABLE notificacao (
  id uuid PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  empresa_id uuid NULL,
  id_unidade uuid NULL,
  ordem_servico_id uuid NULL,
  tipo varchar(24) NOT NULL,
  titulo varchar(180) NOT NULL,
  mensagem varchar(1000) NOT NULL,
  foto_url varchar(2048) NULL,
  link_path varchar(300) NULL,
  lida_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX notificacao_usuario_id_created_at_idx
  ON notificacao (usuario_id, created_at DESC);

CREATE INDEX notificacao_usuario_id_lida_em_idx
  ON notificacao (usuario_id, lida_em);

CREATE INDEX notificacao_ordem_servico_id_idx
  ON notificacao (ordem_servico_id);
