-- Script de criação das tabelas do sistema CCPS Equinos - Seleon
-- Cole este script inteiro no SQL Editor do Supabase e clique em "Run".

create extension if not exists pgcrypto;

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  login text not null unique,
  senha text not null,
  perfil text not null default 'operador',
  created_at timestamptz default now()
);

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text,
  categoria text not null,
  unidade text not null,
  estoque_inicial numeric not null default 0,
  estoque_minimo numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists animais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  registro text,
  funcao text,
  observacao text,
  created_at timestamptz default now()
);

create table if not exists entradas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos(id) on delete set null,
  quantidade numeric not null,
  valor_unitario numeric default 0,
  responsavel text,
  data date not null,
  created_at timestamptz default now()
);

create table if not exists clinica (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  animal_id uuid references animais(id) on delete set null,
  tipo_tratamento text,
  medicamento_id uuid references produtos(id) on delete set null,
  quantidade_ml numeric not null,
  observacao text,
  responsavel text,
  created_at timestamptz default now()
);

create table if not exists trato (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  hora time,
  animal_id uuid references animais(id) on delete set null,
  produto_id uuid references produtos(id) on delete set null,
  quantidade numeric default 0,
  pessoa text,
  observacao text,
  created_at timestamptz default now()
);

create table if not exists coleta (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  animal_id uuid references animais(id) on delete set null,
  doses numeric default 0,
  manequim_id uuid references animais(id) on delete set null,
  coletador text,
  observacao text,
  created_at timestamptz default now()
);

create table if not exists observacoes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  animal_id uuid references animais(id) on delete set null,
  texto text,
  responsavel text,
  created_at timestamptz default now()
);

-- Habilita Row Level Security em todas as tabelas
alter table usuarios enable row level security;
alter table produtos enable row level security;
alter table animais enable row level security;
alter table entradas enable row level security;
alter table clinica enable row level security;
alter table trato enable row level security;
alter table coleta enable row level security;
alter table observacoes enable row level security;

-- Políticas simples: qualquer pessoa com a chave publishable pode ler/gravar
-- (controle de quem pode cadastrar/editar é feito pelo login dentro do app)
create policy "allow all" on usuarios for all using (true) with check (true);
create policy "allow all" on produtos for all using (true) with check (true);
create policy "allow all" on animais for all using (true) with check (true);
create policy "allow all" on entradas for all using (true) with check (true);
create policy "allow all" on clinica for all using (true) with check (true);
create policy "allow all" on trato for all using (true) with check (true);
create policy "allow all" on coleta for all using (true) with check (true);
create policy "allow all" on observacoes for all using (true) with check (true);

-- Usuários padrão (troque as senhas depois de acessar o sistema!)
insert into usuarios (nome, login, senha, perfil) values
  ('Administrador', 'admin', 'admin123', 'admin'),
  ('Operador', 'operador', 'operador123', 'operador')
on conflict (login) do nothing;
